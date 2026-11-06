#!/usr/bin/env node
/**
 * i18n quality gate.
 *   node scripts/i18n-check.mjs            → key parity across languages + unknown keys used in code
 *   node scripts/i18n-check.mjs --scan     → additionally lists likely hard-coded UI strings
 *   node scripts/i18n-check.mjs --scan src/pages/auth   → scan a sub-folder only
 * Exit code 1 when parity/unknown-key errors are found.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LOCALES = join(ROOT, 'src', 'i18n', 'locales');
const args = process.argv.slice(2);
const scan = args.includes('--scan');
const scanRoot = args.find((a) => !a.startsWith('--'));

const walk = (dir, filter) =>
    readdirSync(dir).flatMap((name) => {
        const p = join(dir, name);
        return statSync(p).isDirectory() ? walk(p, filter) : filter(p) ? [p] : [];
    });

const flatten = (obj, prefix = '') =>
    Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));

const languages = readdirSync(LOCALES).filter((d) => statSync(join(LOCALES, d)).isDirectory());
const data = {};
for (const lng of languages) {
    data[lng] = {};
    for (const file of readdirSync(join(LOCALES, lng)).filter((f) => f.endsWith('.json'))) {
        const ns = file.replace(/\.json$/, '');
        try {
            data[lng][ns] = Object.fromEntries(flatten(JSON.parse(readFileSync(join(LOCALES, lng, file), 'utf8'))));
        } catch (e) {
            console.error(`✘ ${lng}/${file}: invalid JSON (${e.message})`);
            process.exitCode = 1;
            data[lng][ns] = {};
        }
    }
}

let errors = 0;
const base = 'en';
const allNs = new Set(languages.flatMap((l) => Object.keys(data[l])));
for (const ns of allNs) {
    for (const lng of languages) {
        if (!data[lng][ns]) {
            console.error(`✘ missing file ${lng}/${ns}.json`);
            errors++;
        }
    }
    const baseKeys = new Set(Object.keys(data[base][ns] ?? {}));
    for (const lng of languages.filter((l) => l !== base)) {
        const keys = new Set(Object.keys(data[lng][ns] ?? {}));
        for (const k of baseKeys) if (!keys.has(k)) { console.error(`✘ ${lng}/${ns}: missing "${k}"`); errors++; }
        for (const k of keys) if (!baseKeys.has(k)) { console.error(`✘ ${lng}/${ns}: extra "${k}" (not in ${base})`); errors++; }
        for (const k of keys) {
            const v = data[lng][ns][k];
            if (typeof v === 'string' && !v.trim()) { console.error(`✘ ${lng}/${ns}: empty "${k}"`); errors++; }
        }
    }
}

// Keys referenced in code: t("ns:key"), t("key"), i18n.t(...), tr(...), tOption(id, "ns:key"), i18nKey="..."
const sources = walk(join(ROOT, 'src'), (p) => /\.(tsx?|jsx?)$/.test(p) && !p.includes(`${sep}i18n${sep}locales`));
const keyRe = /(?:\bt|\btr|i18n\.t|tOption\([^,]+,|i18nKey=)\s*\(?\s*["'`]([a-zA-Z0-9_.:-]+)["'`]/g;
const exists = (full) => {
    const [ns, key] = full.includes(':') ? full.split(':') : ['common', full];
    const dict = data[base][ns];
    if (!dict) return false;
    return key in dict || `${key}_one` in dict || `${key}_other` in dict || Object.keys(dict).some((k) => k.startsWith(`${key}.`));
};
const nsFromHook = (src) => {
    const m = /useTranslation\(\s*(?:\[\s*)?["']([a-zA-Z0-9_-]+)["']/.exec(src);
    return m ? m[1] : 'common';
};
for (const file of sources) {
    const src = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split(/\r?\n/)
        .filter((l) => !/^\s*\/\//.test(l))
        .join('\n');
    const defaultNs = nsFromHook(src);
    for (const m of src.matchAll(keyRe)) {
        const raw = m[1];
        if (raw.endsWith('.') || raw.endsWith(':')) continue; // dynamic suffix
        const full = raw.includes(':') ? raw : `${defaultNs}:${raw}`;
        if (!exists(full) && !exists(raw)) {
            console.error(`✘ unknown key "${raw}" in ${relative(ROOT, file)}`);
            errors++;
        }
    }
}

if (scan) {
    const root = scanRoot ? join(ROOT, scanRoot) : join(ROOT, 'src');
    const files = statSync(root).isDirectory() ? walk(root, (p) => p.endsWith('.tsx')) : [root];
    let hits = 0;
    for (const file of files) {
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
            if (/i18n-ignore|^\s*(\/\/|\*|import )/.test(line)) return;
            const jsxText = />\s*([A-Za-z][A-Za-z ,.'’!?&()-]{2,})\s*</.exec(line);
            const attr = /\b(placeholder|aria-label|title|alt|label|description|confirmText)=["']([A-Za-z][^"']{2,})["']/.exec(line);
            const toast = /\b(title|description):\s*["'`]([A-Z][^"'`]{3,})["'`]/.exec(line);
            const hit = jsxText?.[1] ?? attr?.[2] ?? toast?.[2];
            if (hit && !/^(QuizMe|XP|AI|OK|PDF|DOCX|CSV|JSON|TXT|HTML|MD|Markdown|ID|URL|English|Ελληνικά|className)$/.test(hit.trim())) {
                hits++;
                console.log(`• ${relative(ROOT, file)}:${i + 1}  ${hit.trim().slice(0, 80)}`);
            }
        });
    }
    console.log(`\n${hits} possible hard-coded string(s) found${scanRoot ? ` in ${scanRoot}` : ''}.`);
}

const nsCount = allNs.size;
const keyCount = Object.values(data[base] ?? {}).reduce((n, d) => n + Object.keys(d).length, 0);
if (errors) {
    console.error(`\n✘ i18n check failed with ${errors} error(s) (${nsCount} namespaces, ${keyCount} keys).`);
    process.exit(1);
}
console.log(`✔ i18n OK — ${languages.join(', ')} · ${nsCount} namespaces · ${keyCount} keys each.`);
