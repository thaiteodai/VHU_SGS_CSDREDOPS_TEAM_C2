import React, { useEffect, useRef } from "react";

export function Button({ children, variant = "dark", loading = false, className = "", ...props }) {
  return (
    <button
      className={`button ${variant} ${className}`}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Card({ children, className = "" }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Eyebrow({ children, tone }) {
  return (
    <span className={`eyebrow${tone ? ` eyebrow-${tone}` : ""}`}>
      <span aria-hidden="true" />
      {children}
    </span>
  );
}

/** Empty state - always says what to do next. */
export function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-face" aria-hidden="true">
        ¯\_(ツ)_/¯
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

/** Error state with a retry affordance. */
export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <div>
        <strong>Something went sideways.</strong>
        <p>{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Skeleton loader for slow panels. */
export function Skeleton({ lines = 3, height = 16 }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton-line" style={{ height }} />
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="card-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="card skeleton-card" key={i}>
          <Skeleton lines={4} height={12} />
        </div>
      ))}
    </div>
  );
}

/**
 * Confirmation dialog for destructive actions.
 * Traps focus, closes on Escape, restores focus on unmount.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    const node = ref.current;
    const focusable = node?.querySelectorAll(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.[0]?.focus();

    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel?.();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = node.querySelectorAll(
        "button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" ref={ref}>
        <h3 id="confirm-title">{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <Button variant="quiet" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "dark"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Toast with an optional Undo action. Used after destructive operations so
 * the user can back them out within a grace period.
 */
export function UndoToast({ message, undoLabel = "Undo", onUndo, onDismiss, duration = 6000 }) {
  const timer = useRef(null);

  useEffect(() => {
    if (!message) return undefined;
    timer.current = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(timer.current);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <span>{message}</span>
      {onUndo ? (
        <button
          className="undo-button"
          onClick={() => {
            clearTimeout(timer.current);
            onUndo();
          }}
        >
          {undoLabel}
        </button>
      ) : null}
      <button className="toast-close" aria-label="Dismiss" onClick={() => onDismiss?.()}>
        ×
      </button>
    </div>
  );
}

/** Inline field error, wired to the input with aria-describedby. */
export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <span className="field-error" id={id} role="alert">
      {children}
    </span>
  );
}

export function Spinner({ label = "Loading" }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
