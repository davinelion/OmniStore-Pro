/** Editorial starting points, not claims of feature parity. Evidence is the
 * catalog's upstream repository/homepage; detailed capabilities remain unknown. */
export const ALTERNATIVE_GUIDES = [
  {
    slug: "notion",
    name: "Notion",
    task: "Notes and knowledge management",
    candidates: ["appflowy", "joplin", "logseq", "qownnotes"],
    tradeoff:
      "Check databases, team permissions, sync hosting, and import fidelity. These tools have different data models.",
  },
  {
    slug: "postman",
    name: "Postman",
    task: "API development and testing",
    candidates: ["bruno", "insomnia", "hurl"],
    tradeoff:
      "Check authentication, collection import, scripting, and team workflows before switching.",
  },
  {
    slug: "1password",
    name: "1Password",
    task: "Password management",
    candidates: ["keepassxc", "keepassdx"],
    tradeoff:
      "Check vault compatibility, browser integration, sharing, and your backup/sync strategy. Exported vaults may contain plaintext secrets.",
  },
  {
    slug: "autocad",
    name: "AutoCAD",
    task: "CAD and parametric design",
    candidates: ["freecad", "openscad"],
    tradeoff:
      "Check file formats, drawing workflows, and required workbench support. These are not drop-in replacements.",
  },
  {
    slug: "teamviewer",
    name: "TeamViewer",
    task: "Remote access",
    candidates: ["rustdesk"],
    tradeoff:
      "Check relay hosting, unattended access, platform permissions, and organizational security requirements.",
  },
] as const;
