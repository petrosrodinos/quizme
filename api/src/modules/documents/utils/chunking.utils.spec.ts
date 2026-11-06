import { chunkBlocks } from './chunking.utils';
import { TextBlock } from './extraction.utils';
import { conceptCoverage, cosine, hashEmbedding, splitSentences } from '@/integrations/ai/local/nlp.utils';

const para = (n: number, page: number | null = null): TextBlock => ({
    page,
    heading: 0,
    text: Array.from({ length: n }, (_, i) => `Sentence number ${i} explains an important biological concept in detail.`).join(' '),
});

describe('chunkBlocks (structure-aware chunking)', () => {
    it('never crosses section boundaries and records heading paths', () => {
        const blocks: TextBlock[] = [
            { page: 1, heading: 1, text: 'Chapter 1 Cells' },
            para(10, 1),
            { page: 2, heading: 2, text: '1.1 Membranes' },
            para(10, 2),
            { page: 3, heading: 1, text: 'Chapter 2 Energy' },
            para(10, 3),
        ];
        const { chunks, outline } = chunkBlocks(blocks);
        expect(outline.map((o) => o.title)).toEqual(['Chapter 1 Cells', 'Chapter 2 Energy']);
        expect(outline[0].children[0].title).toBe('1.1 Membranes');
        expect(chunks.map((c) => c.sectionPath.join(' > '))).toEqual(['Chapter 1 Cells', 'Chapter 1 Cells > 1.1 Membranes', 'Chapter 2 Energy']);
        expect(chunks[2].pageStart).toBe(3);
    });

    it('splits very long sections into bounded chunks', () => {
        const { chunks } = chunkBlocks([{ page: null, heading: 1, text: 'Long' }, para(400)]);
        expect(chunks.length).toBeGreaterThan(5);
        for (const c of chunks) expect(c.tokens).toBeLessThanOrEqual(800);
    });
});

describe('local NLP helpers', () => {
    it('splits sentences', () => {
        expect(splitSentences('Cells are small units of life. Mitochondria make ATP for the cell! Is this right?')).toHaveLength(2);
    });

    it('hash embeddings rank related text higher', () => {
        const q = hashEmbedding('mitochondria produce ATP energy');
        const related = hashEmbedding('The mitochondria are where the cell produces ATP energy through respiration');
        const unrelated = hashEmbedding('Virchow stated that every cell comes from another cell in 1855');
        expect(cosine(q, related)).toBeGreaterThan(cosine(q, unrelated));
    });

    it('measures concept coverage in free-text answers', () => {
        const cov = conceptCoverage(['ATP production', 'inner membrane', 'cristae'], 'Mitochondria have an inner membrane folded into cristae.');
        expect(cov.present).toEqual(['inner membrane', 'cristae']);
        expect(cov.missing).toEqual(['ATP production']);
    });
});
