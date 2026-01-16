# Ryanair Flights

[![CI](https://github.com/piterb/ryanairflights/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/piterb/ryanairflights/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20.x-339933)
![Version](https://img.shields.io/github/package-json/v/piterb/ryanairflights)


See live preview here: <a href="https://ryanairflights.pages.dev/" target="_blank" rel="noreferrer">https://ryanairflights.pages.dev/</a>

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
