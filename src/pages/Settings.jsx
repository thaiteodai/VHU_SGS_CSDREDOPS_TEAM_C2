import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { Button, ConfirmDialog, FieldError, Skeleton, UndoToast } from "../components/ui.jsx";

export default function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [showOnWall, setShowOnWall] = useState(user?.showOnWall ?? false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState("");

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => api.get("/users/me") });

  const profileMut = useMutation({
    mutationFn: (body) => api.patch("/users/me", body),
    onSuccess: (data) => {
      setUser(data.user);
      setToast({ message: "Saved." });
    },
    onError: (err) => setToast({ message: err.message }),
  });

  const passwordMut = useMutation({
    mutationFn: (body) => api.post("/users/me/password", body),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setPwError("");
      setToast({ message: "Password changed." });
    },
    onError: (err) => setPwError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.del("/users/me"),
    onSuccess: async () => {
      await logout();
      navigate("/");
    },
    onError: (err) => setToast({ message: err.message }),
  });

  async function exportData() {
    const res = await fetch("/api/users/me/export", { credentials: "include" });
    if (!res.ok) {
      setToast({ message: "Export failed. Try again in a moment." });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `panicplan-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast({ message: "Export downloaded. It contains everything we hold about you." });
  }

  const me = meQ.data?.user;

  return (
    <div className="page narrow">
      <UndoToast message={toast?.message} onDismiss={() => setToast(null)} />

      <span className="eyebrow">
        <span aria-hidden="true" />
        SETTINGS
      </span>
      <h1>Your account</h1>

      <section className="card panel">
        <h2>Profile</h2>
        <form
          className="stacked-form"
          onSubmit={(e) => {
            e.preventDefault();
            profileMut.mutate({ name, showOnWall });
          }}
        >
          <label className="field">
            <span>Display name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={showOnWall}
              onChange={(e) => setShowOnWall(e.target.checked)}
            />
            Show my overdue targets on the Wall of Shame
          </label>
          <Button type="submit" loading={profileMut.isPending}>
            Save changes
          </Button>
        </form>
      </section>

      <section className="card panel">
        <h2>Password</h2>
        {meQ.isLoading ? (
          <Skeleton lines={3} />
        ) : me?.hasPassword ? (
          <form
            className="stacked-form"
            onSubmit={(e) => {
              e.preventDefault();
              passwordMut.mutate({ currentPassword, newPassword });
            }}
          >
            <label className="field">
              <span>Current password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-invalid={Boolean(pwError)}
                aria-describedby={pwError ? "err-pw" : undefined}
              />
              <FieldError id="err-pw">{pwError}</FieldError>
            </label>
            <Button type="submit" variant="outline" loading={passwordMut.isPending}>
              Change password
            </Button>
          </form>
        ) : (
          <p className="muted">
            You sign in with TideCloak, so there is no password to change.{" "}
            {me?.linkedToTidecloak ? "This account is linked to TideCloak." : ""}
          </p>
        )}
      </section>

      <section className="card panel">
        <h2>Your data</h2>
        <p className="muted">
          Export everything we hold, or delete your account entirely. Deletion
          scrubs your identifiers immediately.
        </p>
        <div className="danger-actions">
          <Button variant="outline" onClick={exportData}>
            Export my data
          </Button>
          <Button variant="text-button" onClick={() => setConfirmDelete(true)}>
            Delete my account
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Delete your account?"
        message="Your targets, steps and roasts are removed and your email is scrubbed. This cannot be undone."
        confirmLabel="Delete my account"
        onConfirm={() => {
          setConfirmDelete(false);
          deleteMut.mutate();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
