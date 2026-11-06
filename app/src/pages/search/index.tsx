import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BookMarked, FileText, FolderOpen, HelpCircle, Layers, Network, Search, Sparkles, StickyNote } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { useSearch } from "@/features/search/hooks/use-search";
import { useResolveDocument } from "@/features/documents/hooks/use-documents";
import { ResultGroup } from "./components/result-group";
import { useTranslation } from "react-i18next";

const Row = ({ to, title, subtitle }: { to: string; title: ReactNode; subtitle?: ReactNode }) => (
    <li>
        <Link to={to} className="block px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
            <div className="line-clamp-1 text-sm font-medium">{title}</div>
            {subtitle && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{subtitle}</div>}
        </Link>
    </li>
);

export default function SearchPage() {
    const { t } = useTranslation("search");
    usePageMetadata({ title: t("metaTitle") });
    const [params, setParams] = useSearchParams();
    const [input, setInput] = useState(params.get("q") ?? "");
    const [q, setQ] = useState(params.get("q") ?? "");
    const [semantic, setSemantic] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setQ(input.trim());
            setParams(input.trim() ? { q: input.trim() } : {}, { replace: true });
        }, 350);
        return () => clearTimeout(timer);
    }, [input, setParams]);

    const { data, isFetching, isError, error } = useSearch({ q, semantic });
    const navigate = useNavigate();
    const resolveDoc = useResolveDocument();
    const openDocument = (documentId: string) =>
        resolveDoc.mutate(documentId, { onSuccess: (doc) => navigate(Routes.projects.document(doc.project_id, doc.id)) });
    const total = data
        ? data.projects.length + data.documents.length + data.notes.length + data.flashcards.length + data.questions.length + data.topics.length + data.passages.length
        : 0;

    return (
        <Main>
            <PageHeader title={t("title")} description={t("description")} />
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t("placeholder")}
                        className="h-11 pl-9 text-base"
                        aria-label={t("inputLabel")}
                        autoFocus
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Switch id="semantic" checked={semantic} onCheckedChange={setSemantic} />
                    <Label htmlFor="semantic" className="text-sm">
                        {t("semantic")}
                    </Label>
                </div>
            </div>

            {q.length < 2 ? (
                <EmptyState icon={Search} title={t("intro.title")} description={t("intro.description")} compact />
            ) : isFetching && !data ? (
                <ListSkeleton rows={6} />
            ) : isError ? (
                <EmptyState title={t("failed")} description={error.message} compact />
            ) : !data || total === 0 ? (
                <EmptyState icon={Search} title={t("noResults.title")} description={semantic ? t("noResults.description", { query: q }) : t("noResults.descriptionSemantic", { query: q })} compact />
            ) : (
                <div className="space-y-4" aria-busy={isFetching}>
                    <ResultGroup title={t("groups.material")} icon={Sparkles} count={data.passages.length}>
                        {data.passages.map((p) => {
                            const projectId = data.documents.find((d) => d.id === p.document_id)?.project_id;
                            return (
                                <li key={p.chunk_id} className="px-4 py-3">
                                    <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                        <FileText className="h-3.5 w-3.5" aria-hidden />
                                        {projectId ? (
                                            <Link to={Routes.projects.document(projectId, p.document_id)} className="font-medium text-foreground hover:text-primary">
                                                {p.document_title}
                                            </Link>
                                        ) : (
                                            <button type="button" onClick={() => openDocument(p.document_id)} className="font-medium text-foreground hover:text-primary">
                                                {p.document_title}
                                            </button>
                                        )}
                                        {p.page != null && <span>{t("page", { page: p.page })}</span>}
                                        {p.section && <span className="truncate">· {p.section}</span>}
                                    </div>
                                    <p className="line-clamp-3 text-sm text-foreground/85">{p.snippet}</p>
                                </li>
                            );
                        })}
                    </ResultGroup>
                    <div className="grid gap-4 md:grid-cols-2">
                        <ResultGroup title={t("groups.projects")} icon={FolderOpen} count={data.projects.length}>
                            {data.projects.map((p) => (
                                <Row key={p.id} to={Routes.projects.detail(p.id)} title={p.title} subtitle={p.subject} />
                            ))}
                        </ResultGroup>
                        <ResultGroup title={t("groups.documents")} icon={FileText} count={data.documents.length}>
                            {data.documents.map((d) => (
                                <Row key={d.id} to={d.status === "READY" ? Routes.projects.document(d.project_id, d.id) : Routes.projects.documents(d.project_id)} title={d.filename} />
                            ))}
                        </ResultGroup>
                        <ResultGroup title={t("groups.topics")} icon={Network} count={data.topics.length}>
                            {data.topics.map((topic) => (
                                <Row key={topic.id} to={Routes.projects.topics(topic.project_id)} title={topic.name} />
                            ))}
                        </ResultGroup>
                        <ResultGroup title={t("groups.notes")} icon={StickyNote} count={data.notes.length}>
                            {data.notes.map((n) => (
                                <Row key={n.id} to={Routes.projects.notes(n.project_id)} title={n.title || n.content.slice(0, 80) || t("untitledNote")} subtitle={n.title ? n.content : undefined} />
                            ))}
                        </ResultGroup>
                        <ResultGroup title={t("groups.flashcards")} icon={Layers} count={data.flashcards.length}>
                            {data.flashcards.map((f) => (
                                <Row key={f.id} to={Routes.projects.flashcards(f.project_id)} title={f.front} subtitle={f.back} />
                            ))}
                        </ResultGroup>
                        <ResultGroup title={t("groups.questions")} icon={HelpCircle} count={data.questions.length}>
                            {data.questions.map((qq) => (
                                <Row key={qq.id} to={Routes.projects.questions(qq.project_id)} title={qq.prompt} subtitle={qq.concept} />
                            ))}
                        </ResultGroup>
                    </div>
                    {isFetching && <p className="flex items-center gap-2 text-xs text-muted-foreground"><BookMarked className="h-3.5 w-3.5" /> {t("updating")}</p>}
                </div>
            )}
        </Main>
    );
}
