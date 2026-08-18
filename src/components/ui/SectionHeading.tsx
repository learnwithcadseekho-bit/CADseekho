import "@/styles/drafting.css";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  /** Use "h1" on standalone pages that have no other page heading. Defaults
   * to "h2" for sections nested under a page that already has its own h1. */
  as?: "h1" | "h2";
}

export function SectionHeading({ title, subtitle, align = "left", as = "h2" }: SectionHeadingProps) {
  const Heading = as;
  return (
    <div className={`section-heading section-heading--${align}`}>
      <Heading className="section-heading__title">{title}</Heading>
      {subtitle && <p className="section-heading__subtitle">{subtitle}</p>}
    </div>
  );
}
