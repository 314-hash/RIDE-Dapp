import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety — RIDE TOKENS" },
      { name: "description", content: "Safety for RIDE TOKENS." },
      { property: "og:title", content: "Safety — RIDE TOKENS" },
      { property: "og:description", content: "Safety for RIDE TOKENS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Safety">
      <p>Never share your seed phrase or private key. RIDE TOKENS will never ask for them. Safety features for riders and drivers will be detailed before launch.</p>
    </LegalPage>
  ),
});
