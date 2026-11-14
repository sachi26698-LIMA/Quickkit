// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import NetworkWorkspace from "../components/tools/security/network-workspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("network privacy consent", () => {
  it("sends no lookup until consent is given", async () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
    const mock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response('{"Status":0,"AD":false,"Answer":[]}', { status: 200 }),
      );
    render(<NetworkWorkspace dnssec={false} publicIp={false} />);
    fireEvent.change(screen.getByLabelText("Public domain name"), {
      target: { value: "example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Look up DNS" }));
    expect(mock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Confirm");
    fireEvent.click(screen.getByRole("checkbox", { name: /I agree/ }));
    fireEvent.click(screen.getByRole("button", { name: "Look up DNS" }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
      ).toContain("not set"),
    );
    expect(mock).toHaveBeenCalledTimes(1);
  });
});

it("requires consent before requesting an SPF record", async () => {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        Status: 0,
        Answer: [{ type: 16, TTL: 120, data: '"v=spf1 -all"' }],
      }),
    ),
  );
  render(<NetworkWorkspace dnssec={false} publicIp={false} />);
  fireEvent.change(screen.getByLabelText("Public domain name"), {
    target: { value: "example.com" },
  });
  fireEvent.change(screen.getByLabelText("Lookup mode"), {
    target: { value: "spf" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Look up DNS" }));
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox", { name: /I agree/ }));
  fireEvent.click(screen.getByRole("button", { name: "Look up DNS" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
    ).toContain("All mechanism: -all"),
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("requires explicit consent for the dual-stack IP service and clears results on reset", async () => {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
  const mock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response('{"ip":"2001:db8::1"}'));
  render(<NetworkWorkspace dnssec={false} publicIp={true} />);
  fireEvent.change(screen.getByLabelText("IP lookup mode"), {
    target: { value: "any" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Check public IP" }));
  expect(mock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox", { name: /I agree/ }));
  fireEvent.click(screen.getByRole("button", { name: "Check public IP" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
    ).toContain("IPv6"),
  );
  expect(mock.mock.calls[0][0]).toBe("https://api64.ipify.org?format=json");
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect((screen.getByLabelText("Result") as HTMLTextAreaElement).value).toBe(
    "",
  );
});

it("requires fresh explicit consent for a batch and sends both names only after approval", async () => {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify({ Status: 0, Answer: [] })));
  render(<NetworkWorkspace dnssec={false} publicIp={false} />);
  fireEvent.click(screen.getByRole("checkbox", { name: /I agree/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Batch DNS/ }));
  fireEvent.change(
    screen.getByLabelText("Public domain names (one per line)"),
    { target: { value: "example.com\nexample.org" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Look up DNS" }));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toContain("Confirm");
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I agree to send each/ }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Look up DNS" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
    ).toContain("2 sequential queries"),
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
