import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { getLiveClassJoinDetails, type LiveClassJoinDetails } from "@/services/liveClassService";
import "./classroom.css";

type Status = "loading" | "ready" | "joining" | "in-class" | "blocked";

// The Zoom Meeting SDK "client view" takes over the whole window once joined
// and injects its own global styles, so it's only loaded on this page (a
// separate chunk) and leaving the class always does a full page load.
export default function LiveClassPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [details, setDetails] = useState<LiveClassJoinDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const joined = useRef(false);

  useEffect(() => {
    getLiveClassJoinDetails(slug)
      .then((d) => {
        setDetails(d);
        setStatus("ready");
      })
      .catch((e: Error) => {
        setError(e.message);
        setStatus("blocked");
      });
  }, [slug]);

  // Browser back while in class: the SPA route changes but the Zoom overlay
  // would stay on screen — leave the meeting and reload the new route cleanly.
  useEffect(() => {
    return () => {
      if (joined.current) window.location.reload();
    };
  }, []);

  async function handleJoin() {
    setStatus("joining");
    setError(null);
    try {
      // Fresh signature — the one fetched on page load may be old by now.
      const [d, { ZoomMtg }] = await Promise.all([
        getLiveClassJoinDetails(slug),
        import("@zoom/meetingsdk"),
      ]);
      ZoomMtg.preLoadWasm();
      ZoomMtg.prepareWebSDK();
      ZoomMtg.init({
        leaveUrl: `${window.location.origin}/dashboard`,
        patchJsMedia: true,
        leaveOnPageUnload: true,
        // Students shouldn't be able to copy the meeting ID, passcode or an
        // invite link and share the class outside the site.
        disableInvite: true,
        meetingInfo: ["topic", "host"],
        success: () => {
          const root = document.getElementById("zmmtg-root");
          if (root) root.style.display = "block";
          ZoomMtg.join({
            signature: d.signature,
            meetingNumber: d.meetingNumber,
            passWord: d.password,
            userName: d.userName,
            userEmail: d.userEmail,
            success: () => {
              joined.current = true;
              setStatus("in-class");
            },
            error: (err: { errorMessage?: string; reason?: string }) => {
              console.error("Zoom join failed:", err);
              setError(
                err?.errorMessage || err?.reason || "Couldn't join the class. Please try again in a minute."
              );
              setStatus("ready");
            },
          });
        },
        error: (err: unknown) => {
          console.error("Zoom init failed:", err);
          setError("Couldn't start the class player. Please refresh and try again.");
          setStatus("ready");
        },
      });
    } catch (e) {
      setError((e as Error).message || "Couldn't join the class. Please try again.");
      setStatus("ready");
    }
  }

  if (status === "loading") return <p className="section__status">Loading your class…</p>;

  return (
    <section className="section container classroom">
      <span className="mono-label">LIVE CLASS</span>
      <h1 className="classroom__title">{details?.courseTitle ?? "Live class"}</h1>

      {status === "blocked" ? (
        <div className="classroom__card">
          <FormMessage type="error">{error}</FormMessage>
          <div className="classroom__actions">
            <Link to="/dashboard" className="btn btn--outline">
              Back to Dashboard
            </Link>
            <Link to={`/courses/${slug}`} className="btn btn--primary">
              View Course
            </Link>
          </div>
        </div>
      ) : (
        <div className="classroom__card">
          {details?.schedule && (
            <p className="classroom__schedule">
              <span className="mono-label">CLASS TIMING</span>
              {details.schedule}
            </p>
          )}

          <ul className="classroom__tips">
            <li>Join a few minutes early. The instructor lets you in from the waiting room.</li>
            <li>Use headphones, and keep your mic muted unless you're asking a question.</li>
            <li>Allow microphone and camera access when your browser asks.</li>
            <li>On a phone, use Chrome or Safari; a laptop works best for following CAD demos.</li>
          </ul>

          {error && <FormMessage type="error">{error}</FormMessage>}

          <div className="classroom__actions">
            <Button type="button" onClick={handleJoin} disabled={status !== "ready"}>
              {status === "joining" ? "Joining…" : "Join Live Class"}
            </Button>
            <Link to="/resources" className="btn btn--outline">
              Class Resources
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
