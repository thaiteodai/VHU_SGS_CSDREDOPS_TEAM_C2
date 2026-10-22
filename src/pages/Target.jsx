import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { track } from "../lib/analytics.js";
import { Button, ConfirmDialog, EmptyState, ErrorState, Skeleton, UndoToast } from "../components/ui.jsx";
import PanicMeter from "../components/PanicMeter.jsx";
import MemeCard from "../components/MemeCard.jsx";
import { countdown, formatDateTime, relativeTime } from "../lib/format.js";

export default function TargetPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [newStep, setNewStep] = useState("");

  const targetQ = useQuery({
    queryKey: ["target", id],
    queryFn: () => api.get(`/targets/${id}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["target", id] });
    queryClient.invalidateQueries({ queryKey: ["targets"] });
  };

  const roastMut = useMutation({
    mutationFn: () => api.post(`/targets/${id}/roasts`, {}),
    onSuccess: () => {
      invalidate();
      setToast({ message: "Roast deployed. Brutal, but fair." });
      track("roast_deployed", `/target/${id}`);
    },
    onError: (err) => setToast({ message: err.message }),
  });

  const stepMut = useMutation({
    mutationFn: ({ stepId, done }) => api.patch(`/targets/${id}/steps/${stepId}`, { done }),
    onSuccess: invalidate,
    onError: (err) => setToast({ message: err.message }),
  });

  const addStepMut = useMutation({
    mutationFn: (label) => api.post(`/targets/${id}/steps`, { label }),
    onSuccess: () => {
      setNewStep("");
      invalidate();
    },
    onError: (err) => setToast({ message: err.message }),
  });

  const inviteMut = useMutation({
    mutationFn: (email) => api.post(`/targets/${id}/buddies`, { email }),
    onSuccess: () => {
      setInviteEmail("");
      invalidate();
      setToast({ message: "Buddy invited. They will be able to roast you." });
    },
    onError: (err) => setToast({ message: err.message }),
  });

  const statusMut = useMutation({
    mutationFn: (status) => api.post(`/targets/${id}/status`, { status }),
    onSuccess: (_d, status) => {
      invalidate();
      setToast({
        message:
          status === "COMPLETED"
            ? "Done. Suspiciously fast. Are you sure?"
            : "Target reopened. The clock is running again.",
        undo: async () => {
          await api.post(`/targets/${id}/status`, { status: "OPEN" });
          invalidate();
        },
      });
    },
    onError: (err) => setToast({ message: err.message }),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.del(`/targets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      window.location.href = "/";
    },
    onError: (err) => setToast({ message: err.message }),
  });

  if (targetQ.isLoading) {
    return (
      <div className="page">
        <Skeleton lines={8} height={18} />
      </div>
    );
  }

  if (targetQ.isError) {
    return (
      <div className="page">
        <ErrorState message={targetQ.error.message} onRetry={() => targetQ.refetch()} />
      </div>
    );
  }

  const target = targetQ.data?.target;
  if (!target) return null;

  const time = countdown(target.dueAt);
  const steps = targetQ.data?.target?.steps ?? [];

  return (
    <div className="page">
      <UndoToast message={toast?.message} onUndo={toast?.undo} onDismiss={() => setToast(null)} />

      <div className="detail-head">
        <div>
          <Link to="/" className="back-link">
            ← All targets
          </Link>
          <span className={`tier-chip tier-${target.tier}`}>{target.tierLabel}</span>
          <h1>{target.title}</h1>
          <p className="target-persona">
            “{target.personalityBlurb}”
          </p>
        </div>
        <div className="detail-side">
          <span className={time.overdue ? "due overdue" : time.urgent ? "due urgent" : "due"}>
            {time.text}
          </span>
          <small>due {formatDateTime(target.dueAt)}</small>
        </div>
      </div>

      <PanicMeter
        panic={target.panic}
        tier={target.tier}
        tierColour={target.tierColour}
        tierLabel={target.tierLabel}
      />

      <div className="detail-grid">
        <section className="card panel">
          <div className="panel-head">
            <h2>Steps</h2>
            <span className="count-pill">
              {target.stepsDone}/{target.stepsTotal}
            </span>
          </div>

          {steps.length === 0 ? (
            <EmptyState
              title="No steps yet"
              message="Break it down. A target with no steps is just a wish."
            />
          ) : (
            <ul className="step-list">
              {steps.map((step) => (
                <li key={step.id}>
                  <label className="step">
                    <input
                      type="checkbox"
                      checked={step.done}
                      onChange={(e) => stepMut.mutate({ stepId: step.id, done: e.target.checked })}
                    />
                    <span className={step.done ? "step-label done" : "step-label"}>{step.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (newStep.trim()) addStepMut.mutate(newStep.trim());
            }}
          >
            <input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              placeholder="Add a step…"
              aria-label="New step"
            />
            <Button type="submit" variant="outline" loading={addStepMut.isPending}>
              Add
            </Button>
          </form>
        </section>

        <section className="card panel">
          <div className="panel-head">
            <h2>Roasts</h2>
            <span className="count-pill">{target.roastCount}</span>
          </div>

          <Button
            className="full-width"
            onClick={() => roastMut.mutate()}
            loading={roastMut.isPending}
            disabled={target.status !== "OPEN"}
          >
            Deploy a roast
          </Button>

          <div className="roast-list">
            {(targetQ.data?.target?.roasts ?? []).length === 0 ? (
              <EmptyState
                title="Silence. Suspicious."
                message="Nobody has roasted this target yet. It will not stay that way."
              />
            ) : (
              (targetQ.data?.target?.roasts ?? []).map((roast) => (
                <article className="roast" key={roast.id}>
                  <div className="roast-head">
                    <span className={`tier-chip tier-${roast.tier}`}>
                      Tier {roast.tier}
                    </span>
                    <span className="roast-author">
                      {roast.author.name} · {relativeTime(roast.createdAt)}
                    </span>
                  </div>
                  <p className="roast-body">{roast.body}</p>
                  {roast.memeTemplateId ? (
                    <MemeCard
                      templateId={roast.memeTemplateId}
                      top={roast.memeTop}
                      bottom={roast.memeBottom}
                      attribution={roast.memeAttribution}
                    />
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="card panel">
        <div className="panel-head">
          <h2>Witnesses</h2>
          <span className="count-pill">{(target.buddies ?? []).length}</span>
        </div>

        {(target.buddies ?? []).length === 0 ? (
          <EmptyState
            title="Nobody is watching"
            message="Invite a buddy. They can deploy the roast and keep you honest."
          />
        ) : (
          <ul className="buddy-list">
            {(target.buddies ?? []).map((b) => (
              <li key={b.id}>
                <span>
                  <b>{b.buddy?.name ?? b.inviteEmail}</b>
                  <small>{b.status.toLowerCase()}</small>
                </span>
              </li>
            ))}
          </ul>
        )}

        {target.isOwner ? (
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (inviteEmail.trim()) inviteMut.mutate(inviteEmail.trim());
            }}
          >
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Buddy's email"
              aria-label="Buddy email"
            />
            <Button type="submit" variant="outline" loading={inviteMut.isPending}>
              Invite
            </Button>
          </form>
        ) : null}
      </section>

      {target.isOwner ? (
        <section className="danger-zone">
          <h2>Owner controls</h2>
          <div className="danger-actions">
            {target.status === "OPEN" ? (
              <Button
                variant="outline"
                onClick={() => statusMut.mutate("COMPLETED")}
                loading={statusMut.isPending}
              >
                Mark complete
              </Button>
            ) : (
              <Button variant="outline" onClick={() => statusMut.mutate("OPEN")}>
                Reopen
              </Button>
            )}
            <Button variant="text-button" onClick={() => setConfirmDelete(true)}>
              Delete target
            </Button>
          </div>
        </section>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Delete this target?"
        message="This removes the target, its steps and every roast on it. This cannot be undone."
        confirmLabel="Delete forever"
        onConfirm={() => {
          setConfirmDelete(false);
          deleteMut.mutate();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
