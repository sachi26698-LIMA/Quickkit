// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Calculator from "../components/tools/calculator";
afterEach(cleanup);
describe("BMI age safety", () => {
  it("suppresses adult interpretation for unknown and under-20, restoring it only when adult is selected", () => {
    render(<Calculator kind="bmi-calculator" />);
    fireEvent.change(screen.getByLabelText("Height (cm)"), {
      target: { value: "170" },
    });
    fireEvent.change(screen.getByLabelText("Weight (kg)"), {
      target: { value: "65" },
    });
    expect(screen.getByText("22.4913", { exact: true })).toBeInTheDocument();
    expect(
      screen.queryByText(/Adult healthy weight range estimate/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Healthy weight$/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Age group"), {
      target: { value: "minor" },
    });
    expect(
      screen.getByText(/growth charts and clinical guidance/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Adult healthy weight range estimate/),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Age group"), {
      target: { value: "adult" },
    });
    expect(screen.getByText(/22.4913 · Healthy weight/)).toBeInTheDocument();
    expect(
      screen.getByText(/Adult healthy weight range estimate/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save to history" }));
    fireEvent.change(screen.getByLabelText("Age group"), {
      target: { value: "minor" },
    });
    expect(screen.getByText("22.4913", { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(screen.getByLabelText("Age group")).toHaveValue("adult");
  });
});
