import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — RIDE TOKENS" },
      { name: "description", content: "Terms of Service for RIDE TOKENS." },
      { property: "og:title", content: "Terms of Service — RIDE TOKENS" },
      { property: "og:description", content: "Terms of Service for RIDE TOKENS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Terms of Service">
      <p>This website is currently a demonstration. No ride, payment or token service is provided through it.</p>
    </LegalPage>
  ),
});
