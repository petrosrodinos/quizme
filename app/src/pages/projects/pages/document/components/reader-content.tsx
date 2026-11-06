import { Fragment, memo } from "react";
import type { DocumentChunk } from "@/features/documents/interfaces/documents.interfaces";
import { renderWithHighlights, type HighlightSpan } from "../utils/highlight.utils";

interface ReaderContentProps {
    chunks: DocumentChunk[];
    highlights: HighlightSpan[];
}

/** Chunks carry their section heading as a prefix (for retrieval context) — strip it for display. */
const displayText = (chunk: DocumentChunk) => {
    const heading = chunk.section_path[chunk.section_path.length - 1];
    if (heading && chunk.content.startsWith(`${heading}\n\n`)) return chunk.content.slice(heading.length + 2);
    return chunk.content;
};

/** Renders processed chunks as a continuous, distraction-free document with section headings and page markers. */
export const ReaderContent = memo(({ chunks, highlights }: ReaderContentProps) => {
    let prevPath = "";
    let prevPage: number | null = null;
    return (
        <>
            {chunks.map((chunk) => {
                const path = chunk.section_path.join(" › ");
                const newSection = path && path !== prevPath;
                const newPage = chunk.page_start != null && chunk.page_start !== prevPage;
                const depth = chunk.section_path.length;
                prevPath = path || prevPath;
                if (chunk.page_start != null) prevPage = chunk.page_end ?? chunk.page_start;
                const paragraphs = displayText(chunk)
                    .split(/\n{2,}/)
                    .map((p) => p.trim())
                    .filter(Boolean);
                return (
                    <Fragment key={chunk.id}>
                        {newPage && (
                            <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground" aria-label={`Page ${chunk.page_start}`}>
                                <span className="h-px flex-1 bg-border" aria-hidden />
                                Page {chunk.page_start}
                                <span className="h-px flex-1 bg-border" aria-hidden />
                            </div>
                        )}
                        {newSection &&
                            (depth <= 1 ? (
                                <h2 className="mb-3 mt-10 font-display text-2xl leading-tight first:mt-0">{chunk.section_path[depth - 1]}</h2>
                            ) : (
                                <h3 className="mb-2 mt-8 font-display text-xl leading-tight">{chunk.section_path[depth - 1]}</h3>
                            ))}
                        <div data-chunk-id={chunk.id} data-page={chunk.page_start ?? undefined} className="space-y-4">
                            {paragraphs.map((p, i) => (
                                <p key={i} data-paragraph="" className="whitespace-pre-line text-[17px] leading-[1.75] text-foreground/90">
                                    {renderWithHighlights(p, highlights)}
                                </p>
                            ))}
                        </div>
                    </Fragment>
                );
            })}
        </>
    );
});
ReaderContent.displayName = "ReaderContent";
