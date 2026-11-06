import { memo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

export interface CitationChip {
    index: number;
    label: string;
    onClick?: () => void;
}

interface MarkdownProps {
    content: string;
    className?: string;
    /** When provided, "[n]" tokens render as clickable superscript source chips. */
    citations?: CitationChip[];
}

const CITATION_RE = /\[(\d{1,2})\]/g;

const renderWithCitations = (text: string, citations: CitationChip[]): ReactNode[] => {
    const out: ReactNode[] = [];
    let last = 0;
    for (const match of text.matchAll(CITATION_RE)) {
        const idx = Number(match[1]);
        const cite = citations.find((c) => c.index === idx);
        if (!cite) continue;
        if (match.index! > last) out.push(text.slice(last, match.index));
        out.push(
            <button
                key={`c-${match.index}`}
                type="button"
                onClick={cite.onClick}
                title={cite.label}
                aria-label={`Source ${idx}: ${cite.label}`}
                className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-1 items-center justify-center rounded-full bg-primary/15 px-1 align-baseline text-[10px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
            >
                {idx}
            </button>,
        );
        last = match.index! + match[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
};

const withCitations = (children: ReactNode, citations?: CitationChip[]): ReactNode => {
    if (!citations?.length) return children;
    const walk = (node: ReactNode): ReactNode => {
        if (typeof node === "string") return renderWithCitations(node, citations);
        if (Array.isArray(node)) return node.map((n, i) => <span key={i}>{walk(n)}</span>);
        return node;
    };
    return walk(children);
};

/** Study-content renderer: GitHub-flavoured Markdown + KaTeX math + optional citation chips. */
export const Markdown = memo(({ content, className, citations }: MarkdownProps) => (
    <div className={cn("prose-study", className)}>
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
                a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                    </a>
                ),
                p: ({ children }) => <p>{withCitations(children, citations)}</p>,
                li: ({ children }) => <li>{withCitations(children, citations)}</li>,
                td: ({ children }) => <td>{withCitations(children, citations)}</td>,
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
));
Markdown.displayName = "Markdown";
