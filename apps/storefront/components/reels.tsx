import type { Reel } from "@/lib/content";

/**
 * Instagram Reels on a PDP.
 *
 * Linked, not embedded: an Instagram iframe pulls in a large third-party
 * bundle and would wreck the LCP budget on a phone. A cover image linking out
 * costs nothing and gets the customer to the same place.
 *
 * The service only ever returns Reels that are published AND rights-granted.
 */
export function Reels({ reels }: { reels: Reel[] }) {
  if (reels.length === 0) return null;

  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>Seen on Instagram</h2>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
        {reels.map((reel) => (
          <a
            key={reel.id}
            href={reel.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: "0 0 150px" }}
          >
            <div
              className="card__media"
              style={{ aspectRatio: "9 / 16", display: "grid", placeItems: "center" }}
            >
              {reel.cover_image_url ? (
                // Covers are arbitrary remote URLs, so a plain img avoids
                // next/image's host allowlist rejecting them at runtime.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={reel.cover_image_url}
                  alt={reel.caption ?? "Instagram reel"}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span className="small muted">▶ Watch</span>
              )}
            </div>
            {reel.caption ? (
              <p className="small muted" style={{ marginTop: 6 }}>
                {reel.caption}
              </p>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}
