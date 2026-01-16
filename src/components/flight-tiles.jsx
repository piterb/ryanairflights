import moment from "moment-timezone";
import { Calendar, Plane } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  buildFlightUrl,
  calculateFlightDuration,
  generateGoogleCalendarUrl,
} from "../lib/flight-utils";

export function FlightTiles({ flights, airportNames, airportTimeZones }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {flights.map((flight, index) => {
        const departureDate = moment(
          flight.DEPARTURE_DATE,
          "YYYY-MM-DD HH:mm",
        ).format("ddd, MMM D");
        const arrivalDate = moment(
          flight.ARRIVAL_DATE,
          "YYYY-MM-DD HH:mm",
        ).format("ddd, MMM D");
        const originName = airportNames[flight.ORIGIN] || flight.ORIGIN;
        const destName = airportNames[flight.DEST] || flight.DEST;
        const stopName = flight.STOP ? airportNames[flight.STOP] || flight.STOP : "";
        const timeSuffix = flight.TIME_MODE === "LOCAL" ? " LT" : "z";

        return (
          <Card key={`${flight.ORIGIN}-${flight.DEST}-${index}`}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Depart - {departureDate}</span>
                <span>Duration - {flight.TOTAL_DURATION}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-semibold">
                    {moment(flight.STD, "YYYY-MM-DD HH:mm").format("HH:mm")}
                    {timeSuffix}
                  </p>
                  <p className="text-sm text-slate-600">
                    {originName} ({flight.ORIGIN})
                  </p>
                  {flight.STOP && (
                    <p className="text-xs text-slate-400">
                      {calculateFlightDuration({
                        start: flight.STD,
                        end: flight.STA,
                        startAirportCode: flight.ORIGIN,
                        endAirportCode: flight.STOP,
                        mode: flight.TIME_MODE,
                        airportTimeZones,
                      })}
                    </p>
                  )}
                </div>

                {flight.STOP && (
                  <>
                    <div>
                      <p className="text-lg font-semibold">
                        {moment(flight.STA, "YYYY-MM-DD HH:mm").format("HH:mm")}
                        {timeSuffix}
                      </p>
                      <p className="text-sm text-slate-600">
                        {stopName} ({flight.STOP})
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-500">
                      {flight.LAYOVER} - Stopover in {stopName} ({flight.STOP})
                    </div>
                    <div>
                      <p className="text-lg font-semibold">
                        {moment(flight.STD_STOP, "YYYY-MM-DD HH:mm").format("HH:mm")}
                        {timeSuffix}
                      </p>
                      <p className="text-sm text-slate-600">
                        {stopName} ({flight.STOP})
                      </p>
                      <p className="text-xs text-slate-400">
                        {calculateFlightDuration({
                          start: flight.STD_STOP,
                          end: flight.STA_DEST,
                          startAirportCode: flight.STOP,
                          endAirportCode: flight.DEST,
                          mode: flight.TIME_MODE,
                          airportTimeZones,
                        })}
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-lg font-semibold">
                    {moment(flight.STA_DEST, "YYYY-MM-DD HH:mm").format("HH:mm")}
                    {timeSuffix}
                  </p>
                  <p className="text-sm text-slate-600">
                    {destName} ({flight.DEST})
                  </p>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                <span>Arrive - {arrivalDate}</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="text-xs">
                    <a
                      href={generateGoogleCalendarUrl({
                        flight,
                        airportNames,
                        airportTimeZones,
                      })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Calendar</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="text-xs">
                    <a
                      href={buildFlightUrl(flight, 0)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Plane className="h-3.5 w-3.5" />
                      <span>Flight 1</span>
                    </a>
                  </Button>
                  {flight.STOP && (
                    <Button asChild variant="outline" size="sm" className="text-xs">
                      <a
                        href={buildFlightUrl(flight, 1)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Plane className="h-3.5 w-3.5" />
                        <span>Flight 2</span>
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
