# Ryanair Flights

Live: https://ryanairflights.pages.dev/

Search Ryanair connections with flexible stopovers. This app finds one-way and return options, supports multiple origins and destinations, and lets you filter by stopover hours and output time mode (LT/UTC).

## Features
- Multi-select origins and destinations with autocomplete
- One-way or return searches
- Departure and return date ranges
- Stopover hours range (advanced)
- Output time mode: local time (LT) or UTC (z)
- Tiles or table results
- Direct-only filter

## Data source
The app uses an unofficial, publicly available Ryanair API endpoint. There is no official documentation for these endpoints.

## Disclaimer
This project is unofficial and not affiliated with Ryanair. Data accuracy and availability are not guaranteed. Use at your own risk.

## Verification
Each result includes a direct link to the official Ryanair booking page for that specific flight, so you can verify availability and timing.

## API notes
- Ryanair public timetable endpoints (undocumented, unofficial)
- No guarantees of uptime, stability, or correctness

## Tech stack
- React + Vite
- Tailwind CSS + shadcn/ui
- Vitest + Testing Library

## Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Tests
```bash
npm run test
```
