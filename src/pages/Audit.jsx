import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, Skeleton } from "../components/ui.jsx";
import { relativeTime } from "../lib/format.js";

/**
 * The public transparency log. Every meaningful action is recorded, so
 * members can see what happened and who did it.
 */
export default function AuditPage() {
  const { user } = useAuth();

  const auditQ = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.get("/audit"),
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <div className="page">
        <EmptyState
          title="Sign in to see the log"
          message="The transparency log is for members only."
          action={
            <Link className="button dark" to="/login">
              Sign in
            </Link>
          }
        />
      </div>
    );
  }

  const events = auditQ.data?.events ?? [];

  return (
    <div className="page">
      <span className="eyebrow">
        <span aria-hidden="true" />
        TRANSPARENT BY DEFAULT
      </span>
      <h1>Public log</h1>
      <p className="page-sub">
        Everything that happens on Panic Plan, newest first. No exceptions, no
        quiet deletions.
      </p>

      {auditQ.isLoading ? (
        <Skeleton lines={8} />
      ) : auditQ.isError ? (
        <ErrorState message={auditQ.error.message} onRetry={() => auditQ.refetch()} />
      ) : events.length === 0 ? (
        <EmptyState title="Nothing yet" message="Actions will show up here as people use the app." />
      ) : (
        <ol className="log-list">
          {events.map((event) => (
            <li key={event.id}>
              <span className="log-dot" aria-hidden="true" />
              <div>
                <strong>{event.action}</strong>
                <p>{event.reason}</p>
              </div>
              <span className="log-actor">
                {event.actorName}
                <small>{relativeTime(event.createdAt)}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
