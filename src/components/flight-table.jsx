import { Calendar, Plane } from "lucide-react";
import { Button } from "./ui/button";
import { buildFlightUrl, generateGoogleCalendarUrl } from "../lib/flight-utils";

export function FlightsTable({ flights, airportNames, airportTimeZones }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">STD</th>
            <th className="px-4 py-3">ORIGIN</th>
            <th className="px-4 py-3">STA</th>
            <th className="px-4 py-3">STOP</th>
            <th className="px-4 py-3">LAYOVER</th>
            <th className="px-4 py-3">STD_STOP</th>
            <th className="px-4 py-3">DEST</th>
            <th className="px-4 py-3">STA_DEST</th>
            <th className="px-4 py-3">TOTAL</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {flights.map((flight, index) => {
            const suffix = flight.TIME_MODE === "LOCAL" ? " LT" : "z";
            return (
              <tr key={`${flight.ORIGIN}-${flight.DEST}-${index}`}>
                <td className="px-4 py-3">
                  {flight.STD}
                  {suffix}
                </td>
                <td className="px-4 py-3">{flight.ORIGIN}</td>
                <td className="px-4 py-3">
                  {flight.STA}
                  {suffix}
                </td>
                <td className="px-4 py-3">{flight.STOP}</td>
                <td className="px-4 py-3">{flight.LAYOVER}</td>
                <td className="px-4 py-3">
                  {flight.STD_STOP}
                  {suffix}
                </td>
                <td className="px-4 py-3">{flight.DEST}</td>
                <td className="px-4 py-3">
                  {flight.STA_DEST}
                  {suffix}
                </td>
                <td className="px-4 py-3">{flight.TOTAL_DURATION}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
