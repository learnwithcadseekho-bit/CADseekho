/** A number formatted for LaTeX: fixed decimals, thousands as 50{,}000. */
export function texNum(n: number, decimals = 2): string {
  const [int, frac] = Math.abs(n).toFixed(decimals).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "{,}");
  return `${n < 0 ? "-" : ""}${grouped}${frac ? `.${frac}` : ""}`;
}

/** Fills {{key}} placeholders in a step template with live values. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? `\\text{?}`);
}
