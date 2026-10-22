import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { Button, FieldError } from "./ui.jsx";
import { targetSchema, fieldErrors } from "../lib/validation.js";

const CHAOS = [
  { level: 1, label: "Gentle", blurb: "Encouraging. Barely a roast." },
  { level: 2, label: "Playful", blurb: "Light ribbing. Mostly." },
  { level: 3, label: "Standard", blurb: "The house default. Says things." },
  { level: 4, label: "Pointed", blurb: "Names will be used." },
  { level: 5, label: "Merciless", blurb: "Bring a friend. You will need one." },
];

function defaultDue() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(17, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export default function NewTargetDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueAt: defaultDue(),
    chaosLevel: 3,
    personality: "OVERCONFIDENT_OPTIMIST",
  });
  const [errors, setErrors] = useState({});

  const personalitiesQ = useQuery({
    queryKey: ["personalities"],
    queryFn: () => api.get("/targets/personalities"),
  });

  const createMut = useMutation({
    mutationFn: (body) => api.post("/targets", body),
    onSuccess: onCreated,
    onError: (err) => setErrors(err.fields ?? { title: err.message }),
  });

  function submit(event) {
    event.preventDefault();
    const parsed = targetSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    createMut.mutate({
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueAt: new Date(parsed.data.dueAt).toISOString(),
      chaosLevel: parsed.data.chaosLevel,
      personality: parsed.data.personality,
    });
  }

  const personalities = personalitiesQ.data?.personalities ?? [];

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-target-title"
      >
        <h3 id="new-target-title">New target</h3>
        <p className="modal-sub">Pick a deadline and an attitude. Both are binding.</p>

        <form onSubmit={submit} className="stacked-form">
          <label className="field">
            <span>What is it?</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Submit the thesis chapter"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "err-title" : undefined}
              autoFocus
            />
            <FieldError id="err-title">{errors.title}</FieldError>
          </label>

          <label className="field">
            <span>Deadline</span>
            <input
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              aria-invalid={Boolean(errors.dueAt)}
              aria-describedby={errors.dueAt ? "err-due" : undefined}
            />
            <FieldError id="err-due">{errors.dueAt}</FieldError>
          </label>

          <fieldset className="field">
            <legend>Chaos level</legend>
            <div className="chaos-grid" role="radiogroup" aria-label="Chaos level">
              {CHAOS.map((c) => (
                <button
                  type="button"
                  key={c.level}
                  role="radio"
                  aria-checked={form.chaosLevel === c.level}
                  className={`chaos-option${form.chaosLevel === c.level ? " selected" : ""}`}
                  onClick={() => setForm({ ...form, chaosLevel: c.level })}
                >
                  <b>
                    {c.level}. {c.label}
                  </b>
                  <small>{c.blurb}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend>Deadline personality</legend>
            {personalitiesQ.isLoading ? (
              <p className="muted">Loading personalities…</p>
            ) : (
              <div className="personality-grid" role="radiogroup" aria-label="Deadline personality">
                {personalities.map((p) => (
                  <button
                    type="button"
                    key={p.key}
                    role="radio"
                    aria-checked={form.personality === p.key}
                    className={`personality-option${form.personality === p.key ? " selected" : ""}`}
                    onClick={() => setForm({ ...form, personality: p.key })}
                  >
                    <b>{p.label}</b>
                    <small>{p.blurb}</small>
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <label className="field">
            <span>Notes (optional)</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Any context your future self will ignore."
              rows={2}
            />
          </label>

          {errors.title && !form.title ? null : null}

          <div className="modal-actions">
            <Button variant="quiet" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createMut.isPending}>
              Create target
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
