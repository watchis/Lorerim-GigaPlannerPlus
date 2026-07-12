// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SingleSelectPickerView, type SingleSelectOption } from "@/panels/SingleSelectPickerView";

describe("SingleSelectPickerView", () => {
  it("only renders detail content for the preview option", () => {
    const renderRaceDetail = vi.fn(() => <p>Race detail</p>);
    const renderBirthsignDetail = vi.fn(() => <p>Birthsign detail</p>);

    const options: SingleSelectOption[] = [
      {
        id: "nord",
        name: "Nord",
        isSelected: true,
        onSelect: () => {},
        renderDetail: renderRaceDetail,
      },
      {
        id: "bosmer",
        name: "Bosmer",
        isSelected: false,
        onSelect: () => {},
        renderDetail: renderBirthsignDetail,
      },
    ];

    render(
      <SingleSelectPickerView
        options={options}
        selectedId="nord"
        emptyDetail="None"
      />,
    );

    expect(screen.getByText("Race detail")).toBeTruthy();
    expect(renderRaceDetail).toHaveBeenCalledTimes(1);
    expect(renderBirthsignDetail).not.toHaveBeenCalled();
  });
});
