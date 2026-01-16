import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlightsTable } from "./flight-table";

const airportNames = {
  DUB: "Dublin",
  ATH: "Athens",
};

const airportTimeZones = {
  DUB: "Europe/Dublin",
  ATH: "Europe/Athens",
};

const flights = [
  {
    TIME_MODE: "LOCAL",
    STD: "2025-01-10 08:00",
    ORIGIN: "DUB",
    STA: "",
    STOP: "",
    LAYOVER: "",
    STD_STOP: "",
    DEST: "ATH",
    STA_DEST: "2025-01-10 11:30",
    TOTAL_DURATION: "03:30",
    DEPARTURE_DATE: "2025-01-10 08:00",
    ARRIVAL_DATE: "2025-01-10 11:30",
  },
];

describe("FlightsTable", () => {
  it("renders table rows with flight data", () => {
    render(
      <FlightsTable
        flights={flights}
        airportNames={airportNames}
        airportTimeZones={airportTimeZones}
      />,
    );

    expect(screen.getByText(/2025-01-10 08:00/)).toBeInTheDocument();
    expect(screen.getByText("DUB")).toBeInTheDocument();
    expect(screen.getByText("ATH")).toBeInTheDocument();
    expect(screen.getByText("Flight 1")).toBeInTheDocument();
  });
});
