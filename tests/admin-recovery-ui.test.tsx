// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import RecoveryForm from "@/components/admin/recovery-form";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("administrator recovery form", () => {
  it("shows a resend form when no valid recovery session exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ valid: false }) }),
    );
    render(<RecoveryForm />);
    expect(
      await screen.findByRole("button", { name: "Send recovery email" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Missing, expired, reused or invalid links/),
    ).toBeTruthy();
  });
  it("checks mismatches, submits matching passwords and provides login link", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetcher);
    render(<RecoveryForm />);
    const button = await screen.findByRole("button", {
      name: "Update password",
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "ExamplePassword123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "OtherPassword123" },
    });
    fireEvent.click(button);
    expect(screen.getByText("Passwords do not match.")).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "ExamplePassword123" },
    });
    fireEvent.click(button);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText(/Your password has been updated/),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Back to administrator sign in/ })
        .getAttribute("href"),
    ).toBe("/admin/login");
  });
});
