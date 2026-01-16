import { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment-timezone";
import { ArrowLeftRight, Calendar } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { MultiSelect } from "./components/multi-select";
import { FlightTiles } from "./components/flight-tiles";
import { FlightsTable } from "./components/flight-table";
import {
  applyRangeFromChange,
  applyRangeToChange,
  clampDateToMin,
  isReturnDatesValid,
  mapJourneysToFlights,
  sortFlights,
} from "./lib/flight-utils";

const apiHost = "services-api.ryanair.com";

function DateInput({ id, value, onChange, required, min }) {
  const inputRef = useRef(null);

  const handleClick = () => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    if (typeof inputRef.current.showPicker === "function") {
      inputRef.current.showPicker();
    }
  };

  return (
    <div className="relative" onClick={handleClick}>
      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        className="pl-9"
      />
    </div>
  );
}

function App() {
  const [airports, setAirports] = useState([]);
  const [airportNames, setAirportNames] = useState({});
  const [airportTimeZones, setAirportTimeZones] = useState({});

  const [origins, setOrigins] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [departureFrom, setDepartureFrom] = useState("");
  const [departureTo, setDepartureTo] = useState("");
  const [returnFrom, setReturnFrom] = useState("");
  const [returnTo, setReturnTo] = useState("");
  const [tripType, setTripType] = useState("oneway");
  const [layoverFrom, setLayoverFrom] = useState(0);
  const [layoverTo, setLayoverTo] = useState(12);
  const [timeMode, setTimeMode] = useState("LOCAL");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [viewMode, setViewMode] = useState("tiles");
  const [directOnly, setDirectOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [returnError, setReturnError] = useState(false);

  const [outboundJourneys, setOutboundJourneys] = useState([]);
  const [returnJourneys, setReturnJourneys] = useState([]);
  const [outboundTitle, setOutboundTitle] = useState("");
  const [returnTitle, setReturnTitle] = useState("");

  useEffect(() => {
    fetch(`https://${apiHost}/views/locate/5/airports/en/active`)
      .then((response) =>
        response.ok ? response.json() : Promise.reject("Network error"),
      )
      .then((data) => {
        const names = {};
        const timezones = {};
        data.forEach((airport) => {
          names[airport.code] = airport.name;
          timezones[airport.code] = airport.timeZone;
        });
        setAirports(data);
        setAirportNames(names);
        setAirportTimeZones(timezones);
      })
      .catch((error) => {
        console.error("Error fetching airports:", error);
        alert("Failed to load airport list.");
      });
  }, []);

  useEffect(() => {
    const savedOrigins = localStorage.getItem("origins");
    const savedDestinations = localStorage.getItem("destinations");
    const savedDepartureFrom = localStorage.getItem("departure-from");
    const savedDepartureTo = localStorage.getItem("departure-to");
    const savedReturnFrom = localStorage.getItem("return-from");
    const savedReturnTo = localStorage.getItem("return-to");
    const savedTripType = localStorage.getItem("trip-type");
    const savedLayoverFrom = localStorage.getItem("layover-from");
    const savedLayoverTo = localStorage.getItem("layover-to");
    const savedTimeFormat = localStorage.getItem("time-format");

    if (savedOrigins) setOrigins(JSON.parse(savedOrigins));
    if (savedDestinations) setDestinations(JSON.parse(savedDestinations));
    if (savedDepartureFrom) {
      setDepartureFrom(savedDepartureFrom);
      setDepartureTo(savedDepartureFrom);
    }
    if (savedDepartureTo) setDepartureTo(savedDepartureTo);
    if (savedReturnFrom) {
      setReturnFrom(savedReturnFrom);
      setReturnTo(savedReturnFrom);
    }
    if (savedReturnTo) setReturnTo(savedReturnTo);
    if (savedTripType === "return") setTripType("return");
    if (savedLayoverFrom !== null && savedLayoverFrom !== "")
      setLayoverFrom(Number(savedLayoverFrom));
    if (savedLayoverTo !== null && savedLayoverTo !== "")
      setLayoverTo(Number(savedLayoverTo));
    if (savedTimeFormat) setTimeMode(savedTimeFormat);
  }, []);

  const minReturnDate = useMemo(
    () => departureTo || departureFrom || "",
    [departureFrom, departureTo],
  );

  const isReturnValid = () =>
    isReturnDatesValid({
      tripType,
      returnFrom,
      returnTo,
      minReturnDate,
    });

  useEffect(() => {
    if (tripType !== "return") {
      setReturnError(false);
      return;
    }
    if (returnError && isReturnValid()) setReturnError(false);
  }, [tripType, returnFrom, returnTo, departureFrom, departureTo, returnError]);

  useEffect(() => {
    if (tripType !== "return") return;
    if (!minReturnDate) return;
    const minDate = moment(minReturnDate, "YYYY-MM-DD");
    if (
      (returnFrom && moment(returnFrom, "YYYY-MM-DD").isBefore(minDate, "day")) ||
      (returnTo && moment(returnTo, "YYYY-MM-DD").isBefore(minDate, "day"))
    ) {
      setReturnFrom("");
      setReturnTo("");
    }
  }, [minReturnDate, tripType]);

  const handleDepartureFromChange = (value) => {
    const next = applyRangeFromChange(value);
    setDepartureFrom(next.from);
    setDepartureTo(next.to);
  };

  const handleDepartureToChange = (value) => {
    const next = applyRangeToChange({ from: departureFrom }, value);
    setDepartureFrom(next.from);
    setDepartureTo(next.to);
  };

  const handleReturnFromChange = (value) => {
    const nextValue = clampDateToMin(value, minReturnDate);
    setReturnFrom(nextValue);
    setReturnTo(nextValue);
  };

  const handleReturnToChange = (value) => {
    const nextValue = clampDateToMin(value, minReturnDate);
    if (returnFrom && nextValue) {
      const fromDate = moment(returnFrom, "YYYY-MM-DD");
      const toDate = moment(nextValue, "YYYY-MM-DD");
      if (toDate.isBefore(fromDate, "day")) {
        setReturnFrom(nextValue);
      }
    }
    setReturnTo(nextValue);
    if (!returnFrom && nextValue) setReturnFrom(nextValue);
  };

  const handleSwap = () => {
    setOrigins(destinations);
    setDestinations(origins);
  };

  const outboundFlights = useMemo(
    () => mapJourneysToFlights(outboundJourneys, timeMode),
    [outboundJourneys, timeMode],
  );

  const returnFlights = useMemo(
    () => mapJourneysToFlights(returnJourneys, timeMode),
    [returnJourneys, timeMode],
  );

  const visibleOutbound = useMemo(() => {
    const list = directOnly
      ? outboundFlights.filter((flight) => !flight.STOP)
      : outboundFlights;
    return sortFlights(list);
  }, [directOnly, outboundFlights]);

  const visibleReturn = useMemo(() => {
    const list = directOnly
      ? returnFlights.filter((flight) => !flight.STOP)
      : returnFlights;
    return sortFlights(list);
  }, [directOnly, returnFlights]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isReturnValid()) {
      setReturnError(true);
      return;
    }
    setReturnError(false);

    setIsLoading(true);
    setOutboundJourneys([]);
    setReturnJourneys([]);
    setDirectOnly(false);

    const routeList = (values) => (values || []).join(", ");
    setOutboundTitle(
      `Outbound: ${routeList(origins)} <-> ${routeList(destinations)}`,
    );
    if (tripType === "return") {
      setReturnTitle(
        `Return: ${routeList(destinations)} <-> ${routeList(origins)}`,
      );
    } else {
      setReturnTitle("");
    }

    localStorage.setItem("origins", JSON.stringify(origins));
    localStorage.setItem("destinations", JSON.stringify(destinations));
    localStorage.setItem("departure-from", departureFrom);
    localStorage.setItem("departure-to", departureTo);
    localStorage.setItem("return-from", returnFrom);
    localStorage.setItem("return-to", returnTo);
    localStorage.setItem("trip-type", tripType);
    localStorage.setItem("layover-from", layoverFrom === "" ? "" : layoverFrom);
    localStorage.setItem("layover-to", layoverTo === "" ? "" : layoverTo);
    localStorage.setItem("time-format", timeMode);

    try {
      const outboundPromises = [];
      origins.forEach((origin) => {
        destinations.forEach((destination) => {
          const url =
            `https://${apiHost}/timtbl/v3/journeys/${origin}/${destination}?` +
            `departureDateFrom=${departureFrom}&departureDateTo=${departureTo}&` +
            `timeMode=${timeMode}&layoverFrom=${layoverFrom}&layoverTo=${layoverTo}`;
          outboundPromises.push(
            fetch(url).then((response) => {
              if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
              return response.json();
            }),
          );
        });
      });

      const returnPromises = [];
      if (tripType === "return") {
        origins.forEach((origin) => {
          destinations.forEach((destination) => {
            const url =
              `https://${apiHost}/timtbl/v3/journeys/${destination}/${origin}?` +
              `departureDateFrom=${returnFrom}&departureDateTo=${returnTo}&` +
              `timeMode=${timeMode}&layoverFrom=${layoverFrom}&layoverTo=${layoverTo}`;
            returnPromises.push(
              fetch(url).then((response) => {
                if (!response.ok)
                  throw new Error(`HTTP error: ${response.status}`);
                return response.json();
              }),
            );
          });
        });
      }

      const [outboundResponses, returnResponses] = await Promise.all([
        Promise.all(outboundPromises),
        Promise.all(returnPromises),
      ]);
      setOutboundJourneys(outboundResponses.flat());
      setReturnJourneys(returnResponses.flat());
    } catch (error) {
      console.error("Error fetching flights:", error);
      alert("Failed to fetch flight data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            Flight Search
          </h1>
          <p className="text-sm text-slate-500">
            Ryanair connections with optional stopovers.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <MultiSelect
                label="List of origins"
                options={airports}
                selected={origins}
                onChange={setOrigins}
                placeholder="Type to search origins..."
              />

              <div className="flex items-center justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSwap}
                  className="rounded-full px-3"
                  aria-label="Swap origins and destinations"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </div>

              <MultiSelect
                label="List of destinations"
                options={airports}
                selected={destinations}
                onChange={setDestinations}
                placeholder="Type to search destinations..."
              />

              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="departure-from">
                    Departure dates range (from - to)
                  </Label>
                  <DateInput
                    id="departure-from"
                    value={departureFrom}
                    onChange={(event) =>
                      handleDepartureFromChange(event.target.value)
                    }
                    required
                  />
                </div>
                <div className="space-y-2 md:pt-7">
                  <DateInput
                    value={departureTo}
                    onChange={(event) =>
                      handleDepartureToChange(event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Trip type</Label>
                <RadioGroup
                  value={tripType}
                  onValueChange={setTripType}
                  className="flex flex-wrap gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="oneway" id="trip-oneway" />
                    <Label htmlFor="trip-oneway">One-way</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="return" id="trip-return" />
                    <Label htmlFor="trip-return">Return</Label>
                  </div>
                </RadioGroup>
              </div>

              {tripType === "return" && (
                <div className="space-y-3">
                  <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                    <div className="space-y-2">
                      <Label htmlFor="return-from">
                        Return flight departure range (from - to)
                      </Label>
                      <DateInput
                        id="return-from"
                        value={returnFrom}
                        onChange={(event) =>
                          handleReturnFromChange(event.target.value)
                        }
                        required
                        min={minReturnDate || undefined}
                      />
                    </div>
                    <div className="space-y-2 md:pt-7">
                      <DateInput
                        id="return-to"
                        value={returnTo}
                        onChange={(event) =>
                          handleReturnToChange(event.target.value)
                        }
                        required
                        min={minReturnDate || undefined}
                      />
                    </div>
                  </div>
                  {returnError && (
                    <p className="text-sm text-red-600">
                      Return dates are required and must be on/after the
                      departure dates.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdvancedOpen((open) => !open)}
                >
                  {advancedOpen ? "Hide advanced" : "Show advanced"}
                </Button>
                <span className="text-sm text-slate-500">
                  Optional stopover and output settings.
                </span>
              </div>

              {advancedOpen && (
                <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                  <div className="space-y-2">
                    <Label htmlFor="layover-from">
                      Stopover hours range (from 0 - 12)
                    </Label>
                    <div className="flex gap-3">
                      <Input
                        id="layover-from"
                        type="number"
                        min={0}
                        max={12}
                        step={1}
                        value={layoverFrom}
                        onChange={(event) =>
                          setLayoverFrom(Number(event.target.value))
                        }
                      />
                      <Input
                        id="layover-to"
                        type="number"
                        min={0}
                        max={12}
                        step={1}
                        value={layoverTo}
                        onChange={(event) =>
                          setLayoverTo(Number(event.target.value))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time-mode">Output times format</Label>
                    <select
                      id="time-mode"
                      value={timeMode}
                      onChange={(event) => setTimeMode(event.target.value)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                      <option value="LOCAL">Local</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={viewMode === "tiles" ? "default" : "outline"}
              onClick={() => setViewMode("tiles")}
            >
              Tiles
            </Button>
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "outline"}
              onClick={() => setViewMode("table")}
            >
              Table
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={directOnly}
              onChange={(event) => setDirectOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            Show direct flights only
          </label>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8 text-slate-500">
            Loading flights...
          </div>
        )}

        <div className="space-y-10">
          <div>
            {outboundTitle && (
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                {outboundTitle}
              </h2>
            )}
            {viewMode === "tiles" ? (
              <FlightTiles
                flights={visibleOutbound}
                airportNames={airportNames}
                airportTimeZones={airportTimeZones}
              />
            ) : (
              <FlightsTable
                flights={visibleOutbound}
                airportNames={airportNames}
                airportTimeZones={airportTimeZones}
              />
            )}
          </div>

          {tripType === "return" && returnTitle && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                {returnTitle}
              </h2>
              {viewMode === "tiles" ? (
                <FlightTiles
                  flights={visibleReturn}
                  airportNames={airportNames}
                  airportTimeZones={airportTimeZones}
                />
              ) : (
                <FlightsTable
                  flights={visibleReturn}
                  airportNames={airportNames}
                  airportTimeZones={airportTimeZones}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
