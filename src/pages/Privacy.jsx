import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <div className="page narrow prose">
      <span className="eyebrow">
        <span aria-hidden="true" />
        LEGAL
      </span>
      <h1>Privacy policy</h1>
      <p className="page-sub">Last updated when this page was written. Short version below, long version never.</p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Your account:</b> display name, email address, password hash (if
          you set a password), and your role.
        </li>
        <li>
          <b>Your targets:</b> titles, notes, deadlines, steps, and the roasts
          people deploy on them.
        </li>
        <li>
          <b>Session data:</b> hashed refresh tokens so we can sign you out and
          revoke access, plus basic request logs (IP, user agent) for security.
        </li>
        <li>
          <b>Analytics:</b> first-party page events stored in our own
          database. No third-party trackers, no advertising pixels.
        </li>
      </ul>

      <h2>What we do not collect</h2>
      <p>
        No location, no contacts, no advertising identifiers, no third-party
        analytics scripts. We do not sell data. We do not share it outside
        Panic Plan except to process sign-in through TideCloak.
      </p>

      <h2>Who can see your targets</h2>
      <p>
        You, and the buddies you explicitly invited. Enforced on the server, not
        in the browser. Buddies see the target, its steps, and its roasts.
        Nothing else.
      </p>

      <h2>The Wall of Shame</h2>
      <p>
        Off by default. Your overdue targets appear publicly only if you opt
        in. Turn it off in Settings and they disappear.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <b>Export:</b> download everything we hold as JSON from{" "}
          <Link to="/settings">Settings</Link>.
        </li>
        <li>
          <b>Delete:</b> request erasure from Settings. Your identifiers are
          scrubbed immediately and your sessions are revoked.
        </li>
        <li>
          <b>Correct:</b> change your name and privacy choices at any time.
        </li>
      </ul>

      <h2>How long we keep things</h2>
      <p>
        Until you delete your account. Audit entries keep a record of what
        happened but are stripped of identifiers on deletion.
      </p>

      <h2>Cookies</h2>
      <p>
        One httpOnly session cookie so we can keep you signed in. No tracking
        cookies, no third-party cookies.
      </p>

      <h2>Contact</h2>
      <p>
        Use the <Link to="/feedback">feedback form</Link> for anything
        privacy-related. It reaches the same people who built this.
      </p>
    </div>
  );
}
