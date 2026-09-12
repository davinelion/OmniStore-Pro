import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Calculator,
  Camera,
  CheckSquare,
  CloudSun,
  Code2,
  Files,
  FolderOpen,
  Gamepad2,
  GraduationCap,
  Globe,
  HeartPulse,
  Image as ImageIcon,
  Map,
  MessageCircle,
  Music,
  Palette,
  Play,
  ShieldCheck,
  Type,
  Users,
  Video,
  Wallet,
  Wrench,
} from "lucide-react";

import type { Category } from "@omnistore/shared-models";
import { cn } from "@/lib/utils";

/** OmniSource category icons → lucide, with a safe fallback. */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  wrench: Wrench,
  check: CheckSquare,
  shield: ShieldCheck,
  palette: Palette,
  play: Play,
  code: Code2,
  music: Music,
  video: Video,
  image: ImageIcon,
  photo: Camera,
  camera: Camera,
  chat: MessageCircle,
  map: Map,
  weather: CloudSun,
  finance: Wallet,
  finance2: Wallet,
  money: Wallet,
  games: Gamepad2,
  games2: Gamepad2,
  books: BookOpen,
  education: GraduationCap,
  health: HeartPulse,
  social: Users,
  internet: Globe,
  files: Files,
  text: Type,
};

function iconFor(name: string | null | undefined) {
  if (!name) return FolderOpen;
  return ICONS[name.toLowerCase()] ?? FolderOpen;
}

/** Category tile driven entirely by the OmniSource taxonomy. */
export function CategoryCard({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) {
  const Icon = iconFor(category.icon);

  return (
    <Link
      href={`/categories/${category.slug}`}
      className={cn(
        "card card-interactive group flex items-center gap-3.5 p-4 hover:shadow-card",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/20 ",
          "bg-gradient-to-br from-accent/12 to-accent-2/8 text-accent ",
          "transition-transform duration-200 ease-spring group-hover:scale-105",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-semibold tracking-tight">
          {category.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {category.appCount > 0
            ? `${category.appCount} ${category.appCount === 1 ? "app" : "apps"}`
            : category.description || ""}
        </span>
      </span>
      <ArrowUpRight
        className={cn(
          "h-4 w-4 shrink-0 text-subtle opacity-0 transition-all duration-200 ",
          "group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100",
        )}
        aria-hidden
      />
    </Link>
  );
}
