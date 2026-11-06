/**
 * Dependency-free text utilities used by the document pipeline, retrieval and
 * offline fallbacks (hashed embeddings, keyword extraction, extractive answers, coverage grading).
 */

export const STOPWORDS = new Set(
    `a about above after again against all am an and any are aren't as at be because been before being below between both but by
can cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have
haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it
it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own
same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there
there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're
we've were weren't what what's when when's where where's which while who who's whom why why's with won't would wouldn't you you'd
you'll you're you've your yours yourself yourselves also may might must shall will can just like use used using one two three
however therefore thus within without upon via per e.g i.e etc figure table chapter page section`.split(/\s+/),
);

export const normalize = (text: string): string =>
    text
        .replace(/­/g, '')
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

export const words = (text: string): string[] => text.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) ?? [];

/** Very light stemmer (plural/verb suffixes) good enough for keyword matching. */
export const stem = (word: string): string => {
    let w = word.toLowerCase();
    if (w.length > 5 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
    else if (w.length > 4 && w.endsWith('es') && !w.endsWith('ses')) w = w.slice(0, -2);
    else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
    if (w.length > 6 && w.endsWith('ing')) w = w.slice(0, -3);
    else if (w.length > 5 && w.endsWith('ed')) w = w.slice(0, -2);
    return w;
};

export const contentTokens = (text: string): string[] =>
    words(text).filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w)).map(stem);

export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export const wordCount = (text: string): number => (text.match(/\S+/g) ?? []).length;

export const splitSentences = (text: string): string[] =>
    normalize(text)
        .replace(/\n+/g, ' ')
        .split(/(?<=[.!?])\s+(?=[A-Z0-9"(])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15);

/** Top keywords by frequency with bigram support. */
export const extractKeywords = (text: string, limit = 8): string[] => {
    const tokens = words(text).filter((w) => w.length > 2);
    const counts = new Map<string, number>();
    for (let i = 0; i < tokens.length; i++) {
        const w = tokens[i];
        if (!STOPWORDS.has(w) && !/^\d+$/.test(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
        const next = tokens[i + 1];
        if (next && !STOPWORDS.has(w) && !STOPWORDS.has(next) && !/^\d+$/.test(w + next)) {
            const bigram = `${w} ${next}`;
            counts.set(bigram, (counts.get(bigram) ?? 0) + 1.5);
        }
    }
    return [...counts.entries()]
        .filter(([, c]) => c >= 1.5 || counts.size < 30)
        .sort((a, b) => b[1] - a[1])
        .map(([w]) => w)
        .filter((w, i, arr) => !arr.slice(0, i).some((prev) => prev.includes(w)))
        .slice(0, limit);
};

const fnv1a = (str: string): number => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
};

/** Signed feature-hashing embedding over stemmed unigrams + bigrams (offline fallback). */
export const hashEmbedding = (text: string, dims = 512): number[] => {
    const vec = new Array<number>(dims).fill(0);
    const toks = contentTokens(text);
    const add = (feature: string, weight: number) => {
        const h = fnv1a(feature);
        vec[h % dims] += (h & 0x80000000 ? -1 : 1) * weight;
    };
    const tf = new Map<string, number>();
    toks.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
    tf.forEach((count, t) => add(t, 1 + Math.log(count)));
    for (let i = 0; i < toks.length - 1; i++) add(`${toks[i]}_${toks[i + 1]}`, 0.5);
    return l2normalize(vec);
};

export const l2normalize = (vec: number[]): number[] => {
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
};

export const cosine = (a: number[], b: number[]): number => {
    if (!a?.length || a.length !== b?.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
};

/** Fraction of reference concepts present in the answer (stem + prefix fuzzy match). */
export const conceptCoverage = (reference: string[], answer: string) => {
    const answerStems = new Set(contentTokens(answer));
    const present: string[] = [];
    const missing: string[] = [];
    for (const concept of reference) {
        const parts = contentTokens(concept);
        const hit =
            parts.length > 0 &&
            parts.every((p) => answerStems.has(p) || [...answerStems].some((a) => a.length > 4 && (a.startsWith(p.slice(0, 5)) || p.startsWith(a.slice(0, 5)))));
        (hit ? present : missing).push(concept);
    }
    return { present, missing, ratio: reference.length ? present.length / reference.length : 0 };
};

/** Picks the sentences from passages most relevant to a query (extractive fallback answer). */
export const extractiveAnswer = (query: string, passages: string[], maxSentences = 4): string[] => {
    const q = new Set(contentTokens(query));
    const scored = passages.flatMap((p, pi) =>
        splitSentences(p).map((s, si) => {
            const toks = contentTokens(s);
            const overlap = toks.filter((t) => q.has(t)).length;
            return { s, score: overlap / Math.sqrt(toks.length + 1) - pi * 0.01 - si * 0.001 };
        }),
    );
    return scored
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSentences)
        .map((x) => x.s);
};

/** Levenshtein-based similarity in [0,1] for short answers (fill-in-the-blank). */
export const similarity = (a: string, b: string): number => {
    const x = a.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
    const y = b.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
    if (!x && !y) return 1;
    if (!x || !y) return 0;
    const dp = Array.from({ length: x.length + 1 }, (_, i) => [i, ...new Array(y.length).fill(0)]);
    for (let j = 1; j <= y.length; j++) dp[0][j] = j;
    for (let i = 1; i <= x.length; i++)
        for (let j = 1; j <= y.length; j++)
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    return 1 - dp[x.length][y.length] / Math.max(x.length, y.length);
};
