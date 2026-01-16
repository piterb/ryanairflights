import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlightTiles } from "./flight-tiles";

const airportNames = {
  DUB: "Dublin",
  BGY: "Bergamo",
  ATH: "Athens",
};

const airportTimeZones = {
  DUB: "Europe/Dublin",
  BGY: "Europe/Rome",
  ATH: "Europe/Athens",
};

const flights = [
  {
    TIME_MODE: "LOCAL",
    STD: "2025-01-10 08:00",
    ORIGIN: "DUB",
    STA: "2025-01-10 10:00",
    STOP: "BGY",
    LAYOVER: "02:00",
    STD_STOP: "2025-01-10 12:00",
    DEST: "ATH",
    STA_DEST: "2025-01-10 15:00",
    TOTAL_DURATION: "07:00",
    DEPARTURE_DATE: "2025-01-10 08:00",
    ARRIVAL_DATE: "2025-01-10 15:00",
  },
];

describe("FlightTiles", () => {
  it("renders flight tiles with key data", () => {
    render(
      <FlightTiles
        flights={flights}
        airportNames={airportNames}
        airportTimeZones={airportTimeZones}
      />,
    );

    expect(
      screen.getByText(/stopover in Bergamo \(BGY\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Flight 1")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });
});
