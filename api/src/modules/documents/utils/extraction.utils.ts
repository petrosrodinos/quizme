import { DocumentFileType } from 'generated/prisma';
import { normalize } from '@/integrations/ai/local/nlp.utils';

/** One structural block of extracted text. */
export interface TextBlock {
    page: number | null;
    /** Heading level 1-6 when the block is a heading, else 0. */
    heading: number;
    text: string;
}

export interface ExtractedDocument {
    blocks: TextBlock[];
    pageCount: number | null;
}

/** Registry of supported formats (extend here to add new ones). */
export const SupportedFormats: Record<string, { type: DocumentFileType; mimes: string[] }> = {
    pdf: { type: DocumentFileType.PDF, mimes: ['application/pdf'] },
    docx: { type: DocumentFileType.DOCX, mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
    txt: { type: DocumentFileType.TXT, mimes: ['text/plain'] },
    text: { type: DocumentFileType.TXT, mimes: ['text/plain'] },
    md: { type: DocumentFileType.MARKDOWN, mimes: ['text/markdown', 'text/x-markdown', 'text/plain'] },
    markdown: { type: DocumentFileType.MARKDOWN, mimes: ['text/markdown', 'text/x-markdown', 'text/plain'] },
};

export const detectFileType = (filename: string): DocumentFileType | null => {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    return SupportedFormats[ext]?.type ?? null;
};

/** Magic-byte validation so a renamed binary can't masquerade as a document. */
export const validateSignature = (type: DocumentFileType, buf: Buffer): boolean => {
    if (type === DocumentFileType.PDF) return buf.subarray(0, 5).toString('latin1') === '%PDF-';
    if (type === DocumentFileType.DOCX) return buf[0] === 0x50 && buf[1] === 0x4b; // ZIP container
    // Text formats: reject if it looks binary (NUL bytes in the first 8 KB).
    return !buf.subarray(0, 8192).includes(0);
};

const HEADING_PATTERNS: Array<[RegExp, number]> = [
    [/^(chapter|part|unit|module)\s+[\divxlc]+\b[:.\s-]*.{0,80}$/i, 1],
    [/^\d+\.\s+[A-Z][^.!?]{2,80}$/, 1],
    [/^\d+\.\d+\.?\s+[A-Z][^.!?]{2,80}$/, 2],
    [/^\d+\.\d+\.\d+\.?\s+[A-Z][^.!?]{2,80}$/, 3],
    [/^(section|lecture|lesson|topic)\s+[\d.]+\b.{0,80}$/i, 2],
];

/** Heuristic heading detection for plain text / PDF lines. */
const headingLevel = (line: string): number => {
    const t = line.trim();
    if (t.length < 3 || t.length > 90 || /[.,;]$/.test(t)) return 0;
    for (const [re, level] of HEADING_PATTERNS) if (re.test(t)) return level;
    const letters = t.replace(/[^a-zA-Z]/g, '');
    if (letters.length >= 4 && letters === letters.toUpperCase() && t.split(/\s+/).length <= 10) return 2;
    return 0;
};

const blocksFromPlainText = (text: string, page: number | null): TextBlock[] => {
    const blocks: TextBlock[] = [];
    const paragraphs = normalize(text).split(/\n\s*\n/);
    for (const para of paragraphs) {
        const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
        let buffer: string[] = [];
        const flush = () => {
            if (buffer.length) blocks.push({ page, heading: 0, text: buffer.join(' ').replace(/-\s+(?=[a-z])/g, '') });
            buffer = [];
        };
        for (const line of lines) {
            const level = headingLevel(line);
            if (level) {
                flush();
                blocks.push({ page, heading: level, text: line });
            } else buffer.push(line);
        }
        flush();
    }
    return blocks;
};

const blocksFromMarkdown = (text: string): TextBlock[] => {
    const blocks: TextBlock[] = [];
    let buffer: string[] = [];
    let inCode = false;
    const flush = () => {
        const joined = buffer.join('\n').trim();
        if (joined) blocks.push({ page: null, heading: 0, text: joined });
        buffer = [];
    };
    for (const raw of normalize(text).split('\n')) {
        if (/^```/.test(raw.trim())) inCode = !inCode;
        const m = !inCode && /^(#{1,6})\s+(.+?)\s*#*$/.exec(raw);
        if (m) {
            flush();
            blocks.push({ page: null, heading: m[1].length, text: m[2] });
        } else if (!inCode && raw.trim() === '') flush();
        else buffer.push(raw);
    }
    flush();
    return blocks;
};

const blocksFromHtml = (html: string): TextBlock[] => {
    const blocks: TextBlock[] = [];
    const decode = (s: string) =>
        s
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
    const re = /<(h[1-6]|p|li|td|th|pre|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
        const tag = m[1].toLowerCase();
        const text = decode(m[2]);
        if (!text) continue;
        if (tag.startsWith('h')) blocks.push({ page: null, heading: Number(tag[1]), text });
        else blocks.push({ page: null, heading: 0, text: tag === 'li' ? `• ${text}` : text });
    }
    return blocks;
};

export const extractDocument = async (type: DocumentFileType, buf: Buffer): Promise<ExtractedDocument> => {
    switch (type) {
        case DocumentFileType.PDF: {
            const { extractText, getDocumentProxy } = await import('unpdf');
            const pdf = await getDocumentProxy(new Uint8Array(buf));
            const { totalPages, text } = await extractText(pdf, { mergePages: false });
            const blocks = (text as string[]).flatMap((pageText, i) => blocksFromPlainText(pageText, i + 1));
            return { blocks, pageCount: totalPages };
        }
        case DocumentFileType.DOCX: {
            const mammoth = await import('mammoth');
            const { value } = await mammoth.convertToHtml({ buffer: buf });
            return { blocks: blocksFromHtml(value), pageCount: null };
        }
        case DocumentFileType.MARKDOWN:
            return { blocks: blocksFromMarkdown(buf.toString('utf8')), pageCount: null };
        default:
            return { blocks: blocksFromPlainText(buf.toString('utf8'), null), pageCount: null };
    }
};
