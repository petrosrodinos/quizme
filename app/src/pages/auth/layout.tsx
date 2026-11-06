import { Link, Outlet } from "react-router-dom";
import { BrainCircuit, Layers, LineChart, Sparkles } from "lucide-react";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";

const highlights = [
    { icon: Sparkles, text: "Turn your own notes and PDFs into quizzes, flashcards and summaries." },
    { icon: BrainCircuit, text: "An AI tutor grounded in your sources — with citations, not guesses." },
    { icon: Layers, text: "Spaced repetition and adaptive quizzes that target your weak spots." },
    { icon: LineChart, text: "Know exactly how exam-ready you are, topic by topic." },
];

/** Editorial split layout for all /auth pages. */
export default function AuthLayout() {
    return (
        <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
            <aside className="relative hidden overflow-hidden bg-[#181715] p-12 text-[#faf9f5] lg:flex lg:flex-col lg:justify-between">
                <Link to={Routes.auth.sign_in} className="flex items-center gap-2.5">
                    <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
                    <span className="font-display text-2xl">{environments.APP_NAME}</span>
                </Link>
                <div className="max-w-lg">
                    <h1 className="font-display text-5xl leading-[1.08] tracking-tight">
                        Study smarter, <span className="italic text-[#e8a55a]">remember</span> longer.
                    </h1>
                    <p className="mt-5 text-[15px] leading-relaxed text-[#a09d96]">
                        Your AI-powered personal learning system: tutor, adaptive quiz platform, flashcards and exam coach — all built from your own study material.
                    </p>
                    <ul className="mt-10 space-y-4">
                        {highlights.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-start gap-3 text-sm text-[#d8d4cc]">
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#252320] text-[#cc785c]">
                                    <Icon className="h-4 w-4" aria-hidden />
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-xs text-[#6c6a64]">Import · Understand · Practice · Master</p>
                <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#cc785c]/20 blur-3xl" aria-hidden />
                <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-[#5db8a6]/10 blur-3xl" aria-hidden />
            </aside>
            <main className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
                <div className="w-full max-w-[400px]">
                    <Link to={Routes.auth.sign_in} className="mb-8 flex items-center gap-2 lg:hidden">
                        <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
                        <span className="font-display text-2xl">{environments.APP_NAME}</span>
                    </Link>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
