import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router doesn't reset scroll position on navigation the way a
// traditional multi-page site does — without this, clicking a link while
// scrolled down (e.g. a footer link) lands on the new page still scrolled
// to the same position, looking like the page didn't load.
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
