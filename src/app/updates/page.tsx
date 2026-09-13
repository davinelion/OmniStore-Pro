import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UpdatesPanel } from "@/components/updates/UpdatesPanel";

export const metadata: Metadata = {
  title: "Updates — Direct from Source | OmniStore",
  description: "Obtanium-style updates: get app updates directly from GitHub, GitLab, F-Droid. Background checks, direct downloads, no store middleman.",
};

export default async function UpdatesPage() {
  return <UpdatesPanel />;
}
