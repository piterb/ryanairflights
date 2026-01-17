import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultiSelect } from "./multi-select";

const options = [
  { code: "DUB", name: "Dublin" },
  { code: "ATH", name: "Athens" },
  { code: "BGY", name: "Bergamo" },
];

function Wrapper() {
  const [selected, setSelected] = useState([]);
  return (
    <MultiSelect
      label="Origins"
      options={options}
      selected={selected}
      onChange={setSelected}
      placeholder="Type to search"
    />
  );
}

describe("MultiSelect", () => {
  it("filters options and allows keyboard selection", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const input = screen.getByPlaceholderText("Type to search");
    await user.type(input, "ath");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.getByText("Athens (ATH) x")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(screen.queryByText("Selected")).not.toBeInTheDocument();
  });

  it("does not open list when query is empty", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const input = screen.getByPlaceholderText("Type to search");
    await user.click(input);
    expect(screen.queryByText("No matches found.")).not.toBeInTheDocument();
  });

  it("accepts multiple airport codes from paste", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const input = screen.getByPlaceholderText("Type to search");
    fireEvent.paste(input, {
      clipboardData: {
        getData: () => "DUB, ATH\nBGY",
      },
    });

    expect(await screen.findByText("Dublin (DUB) x")).toBeInTheDocument();
    expect(await screen.findByText("Athens (ATH) x")).toBeInTheDocument();
    expect(await screen.findByText("Bergamo (BGY) x")).toBeInTheDocument();
  });
});
