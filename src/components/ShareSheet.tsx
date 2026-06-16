import { useEffect, useRef, useState } from "react";
import { renderShareCard, ShareTheme } from "../lib/shareCard";

interface Props {
  /** id of the <h2> below, for the Sheet's aria-labelledby. */
  titleId: string;
  /** The verse or quote, verbatim. */
  text: string;
  /** The gold line: a citation or an author. */
  citation: string;
  /** Optional muted line: a translation name, or work · locus. */
  source?: string;
  /** Base name for the downloaded / shared file (no extension). */
  filename: string;
}

/** The app theme App writes to <html data-theme>, narrowed to the two card styles. */
function currentTheme(): ShareTheme {
  return document.documentElement.getAttribute("data-theme") === "night" ? "night" : "day";
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Design spec §8.3 — the share card's sheet. A live canvas preview, a Day/Night
 * style toggle (two options only, per the spec), and the two ways out: the native
 * share sheet via the Web Share API (which carries the PNG on iOS and in
 * Capacitor) and a plain image download when sharing files isn't supported. The
 * card itself is drawn by `renderShareCard`; this is only the chrome around it.
 */
export default function ShareSheet({ titleId, text, citation, source, filename }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<ShareTheme>(currentTheme);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderShareCard(canvas, { text, citation, source, theme }).catch(() => {
      setStatus("Couldn't render the card.");
    });
  }, [text, citation, source, theme]);

  async function onShare(): Promise<void> {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    setStatus("");
    try {
      const blob = await toBlob(canvas);
      if (!blob) return;
      const file = new File([blob], `${filename}.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
        share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        try {
          await nav.share({ files: [file], title: "Fidelis", text: citation });
        } catch {
          // the user dismissed the share sheet — nothing to report
        }
      } else {
        download(blob, filename);
        setStatus("Saved the image — sharing isn't available here.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSave(): Promise<void> {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const blob = await toBlob(canvas);
      if (blob) {
        download(blob, filename);
        setStatus("Saved.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="share-sheet">
      <h2 id={titleId}>Share</h2>
      <canvas
        ref={canvasRef}
        className="share-canvas"
        role="img"
        aria-label={`Share card: ${citation}`}
      />
      <div className="share-styles" role="group" aria-label="Card style">
        <button
          type="button"
          className={theme === "day" ? "pill active" : "pill"}
          aria-pressed={theme === "day"}
          onClick={() => setTheme("day")}
        >
          Day
        </button>
        <button
          type="button"
          className={theme === "night" ? "pill active" : "pill"}
          aria-pressed={theme === "night"}
          onClick={() => setTheme("night")}
        >
          Night
        </button>
      </div>
      <div className="share-actions">
        <button
          type="button"
          className="continue-cta"
          disabled={busy}
          onClick={() => {
            void onShare();
          }}
        >
          Share
        </button>
        <button
          type="button"
          className="icon-btn"
          disabled={busy}
          onClick={() => {
            void onSave();
          }}
        >
          Save image
        </button>
      </div>
      <p className="share-note muted small sans">
        {status || "Scripture goes out; nothing comes back."}
      </p>
    </div>
  );
}
