import moment from "moment-timezone";

export function filterAirports(options, query) {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (airport) =>
      airport.name.toLowerCase().includes(q) ||
      airport.code.toLowerCase().includes(q),
  );
}

export function applyRangeFromChange(newFrom) {
  return { from: newFrom, to: newFrom };
}

export function applyRangeToChange({ from }, newTo) {
  if (from && newTo) {
    const fromDate = moment(from, "YYYY-MM-DD");
    const toDate = moment(newTo, "YYYY-MM-DD");
    if (toDate.isBefore(fromDate, "day")) {
      return { from: newTo, to: newTo };
    }
  }
  return { from: from || "", to: newTo };
}

export function clampDateToMin(value, minDateStr) {
  if (!value || !minDateStr) return value;
  const minDate = moment(minDateStr, "YYYY-MM-DD");
  const current = moment(value, "YYYY-MM-DD");
  if (current.isBefore(minDate, "day")) return minDateStr;
  return value;
}

export function isReturnDatesValid({ tripType, returnFrom, returnTo, minReturnDate }) {
  if (tripType !== "return") return true;
  if (!returnFrom || !returnTo) return false;
  const fromDate = moment(returnFrom, "YYYY-MM-DD");
  const toDate = moment(returnTo, "YYYY-MM-DD");
  if (!fromDate.isValid() || !toDate.isValid()) return false;
  if (minReturnDate) {
    const minDate = moment(minReturnDate, "YYYY-MM-DD");
    if (fromDate.isBefore(minDate, "day") || toDate.isBefore(minDate, "day")) {
      return false;
    }
  }
  return !toDate.isBefore(fromDate, "day");
}

export function sortFlights(flights) {
  return [...flights].sort((a, b) => {
    const byStd = moment(a.STD, "YYYY-MM-DD HH:mm").diff(
      moment(b.STD, "YYYY-MM-DD HH:mm"),
    );
    if (byStd !== 0) return byStd;
    return moment(a.STA_DEST, "YYYY-MM-DD HH:mm").diff(
      moment(b.STA_DEST, "YYYY-MM-DD HH:mm"),
    );
  });
}

export function formatDateTime(dateTime) {
  return moment(dateTime).format("YYYY-MM-DD HH:mm");
}

export function formatDuration(durationStr) {
  const [hours, minutes] = durationStr.split(":").map(Number);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function calculateLayover(arrival, departure) {
  const arrivalTime = moment(arrival);
  const departureTime = moment(departure);
  const diffMinutes = departureTime.diff(arrivalTime, "minutes");
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function mapJourneysToFlights(journeys, timeMode) {
  return journeys
    .map((journey) => {
      const flights = journey.flights;
      if (flights.length === 1) {
        const flight = flights[0];
        return {
          TIME_MODE: timeMode,
          STD: formatDateTime(flight.departureDateTime),
          ORIGIN: flight.departureAirportCode,
          STA: "",
          STOP: "",
          LAYOVER: "",
          STD_STOP: "",
          DEST: flight.arrivalAirportCode,
          STA_DEST: formatDateTime(flight.arrivalDateTime),
          TOTAL_DURATION: formatDuration(journey.duration),
          DEPARTURE_DATE: journey.departureDateTime,
          ARRIVAL_DATE: journey.arrivalDateTime,
        };
      }
      if (flights.length === 2) {
        const firstFlight = flights[0];
        const secondFlight = flights[1];
        const layover = calculateLayover(
          firstFlight.arrivalDateTime,
          secondFlight.departureDateTime,
        );
        return {
          TIME_MODE: timeMode,
          STD: formatDateTime(firstFlight.departureDateTime),
          ORIGIN: firstFlight.departureAirportCode,
          STA: formatDateTime(firstFlight.arrivalDateTime),
          STOP: firstFlight.arrivalAirportCode,
          LAYOVER: layover,
          STD_STOP: formatDateTime(secondFlight.departureDateTime),
          DEST: secondFlight.arrivalAirportCode,
          STA_DEST: formatDateTime(secondFlight.arrivalDateTime),
          TOTAL_DURATION: formatDuration(journey.duration),
          DEPARTURE_DATE: journey.departureDateTime,
          ARRIVAL_DATE: journey.arrivalDateTime,
        };
      }
      return null;
    })
    .filter(Boolean);
}

export function calculateFlightDuration({
  start,
  end,
  startAirportCode,
  endAirportCode,
  mode,
  airportTimeZones,
}) {
  let startTime = moment(start, "YYYY-MM-DD HH:mm");
  let endTime = moment(end, "YYYY-MM-DD HH:mm");

  if (mode === "LOCAL") {
    const startTimeZone = airportTimeZones[startAirportCode];
    const endTimeZone = airportTimeZones[endAirportCode];
    if (startTimeZone && endTimeZone) {
      startTime = moment.tz(start, "YYYY-MM-DD HH:mm", startTimeZone).utc();
      endTime = moment.tz(end, "YYYY-MM-DD HH:mm", endTimeZone).utc();
    }
  }

  const diffMinutes = endTime.diff(startTime, "minutes");
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function buildFlightUrl(flight, segmentIndex) {
  let originIata, destinationIata, departureDate;
  if (segmentIndex === 0) {
    originIata = flight.ORIGIN;
    destinationIata = flight.STOP || flight.DEST;
    departureDate = moment(flight.STD, "YYYY-MM-DD HH:mm").format("YYYY-MM-DD");
  } else {
    originIata = flight.STOP;
    destinationIata = flight.DEST;
    departureDate = moment(flight.STD_STOP, "YYYY-MM-DD HH:mm").format(
      "YYYY-MM-DD",
    );
  }

  return `https://www.ryanair.com/ie/en/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut=${departureDate}&dateIn=&isConnectedFlight=false&isReturn=false&discount=0&promoCode=&originIata=${originIata}&destinationIata=${destinationIata}`;
}

export function generateGoogleCalendarUrl({ flight, airportNames, airportTimeZones }) {
  let timeModeSuffix = flight.TIME_MODE === "LOCAL" ? " LT" : "z";
  let startTime = moment(flight.DEPARTURE_DATE, "YYYY-MM-DD HH:mm").format(
    "YYYYMMDDTHHmmss",
  );
  let endTime = moment(flight.ARRIVAL_DATE, "YYYY-MM-DD HH:mm").format(
    "YYYYMMDDTHHmmss",
  );

  if (flight.TIME_MODE === "LOCAL") {
    const startTimeZone = airportTimeZones[flight.ORIGIN];
    const endTimeZone = airportTimeZones[flight.DEST];
    if (startTimeZone && endTimeZone) {
      startTime = moment
        .tz(flight.DEPARTURE_DATE, "YYYY-MM-DD HH:mm", startTimeZone)
        .utc()
        .format("YYYYMMDDTHHmmss");
      endTime = moment
        .tz(flight.ARRIVAL_DATE, "YYYY-MM-DD HH:mm", endTimeZone)
        .utc()
        .format("YYYYMMDDTHHmmss");
    }
  }

  const origin = airportNames[flight.ORIGIN] || flight.ORIGIN;
  const destination = airportNames[flight.DEST] || flight.DEST;
  const stopover = flight.STOP ? airportNames[flight.STOP] || flight.STOP : "";

  let title = `Flight ${origin} to ${destination}`;
  if (stopover) title += ` via ${stopover}`;

  const departureDate = moment(flight.DEPARTURE_DATE, "YYYY-MM-DD HH:mm").format(
    "ddd, MMM D",
  );
  const arrivalDate = moment(flight.ARRIVAL_DATE, "YYYY-MM-DD HH:mm").format(
    "ddd, MMM D",
  );

  let description = `Depart - ${departureDate}\n\n`;

  description += `${moment(flight.STD, "YYYY-MM-DD HH:mm").format("HH:mm")}${timeModeSuffix} ${origin} (${flight.ORIGIN}) | `;
  description += `${moment(
    flight.STA || flight.STA_DEST,
    "YYYY-MM-DD HH:mm",
  ).format("HH:mm")}${timeModeSuffix} ${
    stopover ? stopover : destination
  } (${stopover ? flight.STOP : flight.DEST}) | `;
  description += `Flight time ${calculateFlightDuration({
    start: flight.STD,
    end: flight.STA || flight.STA_DEST,
    startAirportCode: flight.ORIGIN,
    endAirportCode: stopover ? flight.STOP : flight.DEST,
    mode: flight.TIME_MODE,
    airportTimeZones,
  })}\n`;

  if (stopover) {
    description += `\n- Stopover for ${flight.LAYOVER} in ${stopover} (${flight.STOP})\n\n`;
    description += `${moment(flight.STD_STOP, "YYYY-MM-DD HH:mm").format(
      "HH:mm",
    )}${timeModeSuffix} ${stopover} (${flight.STOP}) | `;
    description += `${moment(flight.STA_DEST, "YYYY-MM-DD HH:mm").format(
      "HH:mm",
    )}${timeModeSuffix} ${destination} (${flight.DEST}) | `;
    description += `Flight time ${calculateFlightDuration({
      start: flight.STD_STOP,
      end: flight.STA_DEST,
      startAirportCode: flight.STOP,
      endAirportCode: flight.DEST,
      mode: flight.TIME_MODE,
      airportTimeZones,
    })}\n`;
  }

  description += `\nArrive - ${arrivalDate}`;

  const baseUrl = "https://www.google.com/calendar/render";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startTime}Z/${endTime}Z`,
    details: description,
    location: `Departure: ${origin}, Arrival: ${destination}`,
  });

  return `${baseUrl}?${params.toString()}`;
}
