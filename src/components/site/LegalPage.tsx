import type { ReactNode } from "react";
import { PageShell } from "./Layout";
import { Section } from "./ui";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PageShell>
      <Section>
        <div className="mx-auto max-w-2xl space-y-4 text-muted-foreground">
          <h1 className="text-4xl font-bold text-foreground">{title}</h1>
          <p className="rounded-lg bg-secondary p-3 text-sm">Draft placeholder — the official version will be published by RIDE TOKENS.</p>
          {children}
        </div>
      </Section>
    </PageShell>
  );
}
