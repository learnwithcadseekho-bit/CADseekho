import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  block?: boolean;
}

export function Button({ variant = "primary", block, className = "", ...props }: ButtonProps) {
  const classes = [
    "btn",
    variant === "primary" ? "btn--primary" : "btn--outline",
    block ? "btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} {...props} />;
}
