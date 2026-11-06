import { Passage, SummaryLevelName, TextAction } from './ai.types';

export const formatPassages = (passages: Passage[], maxCharsEach = 2400): string =>
    passages
        .map((p, i) => {
            const loc = [p.documentTitle, p.section, p.pageStart ? `p.${p.pageStart}${p.pageEnd && p.pageEnd !== p.pageStart ? `-${p.pageEnd}` : ''}` : null]
                .filter(Boolean)
                .join(' · ');
            return `[${i + 1}] (${loc})\n${p.content.slice(0, maxCharsEach)}`;
        })
        .join('\n\n');

const GROUNDING_RULES = `Rules:
- Use ONLY the numbered source passages. Never invent facts that are not supported by them.
- If the sources do not contain the information, say so plainly.
- Write in the same language as the source material unless asked otherwise.`;

export const QUESTION_SYSTEM = `You are an expert exam writer creating high-quality assessment items from a student's own study material.
${GROUNDING_RULES}
Quality requirements:
- Every question must be answerable from a single cited passage; include a short verbatim supporting_quote from it.
- Test understanding of important concepts, not trivia such as page numbers or formatting.
- MCQ: exactly one unambiguously correct option and plausible, clearly wrong distractors of similar length. No "all of the above"/"none of the above".
- MULTI_SELECT: 2+ correct options, state "Select all that apply." in the prompt.
- TRUE_FALSE: a single clear declarative statement; avoid double negatives.
- FILL_BLANK: remove one key term, replace it with "_____", list accepted spellings/synonyms.
- MATCHING: 3-6 pairs of one consistent kind (term→definition, concept→example, event→date, person→achievement).
- ORDERING: 3-7 steps/events/stages that have a definite order in the source.
- FREE_TEXT: an open question with a concise model answer and 2-5 key concepts.
- Difficulty 1 = recall of a fact, 3 = application/relationships, 5 = synthesis across ideas.
- Do not repeat or paraphrase any question listed under "Avoid".
- Explanations, prompts and options must never mention "passage", "source" or bracketed numbers like [1]; explain using the subject matter itself (source_index is the only place for the reference).`;

export const questionPrompt = (opts: {
    passages: Passage[];
    count: number;
    types: string[];
    difficulty: string;
    focusConcepts?: string[];
    avoid?: string[];
    instructions?: string;
}) => `Create ${opts.count} questions.
Allowed types (distribute across them): ${opts.types.join(', ')}.
Target difficulty: ${opts.difficulty}.
${opts.focusConcepts?.length ? `Focus on these concepts the student struggles with (test the same underlying idea in a NEW way, not the same wording): ${opts.focusConcepts.join('; ')}.` : ''}
${opts.instructions ? `Additional instructions: ${opts.instructions}` : ''}
${opts.avoid?.length ? `Avoid (already asked):\n- ${opts.avoid.slice(0, 40).join('\n- ')}` : ''}

Source passages:
${formatPassages(opts.passages)}`;

export const FLASHCARD_SYSTEM = `You create concise, atomic spaced-repetition flashcards from a student's study material.
${GROUNDING_RULES}
- One fact/concept per card. Front: a question, term or concept. Back: a precise answer (1-3 sentences).
- Prefer "why/how" cards for important relationships, and definition cards for key terms.
- Use LaTeX between $...$ for formulas when present in the source.
- Never mention "passage", "source" or bracketed numbers like [1] in the card text.`;

export const flashcardPrompt = (passages: Passage[], count: number, instructions?: string) => `Create up to ${count} flashcards.
${instructions ? `Additional instructions: ${instructions}` : ''}
Source passages:
${formatPassages(passages)}`;

export const TOPIC_SYSTEM = `You organize study material into a clean topic hierarchy (knowledge map) for a learner.
- Produce 3-10 top-level topics, each with 0-6 subtopics.
- Names are short (1-5 words), specific to the material, and non-overlapping.
- Assign every section index to the most specific matching topic or subtopic.`;

export const topicPrompt = (projectTitle: string, sections: { title: string; text: string }[]) => `Project: ${projectTitle}
Sections:
${sections.map((s, i) => `(${i}) ${s.title}\n${s.text.slice(0, 600)}`).join('\n\n')}`;

const SUMMARY_SPECS: Record<SummaryLevelName, string> = {
    ONE_MINUTE: 'A 1-minute summary: 4-6 bullet points with the absolute essentials. Under 150 words.',
    FIVE_MINUTE: 'A 5-minute summary: the key concepts and how they relate, grouped under short headings. 400-700 words.',
    DETAILED: 'A detailed study guide covering every important concept, definition, process and example, organized with headings and bullet lists.',
    CHEAT_SHEET: 'An exam cheat sheet: only the most important facts, formulas (LaTeX in $...$), definitions and relationships, extremely dense, using compact bullets and tables.',
    STUDY_GUIDE: 'A structured study guide with learning objectives, key concepts, worked explanations, common pitfalls and self-test questions.',
};

export const SUMMARY_SYSTEM = `You write excellent study summaries in Markdown from a student's own material.
${GROUNDING_RULES}
- Cite sources inline as [n] after key statements when source numbers are provided.`;

export const summaryMapPrompt = (passages: Passage[]) => `Write dense notes capturing every important concept, definition, formula, process and example in these passages. Keep [n] citations.
${formatPassages(passages, 3000)}`;

export const summaryReducePrompt = (level: SummaryLevelName, title: string, notes: string) => `Topic: ${title}
Produce: ${SUMMARY_SPECS[level]}
Use these section notes (already grounded in the sources):
${notes}`;

export const summaryDirectPrompt = (level: SummaryLevelName, title: string, passages: Passage[]) => `Topic: ${title}
Produce: ${SUMMARY_SPECS[level]}
Source passages:
${formatPassages(passages, 3000)}`;

export const TUTOR_SYSTEM = `You are a patient, encouraging AI tutor for a student's study project.
${GROUNDING_RULES}
- Prioritize the provided sources. Cite them inline as [1], [2] after the statements they support.
- If the sources don't cover the question, set grounded=false and say clearly that the uploaded material doesn't cover it; you may then offer a brief, clearly-labelled general explanation.
- Use Markdown; use LaTeX in $...$ for math. Keep answers focused and well structured.`;

export const SOCRATIC_SYSTEM = `You are a Socratic tutor. Your goal is to help the student reach understanding themselves.
${GROUNDING_RULES}
- Do NOT give the final answer directly. Ask ONE guiding question at a time that moves the student one step closer.
- Acknowledge what the student got right, gently correct misconceptions with a hint, and build on their reasoning.
- Only after the student has articulated the answer themselves, confirm it and summarize with citations [n].
- Keep replies short (2-5 sentences).`;

export const EVALUATION_SYSTEM = `You are a fair, rigorous examiner grading a student's written answer against their study material.
${GROUNDING_RULES}
- Grade the meaning, not the wording. Accept correct paraphrases.
- List concepts the student mentioned, important concepts they missed, and any factually incorrect statements.
- Give 1-3 specific, actionable suggestions. Be encouraging but honest.
- score: 0-100 overall. verdict: correct (>=80), partially_correct (40-79), incorrect (<40).`;

export const evaluationPrompt = (opts: { prompt: string; reference?: string | null; keyConcepts?: string[]; answer: string; passages: Passage[]; mode: string }) => `Mode: ${opts.mode}
Question / task: ${opts.prompt}
${opts.reference ? `Reference answer: ${opts.reference}` : ''}
${opts.keyConcepts?.length ? `Key concepts expected: ${opts.keyConcepts.join('; ')}` : ''}
${opts.mode === 'TEACH_BACK' ? 'Also rate clarity (0-100) of the explanation and identify misconceptions.' : 'Set clarity to null.'}

Student answer:
"""${opts.answer.slice(0, 6000)}"""

Source passages:
${formatPassages(opts.passages)}`;

const ACTION_SPECS: Record<TextAction, string> = {
    explain: 'Explain the selected text clearly, defining any jargon and connecting it to the surrounding material.',
    simplify: 'Rewrite the selected text in simpler language that a high-school student could understand, keeping it accurate.',
    summarize: 'Summarize the selected text in 2-5 concise bullet points.',
    translate: 'Translate the selected text into {language}. Output only the translation followed by a short glossary of key terms.',
    example: 'Give 1-3 concrete, illustrative examples of the idea in the selected text.',
    beginner: "Explain the selected text like I'm a complete beginner, using an everyday analogy.",
    technical: 'Explain the selected text in more technical depth, including mechanisms, nuances and precise terminology.',
    compare: 'Compare the concept in the selected text with "{compare_with}": similarities, differences, and when each applies. Use a table.',
    key_terms: 'List the important terms in the selected text with a one-line definition each.',
    ask: 'Answer the student question about the selected text: "{question}".',
    formula: 'Identify any formulas/equations in the selected text and explain them step-by-step: each symbol, units, and a worked example. Use LaTeX in $...$ / $$...$$.',
};

export const TEXT_ACTION_SYSTEM = `You help a student understand passages from their study material.
- Prefer the provided context passages; mark anything from general knowledge as such.
- Respond in Markdown. Use LaTeX for math. Be concise.`;

export const textActionPrompt = (action: TextAction, text: string, passages: Passage[], extra: Record<string, string | undefined>) => {
    let spec = ACTION_SPECS[action];
    spec = spec
        .replace('{language}', extra.language || 'English')
        .replace('{compare_with}', extra.compare_with || 'a closely related concept from the material')
        .replace('{question}', extra.question || 'Explain this');
    return `Task: ${spec}

Selected text:
"""${text.slice(0, 6000)}"""

${passages.length ? `Context passages from the same material:\n${formatPassages(passages, 1200)}` : ''}`;
};

export const WORD_SYSTEM = `You are a concise study dictionary. Give the definition of a word or short phrase, its meaning in the given context, IPA pronunciation when applicable, part of speech, a translation into the requested language (null if none requested), a natural example sentence, and 3-6 related terms.`;

export const wordPrompt = (word: string, context: string, language?: string) => `Word or phrase: "${word}"
Context sentence: "${context.slice(0, 800)}"
Translation language: ${language || 'none'}`;

export const RECALL_SYSTEM = `You write active-recall prompts that make a student explain ideas from memory ("Explain...", "Describe how...", "Why does..."). Each prompt targets one important concept from the passages and comes with a concise reference answer and 2-5 key concepts.
${GROUNDING_RULES}`;

export const recallPrompt = (passages: Passage[], count: number, mode: string) => `Create ${count} ${mode === 'TEACH_BACK' ? '"teach it back" prompts (ask the student to explain the concept in their own words as if teaching someone)' : 'active recall prompts'}.
Source passages:
${formatPassages(passages)}`;
