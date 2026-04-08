import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Spinner from "./Spinner";

describe("Spinner", () => {
  it("renders loading spinner with default label", () => {
    render(<Spinner />);
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });
});
