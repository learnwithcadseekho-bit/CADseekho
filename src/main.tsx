import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/global.css";
import "./styles/forms.css";
import "./styles/drafting.css";
import "./styles/cards.css";

const container = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Public pages are prerendered at build time (scripts/prerender.mjs), so their
// HTML is already in #root and React attaches to it instead of re-rendering.
// Client-only routes (login, dashboard, admin…) get the plain app shell.
if (container.hasAttribute("data-prerendered")) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
