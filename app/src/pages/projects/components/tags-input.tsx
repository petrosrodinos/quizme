import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TagsInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    max?: number;
}

/** Comma/Enter separated tag entry with removable chips. */
export const TagsInput = ({ value, onChange, placeholder = "Add a tag and press Enter", max = 20 }: TagsInputProps) => {
    const [draft, setDraft] = useState("");
    const commit = () => {
        const parts = draft
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);
        if (!parts.length) return;
        onChange([...new Set([...value, ...parts])].slice(0, max));
        setDraft("");
    };
    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
        } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
        }
    };
    return (
        <div className="space-y-2">
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {value.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 font-normal">
                            {tag}
                            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove tag ${tag}`} className="rounded hover:text-destructive">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} onBlur={commit} placeholder={placeholder} aria-label="Tags" />
        </div>
    );
};
