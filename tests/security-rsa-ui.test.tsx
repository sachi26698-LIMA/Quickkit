// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import RsaWorkspace from "../components/tools/security/rsa-workspace";
afterEach(cleanup);
it("switches operations, protects private inputs and resets safely", async () => {
  render(<RsaWorkspace />);
  expect(screen.getByText(/unencrypted/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Operation"), {
    target: { value: "decrypt" },
  });
  expect(
    screen.getByLabelText("Private RSA JWK (JSON)").getAttribute("type"),
  ).toBe("password");
  fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect((screen.getByLabelText("Operation") as HTMLSelectElement).value).toBe(
    "generate",
  );
});

it("provides a separate signing key mode and protects signing key input", () => {
  render(<RsaWorkspace />);
  fireEvent.change(screen.getByLabelText("Operation"), {
    target: { value: "generate-sign" },
  });
  expect(screen.getByLabelText("Key size")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Operation"), {
    target: { value: "sign" },
  });
  expect(
    screen.getByLabelText("Private RSA JWK (JSON)").getAttribute("type"),
  ).toBe("password");
  expect(screen.getByLabelText("Message (UTF-8)")).toBeTruthy();
});
