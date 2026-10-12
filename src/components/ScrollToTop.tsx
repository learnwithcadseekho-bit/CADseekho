import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router doesn't reset scroll position on navigation the way a
// traditional multi-page site does — without this, clicking a link while
// scrolled down (e.g. a footer link) lands on the new page still scrolled
// to the same position, looking like the page didn't load.
//
// A #hash (e.g. Google Ads sitelinks to /ansys-foundation#fees) scrolls to
// that element instead; resetting to the top would undo the browser's jump.
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
