import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — RIDE TOKENS" },
      { name: "description", content: "Privacy Policy for RIDE TOKENS." },
      { property: "og:title", content: "Privacy Policy — RIDE TOKENS" },
      { property: "og:description", content: "Privacy Policy for RIDE TOKENS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Privacy Policy">
      <p>In demo mode, this site does not store or transmit the information you enter in forms.</p>
    </LegalPage>
  ),
});
