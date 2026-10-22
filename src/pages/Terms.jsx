import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <div className="page narrow prose">
      <span className="eyebrow">
        <span aria-hidden="true" />
        LEGAL
      </span>
      <h1>Terms of service</h1>

      <h2>What Panic Plan is</h2>
      <p>
        A tool for holding yourself to deadlines, with help from your friends and
        a lot of jokes. That is the whole product.
      </p>

      <h2>Your account</h2>
      <p>
        You are responsible for what happens under your account, including the
        roasts your buddies deploy on you and the targets you put their names
        on. Keep your password to yourself.
      </p>

      <h2>Being reasonable</h2>
      <p>
        The roasts are meant to be funny, not cruel. Harassment, targeted abuse
        or posting anything illegal through Panic Plan gets your account
        suspended and your roasts hidden by a moderator. You can report
        something through the <Link to="/feedback">feedback form</Link>.
      </p>

      <h2>Your content</h2>
      <p>
        You keep ownership of the targets, notes and steps you write. You give
        us permission to store and show them to the buddies you invite. You can
        export or delete everything at any time from Settings.
      </p>

      <h2>No guarantees</h2>
      <p>
        This is a project built for a hackathon. It comes with no warranty. We
        aim for it to work, we cannot promise it always will.
      </p>

      <h2>Ending things</h2>
      <p>
        You can delete your account whenever you want, from Settings. We can
        suspend accounts that break these terms.
      </p>

      <h2>Changes</h2>
      <p>
        If we change these terms in a way that matters, the date at the top of
        the <Link to="/privacy">privacy policy</Link> changes too.
      </p>
    </div>
  );
}
