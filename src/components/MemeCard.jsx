import React, { useState } from "react";

/**
 * Meme card. The image is rendered server-side and proxied through
 * /api/memes/render, so the browser never talks to a third party. If the
 * meme service is unreachable we fall back to a pure-CSS text card rather
 * than showing a broken image.
 */
export default function MemeCard({ templateId, top, bottom, attribution, alt }) {
  const [failed, setFailed] = useState(false);

  if (!templateId || failed) {
    return (
      <figure className="meme meme-fallback">
        <div className="meme-fallback-body">
          <span className="meme-top">{top}</span>
          <span className="meme-divider" aria-hidden="true" />
          <span className="meme-bottom">{bottom}</span>
        </div>
        {attribution ? <figcaption className="meme-attribution">{attribution}</figcaption> : null}
      </figure>
    );
  }

  const params = new URLSearchParams({ template: templateId, top: top ?? "", bottom: bottom ?? "" });

  return (
    <figure className="meme">
      <img
        src={`/api/memes/render?${params.toString()}`}
        alt={alt || `Meme: ${top} / ${bottom}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
      {attribution ? <figcaption className="meme-attribution">{attribution}</figcaption> : null}
    </figure>
  );
}
