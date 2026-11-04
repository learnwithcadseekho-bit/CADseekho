import { EMBEDDED_TOOLS } from "@/pages/tools/embeddedTools";

export const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Resources", to: "/resources" },
  // Rendered as the ToolsMenu dropdown (desktop) / accordion (mobile).
  { label: "Tools", to: "/tools", menu: "tools" },
  { label: "Blog", to: "/blog" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
] as const;

export const TOOL_LINKS = [
  { label: "Beam Calculator", kind: "Calculator", to: "/tools/beam-calculator" },
  ...EMBEDDED_TOOLS.map((t) => ({ label: t.title, kind: t.label, to: `/tools/${t.slug}` })),
];
