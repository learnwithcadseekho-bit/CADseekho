import "@/styles/drafting.css";

interface SectionHeadingProps {
  number: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  /** Use "h1" on standalone pages that have no other page heading. Defaults
   * to "h2" for sections nested under a page that already has its own h1. */
  as?: "h1" | "h2";
}

export function SectionHeading({ number, eyebrow, title, subtitle, align = "left", as = "h2" }: SectionHeadingProps) {
  const Heading = as;
  return (
    <div className={`section-heading section-heading--${align}`}>
      <span className="mono-label section-eyebrow">
        {number} — {eyebrow}
      </span>
      <Heading className="section-heading__title">{title}</Heading>
      {subtitle && <p className="section-heading__subtitle">{subtitle}</p>}
    </div>
  );
}
