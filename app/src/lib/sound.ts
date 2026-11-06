/**
 * QuizMe sound engine.
 *
 * All sounds are synthesized in-house at runtime with the Web Audio API (oscillators, envelopes and
 * filtered noise). No audio files are shipped, so there are no third-party licensing concerns and
 * latency is effectively zero. The AudioContext is created lazily on the first user interaction
 * (browsers block autoplay) and output is muted while the tab is hidden.
 */

export type SoundName =
    | "correct"
    | "wrong"
    | "flip"
    | "combo"
    | "xp"
    | "levelUp"
    | "achievement"
    | "goal"
    | "finishPass"
    | "finishFail"
    | "timerTick";

export type SoundCategory = "feedback" | "celebrations" | "timers";

export const SoundCategories: Record<SoundName, SoundCategory> = {
    correct: "feedback",
    wrong: "feedback",
    flip: "feedback",
    combo: "feedback",
    xp: "feedback",
    levelUp: "celebrations",
    achievement: "celebrations",
    goal: "celebrations",
    finishPass: "celebrations",
    finishFail: "celebrations",
    timerTick: "timers",
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.7;
let unlocked = false;

const getCtx = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ctx = new Ctor();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
    }
    return ctx;
};

/** Call once at app start: unlocks audio on the first user gesture and mutes when the tab is hidden. */
export const initSoundEngine = () => {
    if (typeof window === "undefined" || unlocked) return;
    const unlock = () => {
        const c = getCtx();
        void c?.resume();
        unlocked = true;
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: false });
    window.addEventListener("keydown", unlock, { once: false });
    document.addEventListener("visibilitychange", () => {
        if (!ctx) return;
        if (document.hidden) void ctx.suspend();
        else if (unlocked) void ctx.resume();
    });
};

export const setSoundVolume = (value: number) => {
    volume = Math.min(1, Math.max(0, value));
    if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
};

interface ToneOptions {
    freq: number;
    start?: number;
    duration?: number;
    type?: OscillatorType;
    gain?: number;
    attack?: number;
    endFreq?: number;
}

const tone = (c: AudioContext, { freq, start = 0, duration = 0.18, type = "sine", gain = 0.25, attack = 0.005, endFreq }: ToneOptions) => {
    const t0 = c.currentTime + start;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(master!);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
};

const noise = (c: AudioContext, { start = 0, duration = 0.22, gain = 0.12, from = 600, to = 3200 } = {}) => {
    const t0 = c.currentTime + start;
    const buffer = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(g).connect(master!);
    src.start(t0);
};

const NOTE = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);

export interface PlayOptions {
    /** Current combo; raises the pitch of "correct" slightly. */
    combo?: number;
}

/** Plays a synthesized sound. Callers are responsible for checking user preferences (see useFeedback). */
export const playSound = (name: SoundName, opts: PlayOptions = {}) => {
    const c = getCtx();
    if (!c || !master || document.hidden) return;
    if (c.state === "suspended") void c.resume();
    switch (name) {
        case "correct": {
            const lift = Math.min(opts.combo ?? 0, 10) * 0.6;
            tone(c, { freq: NOTE(15 + lift), duration: 0.16, type: "sine", gain: 0.22 });
            tone(c, { freq: NOTE(22 + lift), start: 0.07, duration: 0.24, type: "sine", gain: 0.18 });
            tone(c, { freq: NOTE(27 + lift), start: 0.07, duration: 0.2, type: "triangle", gain: 0.05 });
            break;
        }
        case "wrong":
            tone(c, { freq: 220, endFreq: 150, duration: 0.28, type: "sine", gain: 0.2, attack: 0.01 });
            tone(c, { freq: 110, endFreq: 90, duration: 0.3, type: "triangle", gain: 0.08 });
            break;
        case "flip":
            noise(c, { duration: 0.2, gain: 0.08, from: 500, to: 4000 });
            break;
        case "combo":
            [0, 4, 7, 12].forEach((s, i) => tone(c, { freq: NOTE(12 + s), start: i * 0.06, duration: 0.18, type: "triangle", gain: 0.13 }));
            break;
        case "xp":
            tone(c, { freq: NOTE(31), duration: 0.07, type: "square", gain: 0.035 });
            tone(c, { freq: NOTE(36), start: 0.05, duration: 0.09, type: "sine", gain: 0.09 });
            break;
        case "levelUp":
            [0, 4, 7, 12, 16].forEach((s, i) => tone(c, { freq: NOTE(3 + s), start: i * 0.09, duration: 0.3, type: "triangle", gain: 0.15 }));
            tone(c, { freq: NOTE(15), start: 0.45, duration: 0.6, type: "sine", gain: 0.12 });
            tone(c, { freq: NOTE(19), start: 0.45, duration: 0.6, type: "sine", gain: 0.1 });
            break;
        case "achievement":
            [7, 12, 16, 19].forEach((s, i) => tone(c, { freq: NOTE(12 + s), start: i * 0.08, duration: 0.22, type: "sine", gain: 0.14 }));
            noise(c, { start: 0.3, duration: 0.35, gain: 0.04, from: 3000, to: 8000 });
            break;
        case "goal":
            [0, 7, 12].forEach((s, i) => tone(c, { freq: NOTE(10 + s), start: i * 0.1, duration: 0.35, type: "triangle", gain: 0.14 }));
            tone(c, { freq: NOTE(26), start: 0.32, duration: 0.5, type: "sine", gain: 0.1 });
            break;
        case "finishPass":
            [0, 4, 7].forEach((s, i) => tone(c, { freq: NOTE(8 + s), start: i * 0.11, duration: 0.4, type: "triangle", gain: 0.15 }));
            tone(c, { freq: NOTE(20), start: 0.35, duration: 0.6, type: "sine", gain: 0.12 });
            break;
        case "finishFail":
            [7, 3, 0].forEach((s, i) => tone(c, { freq: NOTE(s), start: i * 0.14, duration: 0.35, type: "sine", gain: 0.12 }));
            break;
        case "timerTick":
            tone(c, { freq: 1200, duration: 0.04, type: "square", gain: 0.04 });
            break;
    }
};

export type HapticPattern = "correct" | "wrong" | "celebrate";
const HAPTICS: Record<HapticPattern, number | number[]> = {
    correct: 18,
    wrong: [30, 40, 30],
    celebrate: [20, 40, 20, 40, 60],
};

export const vibrate = (pattern: HapticPattern) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
            navigator.vibrate(HAPTICS[pattern]);
        } catch {
            /* unsupported */
        }
    }
};
