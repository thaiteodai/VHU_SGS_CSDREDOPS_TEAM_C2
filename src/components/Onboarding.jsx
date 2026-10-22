import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui.jsx";

const KEY = "panicplan:onboarded";

/**
 * First-run onboarding. Shown once to a new member who has no targets yet.
 * Dismissal is remembered locally; the "How this works" page is always
 * available from the nav for anyone who wants it again.
 */
export default function Onboarding({ onDismiss }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Panic Plan",
      body: "A deadline is a wish. A deadline with a witness is a commitment. We are the witnesses.",
      art: "¯\\_(ツ)_/¯",
    },
    {
      title: "Pick a target",
      body: "Something you promised yourself. A title, a deadline, and how much chaos you want. Nobody can move the date but you.",
      art: "📅",
    },
    {
      title: "Invite a witness",
      body: "A buddy can see the target and deploy the roast. The closer the deadline gets, the more creative they get.",
      art: "🔥",
    },
    {
      title: "Survive the clock",
      body: "Finish it and take the victory lap. Miss it and the Wall of Shame gets to know about it — if you let it.",
      art: "🏆",
    },
  ];

  function finish() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* private browsing, no big deal */
    }
    onDismiss?.();
  }

  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && finish()}>
      <div
        className="modal modal-wide onboarding"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <span className="onboarding-step">
          Step {step + 1} of {steps.length}
        </span>
        <div className="onboarding-art" aria-hidden="true">
          {current.art}
        </div>
        <h3 id="onboarding-title">{current.title}</h3>
        <p>{current.body}</p>

        <div className="onboarding-dots" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={i === step ? "dot active" : "dot"} />
          ))}
        </div>

        <div className="modal-actions">
          <Link className="button quiet" to="/help" onClick={finish}>
            Full help
          </Link>
          <Button variant="quiet" onClick={finish}>
            Skip
          </Button>
          {last ? (
            <Button onClick={finish}>Start now</Button>
          ) : (
            <Button onClick={() => setStep(step + 1)}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** True when this member has not seen the onboarding. */
export function shouldShowOnboarding(hasTargets) {
  if (hasTargets) return false;
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return false;
  }
}
