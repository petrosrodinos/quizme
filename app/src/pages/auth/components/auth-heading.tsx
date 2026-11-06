import type { ReactNode } from "react";

export const AuthHeading = ({ title, description }: { title: string; description?: ReactNode }) => (
    <div className="mb-7 space-y-2">
        <h2 className="font-display text-[34px] leading-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
);
