import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState, ErrorState, ConfirmDialog, UndoToast, FieldError } from "../components/ui.jsx";

describe("EmptyState", () => {
  it("shows the title, the message and the action", () => {
    render(<EmptyState title="Nothing here" message="Try later" action={<button>Act</button>} />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Try later")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Act" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("announces the error and offers a retry", async () => {
    let retried = false;
    render(<ErrorState message="It broke" onRetry={() => { retried = true; }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("It broke");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retried).toBe(true);
  });
});

describe("ConfirmDialog", () => {
  it("renders as a modal dialog with both actions", async () => {
    let confirmed = false;
    let cancelled = false;
    render(
      <ConfirmDialog
        open
        title="Delete it?"
        message="Gone forever"
        onConfirm={() => { confirmed = true; }}
        onCancel={() => { cancelled = true; }}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Delete it?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(confirmed).toBe(true);
    expect(cancelled).toBe(false);
  });

  it("cancels on Escape", async () => {
    let cancelled = false;
    render(
      <ConfirmDialog open title="Delete it?" message="Gone" onConfirm={() => {}} onCancel={() => { cancelled = true; }} />,
    );
    await userEvent.keyboard("{Escape}");
    expect(cancelled).toBe(true);
  });

  it("renders nothing when closed", () => {
    render(<ConfirmDialog open={false} title="Hidden" message="x" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("UndoToast", () => {
  it("exposes an undo action and announces itself politely", async () => {
    let undone = false;
    render(<UndoToast message="Deleted" onUndo={() => { undone = true; }} onDismiss={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Deleted");
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(undone).toBe(true);
  });
});

describe("FieldError", () => {
  it("renders nothing without a message", () => {
    const { container } = render(<FieldError id="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an alert with the message", () => {
    render(<FieldError id="x">Required</FieldError>);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
});
