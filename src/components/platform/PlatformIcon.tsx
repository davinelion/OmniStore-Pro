import { Laptop, Monitor, Smartphone, Tablet, Terminal, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  ios: Smartphone,
  ipados: Tablet,
  android: Smartphone,
  windows: Monitor,
  macos: Laptop,
  linux: Terminal,
};

export function platformIcon(platform: string): LucideIcon {
  return ICONS[platform] ?? Monitor;
}
