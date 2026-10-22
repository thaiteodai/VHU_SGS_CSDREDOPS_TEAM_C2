import React from "react";
import { panicLabel } from "../lib/format.js";

/**
 * The panic meter: how far through the deadline window we are, coloured by
 * the roast tier so the danger is readable at a glance without relying on
 * colour alone (the label carries the same information).
 */
export default function PanicMeter({ panic, tier, tierColour, tierLabel }) {
  const label = panicLabel(panic, tier);
  return (
    <div className="panic-meter">
      <div className="panic-track">
        <div
          className="panic-fill"
          style={{ width: `${Math.max(3, Math.min(100, panic))}%`, background: tierColour }}
          role="progressbar"
          aria-valuenow={panic}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Time elapsed: ${panic} percent. Status: ${label}`}
        />
      </div>
      <span className="panic-label" style={{ color: tierColour }}>
        {label}
        <small>{tierLabel}</small>
      </span>
    </div>
  );
}
