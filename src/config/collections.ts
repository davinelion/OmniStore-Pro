export const collections = [
  {
    slug: "best-open-source-music-apps",
    name: "Best Open-Source Music Apps",
    description: "Players and libraries that keep your music under your control.",
    apps: ["spotube", "music-assistant", "audacity"],
  },
  {
    slug: "best-privacy-apps",
    name: "Best Privacy Apps",
    description: "Tools that default to local-first or encrypted workflows.",
    apps: ["keepassxc", "cryptomator", "standard-notes", "organic-maps"],
  },
  {
    slug: "best-developer-tools",
    name: "Best Developer Tools",
    description: "Editors and utilities for building software.",
    apps: ["vscodium"],
  },
  {
    slug: "best-cross-platform-apps",
    name: "Best Cross-Platform Apps",
    description: "One identity across phones and desktops.",
    apps: ["localsend", "joplin", "firefox", "nextcloud", "element"],
  },
  {
    slug: "best-linux-apps",
    name: "Best Linux Apps",
    description: "Desktop software that treats Linux as a first-class platform.",
    apps: ["blender", "obs-studio", "gimp", "inkscape", "vscodium"],
  },
  {
    slug: "best-android-apps",
    name: "Best Android Apps",
    description: "Open-source Android clients with verified packages.",
    apps: ["organic-maps", "spotube", "localsend", "newpipe"].filter(Boolean),
  },
];
