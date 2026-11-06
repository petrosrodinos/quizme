import { useCallback, useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n-options";
import { currentLanguage } from "@/i18n";

interface SpeechResultLike {
    isFinal: boolean;
    0: { transcript: string };
}
interface SpeechEventLike {
    resultIndex: number;
    results: ArrayLike<SpeechResultLike>;
}
interface SpeechRecognitionLike {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    onresult: ((e: SpeechEventLike) => void) | null;
    onend: (() => void) | null;
    onerror: ((e: { error: string }) => void) | null;
}
type SpeechCtor = new () => SpeechRecognitionLike;

const getCtor = (): SpeechCtor | null => {
    if (typeof window === "undefined") return null;
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/**
 * Browser speech-to-text (Web Speech API). Appends final transcripts via `onFinal` and exposes the live
 * interim transcript. `supported` is false where the API is unavailable so the UI can fall back to typing.
 */
/** Recognition language follows the UI language (Greek UI → el-GR, otherwise en-US). */
const speechLang = () => (currentLanguage() === "el" ? "el-GR" : "en-US");

export const useSpeechRecognition = (onFinal: (text: string) => void, lang?: string) => {
    const [listening, setListening] = useState(false);
    const [interim, setInterim] = useState("");
    const [error, setError] = useState<string | null>(null);
    const recRef = useRef<SpeechRecognitionLike | null>(null);
    const finalRef = useRef(onFinal);
    finalRef.current = onFinal;
    const supported = !!getCtor();

    const stop = useCallback(() => {
        recRef.current?.stop();
    }, []);

    const start = useCallback(() => {
        const Ctor = getCtor();
        if (!Ctor) return;
        setError(null);
        const rec = new Ctor();
        rec.lang = lang ?? speechLang();
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
            let live = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const r = e.results[i];
                if (r.isFinal) finalRef.current(r[0].transcript.trim());
                else live += r[0].transcript;
            }
            setInterim(live);
        };
        rec.onerror = (e) => setError(tr(e.error === "not-allowed" ? "recall:speech.permissionDenied" : "recall:speech.stopped"));
        rec.onend = () => {
            setListening(false);
            setInterim("");
        };
        recRef.current = rec;
        rec.start();
        setListening(true);
    }, [lang]);

    useEffect(() => () => recRef.current?.stop(), []);

    return { supported, listening, interim, error, start, stop };
};
