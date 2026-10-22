import { Link } from "react-router-dom";

export default function HelpPage() {
  return (
    <div className="page narrow prose">
      <span className="eyebrow">
        <span aria-hidden="true" />
        HELP
      </span>
      <h1>How Panic Plan works</h1>

      <h2>Getting started</h2>
      <ol>
        <li>
          <b>Create a target.</b> A title, a deadline, and how much chaos you
          want. The deadline is binding — nobody can move it except you.
        </li>
        <li>
          <b>Break it into steps.</b> A target with no steps is a wish. Steps
          are how you prove it happened.
        </li>
        <li>
          <b>Invite a buddy.</b> They can see the target and deploy roasts.
          You can roast their targets too.
        </li>
        <li>
          <b>Survive the clock.</b> As the deadline nears, the roast tier
          escalates on its own.
        </li>
      </ol>

      <h2>The escalation</h2>
      <p>
        The tier is derived from how close the deadline is, not from randomness.
        Your chaos level shifts it by one in either direction.
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Tier</th>
            <th scope="col">When</th>
            <th scope="col">Vibe</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1 · Polite</td>
            <td>More than 7 days out</td>
            <td>Friendly heads-up</td>
          </tr>
          <tr>
            <td>2 · Passive-aggressive</td>
            <td>3 to 7 days out</td>
            <td>Just checking in, no rush</td>
          </tr>
          <tr>
            <td>3 · Legal</td>
            <td>1 to 3 days out</td>
            <td>A formal record is being kept</td>
          </tr>
          <tr>
            <td>4 · Desperate</td>
            <td>Less than a day</td>
            <td>Full name energy</td>
          </tr>
          <tr>
            <td>5 · Cosmic</td>
            <td>Overdue</td>
            <td>Grief and disappointment</td>
          </tr>
        </tbody>
      </table>

      <h2>Accountability buddies</h2>
      <p>
        A buddy can only see targets they were invited to. Strangers get nothing
        — the server rejects the request before it reaches the data.
      </p>

      <h2>The Wall of Shame</h2>
      <p>
        Opt-in. Your overdue targets only appear if you tick the box in
        Settings. Untick it any time and they vanish on the next page load.
      </p>

      <h2>Signing in with TideCloak</h2>
      <p>
        We use a hybrid setup: your browser never holds a TideCloak token. The
        code goes straight to our server, which exchanges it and gives you a
        session cookie. If you already have a Panic Plan account with the same
        email, the two accounts are linked automatically.
      </p>

      <h2>Something broken?</h2>
      <p>
        Tell us via the <Link to="/feedback">feedback form</Link>. We read every
        word, most of it.
      </p>
    </div>
  );
}
