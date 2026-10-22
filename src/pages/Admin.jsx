import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { EmptyState, ErrorState, Skeleton } from "../components/ui.jsx";
import { formatDateTime } from "../lib/format.js";

export default function AdminPage() {
  const queryClient = useQueryClient();

  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: () => api.get("/users") });
  const feedbackQ = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: () => api.get("/users/feedback/inbox"),
  });
  const statsQ = useQuery({ queryKey: ["audit-stats"], queryFn: () => api.get("/audit/stats") });

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const stats = statsQ.data?.stats;

  return (
    <div className="page">
      <span className="eyebrow">
        <span aria-hidden="true" />
        ADMIN
      </span>
      <h1>Control room</h1>

      {stats ? (
        <div className="stat-row">
          <div className="card stat">
            <b>{stats.members}</b>
            <span>members</span>
          </div>
          <div className="card stat">
            <b>{stats.targets}</b>
            <span>targets</span>
          </div>
          <div className="card stat">
            <b>{stats.roasts}</b>
            <span>roasts</span>
          </div>
          <div className="card stat">
            <b>{stats.overdue}</b>
            <span>overdue</span>
          </div>
        </div>
      ) : null}

      <section className="card panel">
        <h2>Members</h2>
        {usersQ.isLoading ? (
          <Skeleton lines={5} />
        ) : usersQ.isError ? (
          <ErrorState message={usersQ.error.message} onRetry={() => usersQ.refetch()} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Joined</th>
                <th scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              {usersQ.data.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{formatDateTime(u.createdAt)}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => roleMut.mutate({ id: u.id, role: e.target.value })}
                      aria-label={`Role for ${u.name}`}
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="MODERATOR">MODERATOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card panel">
        <h2>Feedback</h2>
        {feedbackQ.isLoading ? (
          <Skeleton lines={3} />
        ) : (feedbackQ.data?.feedback ?? []).length === 0 ? (
          <EmptyState title="No feedback yet" message="Members have not written in. Give it time." />
        ) : (
          <ul className="feedback-list">
            {feedbackQ.data.feedback.map((f) => (
              <li key={f.id}>
                <p>{f.message}</p>
                <small>
                  {f.user?.name ?? "anonymous"} · {formatDateTime(f.createdAt)}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
