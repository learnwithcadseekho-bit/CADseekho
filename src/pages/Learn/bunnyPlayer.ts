import { useEffect, useRef } from "react";
import { LEARN_CONFIG } from "@/content/learn";

// Bunny's embed speaks the Player.js postMessage API
// (bunny.net/docs/playback-control-api): events ready / timeupdate
// {seconds, duration} / pause / ended, method setCurrentTime(seconds).

interface PlayerJsPlayer {
  on(event: string, cb: (data?: { seconds?: number; duration?: number }) => void): void;
  off(event: string): void;
  setCurrentTime(seconds: number): void;
}

declare global {
  interface Window {
    playerjs?: { Player: new (el: HTMLIFrameElement) => PlayerJsPlayer };
  }
}

let loading: Promise<void> | null = null;

function loadPlayerJs(): Promise<void> {
  if (window.playerjs) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = LEARN_CONFIG.playerJsUrl;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("player.js failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export interface PlayerCallbacks {
  /** Throttled to LEARN_CONFIG.progressSaveSeconds, plus on pause / tab hidden / leaving. */
  onSave: (seconds: number, duration: number | null) => void;
  onEnded: (duration: number | null) => void;
}

/**
 * Wire the Bunny iframe to progress saving and resume. Progress still works
 * without player.js (e.g. blocked script) — the video just won't resume or
 * save; "Mark as complete" is always there.
 */
export function useBunnyPlayer(iframe: HTMLIFrameElement | null, resumeAt: number, callbacks: PlayerCallbacks) {
  const cb = useRef(callbacks);
  cb.current = callbacks;

  useEffect(() => {
    if (!iframe) return;
    let player: PlayerJsPlayer | null = null;
    let cancelled = false;
    let last = { seconds: 0, duration: null as number | null };
    let lastSaved = -1;
    let lastSaveAt = 0;

    const save = (force = false) => {
      const s = Math.floor(last.seconds);
      if (s === lastSaved || (s < 1 && lastSaved < 0)) return;
      if (!force && Date.now() - lastSaveAt < LEARN_CONFIG.progressSaveSeconds * 1000) return;
      lastSaved = s;
      lastSaveAt = Date.now();
      cb.current.onSave(s, last.duration);
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") save(true);
    };

    loadPlayerJs()
      .then(() => {
        if (cancelled || !window.playerjs) return;
        player = new window.playerjs.Player(iframe);
        player.on("ready", () => {
          // Resume unless it's right at the start or the end.
          if (resumeAt > 5) player?.setCurrentTime(resumeAt);
          player?.on("timeupdate", (d) => {
            if (typeof d?.seconds !== "number") return;
            last = { seconds: d.seconds, duration: typeof d.duration === "number" && d.duration > 0 ? d.duration : last.duration };
            save();
          });
          player?.on("pause", () => save(true));
          player?.on("ended", () => {
            last = { ...last, seconds: last.duration ?? last.seconds };
            cb.current.onEnded(last.duration);
          });
        });
      })
      .catch(() => {
        // No player.js: playback still works.
      });

    document.addEventListener("visibilitychange", onHidden);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onHidden);
      save(true);
      for (const e of ["ready", "timeupdate", "pause", "ended"]) player?.off(e);
    };
  }, [iframe, resumeAt]);
}
