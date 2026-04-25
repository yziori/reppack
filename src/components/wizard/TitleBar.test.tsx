import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitleBar } from "./TitleBar";

describe("TitleBar", () => {
  it("renders the given title text", () => {
    render(<TitleBar title="reppack — sample.mp3" />);
    expect(screen.getByText("reppack — sample.mp3")).toBeTruthy();
  });

  it("root element has data-tauri-drag-region attribute", () => {
    const { container } = render(<TitleBar title="x" />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("data-tauri-drag-region")).not.toBeNull();
  });
});
