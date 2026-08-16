import type { ReactNode } from "react";

export function FormMessage({ type, children }: { type: "error" | "success"; children: ReactNode }) {
  return (
    <div className={`form-message form-message--${type}`} role={type === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
