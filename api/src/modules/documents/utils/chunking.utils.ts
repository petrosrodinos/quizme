import { estimateTokens, splitSentences } from '@/integrations/ai/local/nlp.utils';
import { TextBlock } from './extraction.utils';

export interface Chunk {
    index: number;
    content: string;
    sectionPath: string[];
    pageStart: number | null;
    pageEnd: number | null;
    tokens: number;
}

export interface OutlineNode {
    title: string;
    level: number;
    page: number | null;
    children: OutlineNode[];
}

const TARGET_TOKENS = 450;
const MAX_TOKENS = 700;
const OVERLAP_SENTENCES = 1;

/**
 * Structure-aware semantic chunking: chunks never cross a section boundary, paragraphs are kept
 * whole where possible, long paragraphs are split on sentence boundaries, and a one-sentence overlap
 * preserves context between neighbouring chunks. Each chunk carries its heading path and page range.
 */
export const chunkBlocks = (blocks: TextBlock[]): { chunks: Chunk[]; outline: OutlineNode[] } => {
    const chunks: Chunk[] = [];
    const outline: OutlineNode[] = [];
    const stack: OutlineNode[] = [];
    let path: string[] = [];
    let buf: { text: string; page: number | null }[] = [];
    let bufTokens = 0;

    const emit = () => {
        if (!buf.length) return;
        const content = buf.map((b) => b.text).join('\n\n').trim();
        if (content.length >= 40) {
            const pages = buf.map((b) => b.page).filter((p): p is number => p !== null);
            chunks.push({
                index: chunks.length,
                content: path.length ? `${path[path.length - 1]}\n\n${content}` : content,
                sectionPath: [...path],
                pageStart: pages.length ? Math.min(...pages) : null,
                pageEnd: pages.length ? Math.max(...pages) : null,
                tokens: estimateTokens(content),
            });
        }
        const tail = splitSentences(buf[buf.length - 1]?.text ?? '').slice(-OVERLAP_SENTENCES).join(' ');
        const lastPage = buf[buf.length - 1]?.page ?? null;
        buf = tail && content.length > 400 ? [{ text: tail, page: lastPage }] : [];
        bufTokens = estimateTokens(tail);
    };

    for (const block of blocks) {
        if (block.heading) {
            emit();
            buf = [];
            bufTokens = 0;
            const node: OutlineNode = { title: block.text.slice(0, 120), level: block.heading, page: block.page, children: [] };
            while (stack.length && stack[stack.length - 1].level >= block.heading) stack.pop();
            if (stack.length) stack[stack.length - 1].children.push(node);
            else outline.push(node);
            stack.push(node);
            path = stack.map((n) => n.title);
            continue;
        }
        const tokens = estimateTokens(block.text);
        if (tokens > MAX_TOKENS) {
            let piece: string[] = [];
            let pieceTokens = 0;
            for (const sentence of splitSentences(block.text)) {
                const st = estimateTokens(sentence);
                if (pieceTokens + st > TARGET_TOKENS && piece.length) {
                    if (bufTokens + pieceTokens > TARGET_TOKENS) emit();
                    buf.push({ text: piece.join(' '), page: block.page });
                    bufTokens += pieceTokens;
                    emit();
                    piece = [];
                    pieceTokens = 0;
                }
                piece.push(sentence);
                pieceTokens += st;
            }
            if (piece.length) {
                buf.push({ text: piece.join(' '), page: block.page });
                bufTokens += pieceTokens;
            }
            continue;
        }
        if (bufTokens + tokens > TARGET_TOKENS && bufTokens > 80) emit();
        buf.push({ text: block.text, page: block.page });
        bufTokens += tokens;
    }
    emit();
    return { chunks, outline };
};
