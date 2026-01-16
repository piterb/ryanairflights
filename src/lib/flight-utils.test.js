import { describe, expect, it } from "vitest";
import {
  applyRangeFromChange,
  applyRangeToChange,
  clampDateToMin,
  filterAirports,
  generateGoogleCalendarUrl,
  isReturnDatesValid,
  mapJourneysToFlights,
  sortFlights,
  buildFlightUrl,
} from "./flight-utils";

const airports = [
  { code: "DUB", name: "Dublin" },
  { code: "BGY", name: "Bergamo" },
  { code: "ATH", name: "Athens" },
];

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

describe("flight-utils", () => {
  it("filters airports by name or code", () => {
    expect(filterAirports(airports, "dub")[0].code).toBe("DUB");
    expect(filterAirports(airports, "ATH")[0].code).toBe("ATH");
    expect(filterAirports(airports, "").length).toBe(3);
  });

  it("applies range changes from from/to", () => {
    expect(applyRangeFromChange("2025-01-10")).toEqual({
      from: "2025-01-10",
      to: "2025-01-10",
    });
    expect(
      applyRangeToChange({ from: "2025-01-10" }, "2025-01-09"),
    ).toEqual({
      from: "2025-01-09",
      to: "2025-01-09",
    });
  });

  it("clamps dates to minimum", () => {
    expect(clampDateToMin("2025-01-09", "2025-01-10")).toBe("2025-01-10");
    expect(clampDateToMin("2025-01-12", "2025-01-10")).toBe("2025-01-12");
  });

  it("validates return dates", () => {
    expect(
      isReturnDatesValid({
        tripType: "return",
        returnFrom: "2025-01-10",
        returnTo: "2025-01-12",
        minReturnDate: "2025-01-10",
      }),
    ).toBe(true);
    expect(
      isReturnDatesValid({
        tripType: "return",
        returnFrom: "2025-01-09",
        returnTo: "2025-01-12",
        minReturnDate: "2025-01-10",
      }),
    ).toBe(false);
    expect(
      isReturnDatesValid({
        tripType: "oneway",
        returnFrom: "",
        returnTo: "",
        minReturnDate: "2025-01-10",
      }),
    ).toBe(true);
  });

  it("sorts by STD then STA_DEST asc", () => {
    const flights = [
      { STD: "2025-01-10 09:00", STA_DEST: "2025-01-10 12:00" },
      { STD: "2025-01-10 09:00", STA_DEST: "2025-01-10 11:00" },
      { STD: "2025-01-10 08:00", STA_DEST: "2025-01-10 10:00" },
    ];
    const sorted = sortFlights(flights);
    expect(sorted[0].STD).toBe("2025-01-10 08:00");
    expect(sorted[1].STA_DEST).toBe("2025-01-10 11:00");
  });

  it("maps journeys to flight data", () => {
    const journeys = [
      {
        duration: "02:30",
        departureDateTime: "2025-01-10T08:00:00",
        arrivalDateTime: "2025-01-10T10:30:00",
        flights: [
          {
            departureDateTime: "2025-01-10T08:00:00",
            arrivalDateTime: "2025-01-10T10:30:00",
            departureAirportCode: "DUB",
            arrivalAirportCode: "ATH",
          },
        ],
      },
      {
        duration: "05:30",
        departureDateTime: "2025-01-10T08:00:00",
        arrivalDateTime: "2025-01-10T13:30:00",
        flights: [
          {
            departureDateTime: "2025-01-10T08:00:00",
            arrivalDateTime: "2025-01-10T10:00:00",
            departureAirportCode: "DUB",
            arrivalAirportCode: "BGY",
          },
          {
            departureDateTime: "2025-01-10T12:00:00",
            arrivalDateTime: "2025-01-10T13:30:00",
            departureAirportCode: "BGY",
            arrivalAirportCode: "ATH",
          },
        ],
      },
    ];

    const mapped = mapJourneysToFlights(journeys, "LOCAL");
    expect(mapped[0].STOP).toBe("");
    expect(mapped[1].STOP).toBe("BGY");
    expect(mapped[1].LAYOVER).toBe("02:00");
  });

  it("builds flight urls and calendar urls", () => {
    const flight = {
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
    };

    const url = buildFlightUrl(flight, 0);
    expect(url).toContain("originIata=DUB");
    expect(url).toContain("destinationIata=BGY");

    const calUrl = generateGoogleCalendarUrl({
      flight,
      airportNames,
      airportTimeZones,
    });
    const parsed = new URL(calUrl);
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("text")).toContain("Dublin");
    expect(parsed.searchParams.get("dates")).toMatch(
      /\d{8}T\d{6}Z\/\d{8}T\d{6}Z/,
    );
  });
});
