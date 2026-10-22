import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { EmptyState, ErrorState, Skeleton } from "../components/ui.jsx";
import { formatDate } from "../lib/format.js";

export default function ShamePage() {
  const { user } = useAuth();

  const shameQ = useQuery({
    queryKey: ["shame"],
    queryFn: () => api.get("/shame"),
    enabled: Boolean(user),
  });

  return (
    <div className="page">
      <span className="eyebrow">
        <span aria-hidden="true" />
        THE WALL OF SHAME
      </span>
      <h1>Missed deadlines, publicly</h1>
      <p className="page-sub">
        Opt-in only. Nobody appears here unless they chose to. Tap out any time
        in Settings.
      </p>

      {!user ? (
        <EmptyState
          title="Sign in to see the wall"
          message="The wall is for members only. Sign in and see who is currently failing."
          action={
            <Link className="button dark" to="/login">
              Sign in
            </Link>
          }
        />
      ) : shameQ.isLoading ? (
        <Skeleton lines={6} />
      ) : shameQ.isError ? (
        <ErrorState message={shameQ.error.message} onRetry={() => shameQ.refetch()} />
      ) : (shameQ.data?.entries ?? []).length === 0 ? (
        <EmptyState
          title="The wall is empty"
          message="Nobody has blown a deadline recently. Suspiciously disciplined."
        />
      ) : (
        <div className="shame-list">
          {shameQ.data.entries.map((entry) => (
            <article className="card shame-card" key={entry.id}>
              <span className={`shame-badge shame-${entry.shame.toLowerCase().replace(" ", "-")}`}>
                {entry.shame}
              </span>
              <div>
                <h3>
                  <Link to={`/target/${entry.id}`}>{entry.title}</Link>
                </h3>
                <p className="shame-meta">
                  {entry.owner} · due {formatDate(entry.dueAt)} ·{" "}
                  {entry.daysLate > 0 ? `${entry.daysLate} days late` : "due today"}
                </p>
                <p className="shame-persona">“{entry.personalityLabel}”</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
