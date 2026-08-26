"use client";
import { useEffect, useState } from "react";

export type PlateState = "covered" | "lit" | "unlit";

interface PortraitPlateProps {
  state: PlateState;
  imageUrl?: string;
  answer?: string;
  className?: string;
}

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x500.png?text=No+Portrait+Available';

export default function PortraitPlate({
  state,
  imageUrl,
  answer,
  className = ""
}: PortraitPlateProps) {
  const covered = state === "covered";

  // Hold the scrim closed for a beat after the game resolves, so the uncovering
  // reads as its own moment rather than arriving with the rest of the layout.
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (covered) {
      setDrawn(false);
      return;
    }
    const timer = setTimeout(() => setDrawn(true), 260);
    return () => clearTimeout(timer);
  }, [covered]);

  return (
    <figure className={`m-0 flex flex-col items-center gap-5 ${className}`}>
      <div
        className="relative w-full max-w-[17rem] aspect-[4/5] overflow-hidden
                   border border-rule bg-wall shadow-plate"
      >
        {/* The portrait. The API only returns image_url once the puzzle is
            resolved, so during play this is an empty frame under the scrim. */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={answer ? `Portrait of ${answer}` : "Portrait of the day's figure"}
            className={`absolute inset-0 h-full w-full object-cover transition-[filter] duration-slow
              ${state === "unlit" ? "saturate-[0.25] brightness-[0.94]" : ""}`}
            loading="eager"
            crossOrigin="anonymous"
            width="400"
            height="500"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (img.src !== PLACEHOLDER_IMAGE) {
                img.src = PLACEHOLDER_IMAGE;
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-placard" />
        )}

        {/* Gallery light. Warm, directional, from the top left. Wins only. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-slow
            bg-[radial-gradient(72%_58%_at_28%_8%,rgb(var(--accent)/0.32),transparent_74%)]
            ${state === "lit" && drawn ? "opacity-100" : "opacity-0"}`}
        />

        {/* The scrim. Draws back on resolve, whichever way the game went. */}
        <div
          aria-hidden="true"
          className={`scrim absolute inset-0 grid place-items-center origin-top
                      transition-transform duration-curtain ease-smooth
                      ${drawn ? "-translate-y-full" : "translate-y-0"}`}
        >
          <span className="label">Covered</span>
        </div>
      </div>

      {/* The reveal. The one place EB Garamond appears. */}
      {!covered && answer && (
        <figcaption className="animate-entry-in text-center font-display text-2xl font-medium">
          {answer}
        </figcaption>
      )}
    </figure>
  );
}
