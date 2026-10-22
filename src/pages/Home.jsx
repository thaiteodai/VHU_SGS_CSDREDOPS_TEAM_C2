import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { track } from "../lib/analytics.js";
import { Button, CardSkeleton, ConfirmDialog, EmptyState, ErrorState, UndoToast } from "../components/ui.jsx";
import PanicMeter from "../components/PanicMeter.jsx";
import NewTargetDialog from "../components/NewTargetDialog.jsx";
import Onboarding, { shouldShowOnboarding } from "../components/Onboarding.jsx";
import { countdown } from "../lib/format.js";

export default function HomePage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState(null);

  const targetsQ = useQuery({
    queryKey: ["targets"],
    queryFn: () => api.get("/targets"),
    enabled: Boolean(user),
  });

  const completeMut = useMutation({
    mutationFn: (id) => api.post(`/targets/${id}/status`, { status: "COMPLETED" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      setToast({
        message: "Target completed. Suspiciously fast. Are you sure?",
        undo: async () => {
          await api.post(`/targets/${id}/status`, { status: "OPEN" });
          queryClient.invalidateQueries({ queryKey: ["targets"] });
        },
      });
      track("target_completed", `/target/${id}`);
    },
    onError: (err) => setToast({ message: err.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.del(`/targets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      setToast({ message: "Target deleted. It never existed. Probably." });
    },
    onError: (err) => setToast({ message: err.message }),
  });

  const [pendingDelete, setPendingDelete] = useState(null);

  if (loading) return <div className="page-loading">Warming up the panic room…</div>;

  if (!user) return <Landing />;

  const targets = targetsQ.data?.targets ?? [];
  const showOnboarding = !targetsQ.isLoading && shouldShowOnboarding(targets.length === 0);

  return (
    <div className="page">
      <UndoToast
        message={toast?.message}
        onUndo={toast?.undo}
        onDismiss={() => setToast(null)}
      />

      <section className="hero">
        <div>
          <span className="eyebrow">
            <span aria-hidden="true" />
            DEADLINES, BUT WITH CONSEQUENCES
          </span>
          <h1>
            {greeting()}, {user.name.split(" ")[0]}.
          </h1>
          <p>
            Set a deadline. Invite a friend to hold you to it. When the clock gets
            scary, we deploy a roast. Nobody gets to move the line.
          </p>
          <div className="hero-actions">
            <Button onClick={() => setShowNew(true)}>New target</Button>
            <Link className="button outline" to="/help">
              How this works
            </Link>
          </div>
        </div>
        <div className="hero-card">
          <span className="card-kicker">YOUR RECORD</span>
          <strong>{targets.length}</strong>
          <span className="card-sub">open target{targets.length === 1 ? "" : "s"}</span>
          <div className="hero-stats">
            <span>
              <b>{targets.filter((t) => t.overdue).length}</b>
              overdue
            </span>
            <span>
              <b>{targets.filter((t) => t.tier >= 4).length}</b>
              critical
            </span>
          </div>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <span className="eyebrow">
            <span aria-hidden="true" />
            IN FLIGHT
          </span>
          <h2>Your targets</h2>
        </div>
        <span className="count-pill">{targets.length} open</span>
      </div>

      {targetsQ.isLoading ? (
        <CardSkeleton count={3} />
      ) : targetsQ.isError ? (
        <ErrorState message={targetsQ.error.message} onRetry={() => targetsQ.refetch()} />
      ) : targets.length === 0 ? (
        <EmptyState
          title="Nothing on fire. Suspicious."
          message="You have no targets yet. Create one, set a deadline, and invite someone to watch you fail."
          action={
            <Button onClick={() => setShowNew(true)}>Create your first target</Button>
          }
        />
      ) : (
        <div className="card-grid">
          {targets.map((target) => (
            <TargetCard
              key={target.id}
              target={target}
              onComplete={() => completeMut.mutate(target.id)}
              onDelete={() => setPendingDelete(target)}
            />
          ))}
        </div>
      )}

      {showNew ? (
        <NewTargetDialog
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            queryClient.invalidateQueries({ queryKey: ["targets"] });
          }}
        />
      ) : null}

      {showOnboarding ? <Onboarding onDismiss={() => setShowNew(true)} /> : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        danger
        title="Delete this target?"
        message={
          pendingDelete
            ? `“${pendingDelete.title}” and every roast on it will be removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete it"
        onConfirm={() => {
          deleteMut.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function TargetCard({ target, onComplete, onDelete }) {
  const time = countdown(target.dueAt);
  return (
    <article className="card target-card">
      <div className="target-top">
        <span className={`tier-chip tier-${target.tier}`}>{target.tierLabel}</span>
        <span className={time.overdue ? "due overdue" : time.urgent ? "due urgent" : "due"}>
          {time.text}
        </span>
      </div>

      <h3>
        <Link to={`/target/${target.id}`}>{target.title}</Link>
      </h3>
      <p className="target-persona">“{target.personalityBlurb}”</p>

      <PanicMeter
        panic={target.panic}
        tier={target.tier}
        tierColour={target.tierColour}
        tierLabel={target.tierLabel}
      />

      <div className="target-meta">
        <span>
          Steps <b>{target.stepsDone}/{target.stepsTotal}</b>
        </span>
        <span>
          Roasts <b>{target.roastCount}</b>
        </span>
        <span>
          Chaos <b>{target.chaosLevel}/5</b>
        </span>
      </div>

      <div className="target-actions">
        <Link className="button dark" to={`/target/${target.id}`}>
          Open
        </Link>
        {target.isOwner ? (
          <>
            <Button variant="outline" onClick={onComplete}>
              Done
            </Button>
            <Button variant="text-button" onClick={onDelete}>
              Delete
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function Landing() {
  return (
    <div className="page">
      <section className="hero landing">
        <div>
          <span className="eyebrow">
            <span aria-hidden="true" />
            ABSURDLY ACCOUNTABLE DEADLINES
          </span>
          <h1>
            A fair place
            <br />
            in every queue.
          </h1>
          <p>
            Panic Plan turns a deadline into a public commitment. Your friends
            hold you to it, the clock escalates, and the roast arrives right on
            schedule.
          </p>
          <div className="hero-actions">
            <Link className="button dark" to="/register">
              Create your first target
            </Link>
            <Link className="button outline" to="/login">
              Sign in
            </Link>
          </div>
        </div>
        <div className="hero-card demo-card">
          <span className="card-kicker">THE ESCALATION</span>
          <ol className="tier-list">
            <li>
              <b>Polite</b> — “just a friendly heads-up”
            </li>
            <li>
              <b>Passive-aggressive</b> — “I looked it up so you don&apos;t have to”
            </li>
            <li>
              <b>Legal</b> — “I have started a formal record of this”
            </li>
            <li>
              <b>Desperate</b> — “I am using your full name”
            </li>
            <li>
              <b>Cosmic</b> — “I have taken up a new hobby of disappointment”
            </li>
          </ol>
        </div>
      </section>

      <section className="feature-row">
        <article className="card">
          <span className="eyebrow">
            <span aria-hidden="true" />
            STEP 1
          </span>
          <h3>Set the deadline</h3>
          <p>A title, a date, and how much chaos you want. Pick your own doom.</p>
        </article>
        <article className="card">
          <span className="eyebrow">
            <span aria-hidden="true" />
            STEP 2
          </span>
          <h3>Invite a witness</h3>
          <p>A buddy can deploy the roast and watch the panic meter climb.</p>
        </article>
        <article className="card">
          <span className="eyebrow">
            <span aria-hidden="true" />
            STEP 3
          </span>
          <h3>Survive the timer</h3>
          <p>Finish it and take the victory lap. Or don&apos;t. The log remembers.</p>
        </article>
      </section>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still awake";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
