$(document).ready(function() {

    let config = { 
        'flightsApiHost': 'services-api.ryanair.com',
    }

    // Global object to store airport code-to-name mapping
    let airportNames = {};
    // New mapping for timezones
    let airportTimeZones = {}; 
    // Store all journeys fetched from the API - including stopovers
    let allJourneys = []; 
    // Store all journeys mapped in this app
    let allFlights = [];

    // Initialize Select2 for multi-select dropdowns
    $('#origins').select2();
    $('#destinations').select2();

    // Initialize Flatpickr for date pickers with current date prefilled
    var departureFromPicker = flatpickr('#departure-from', { 
        dateFormat: 'Y-m-d',
        defaultDate: new Date()
    });
    var departureToPicker = flatpickr('#departure-to', { 
        dateFormat: 'Y-m-d',
        defaultDate: new Date()
    });

    let isSyncingDates = false;

    function parsePickerDate(picker, value) {
        return value ? picker.parseDate(value, 'Y-m-d') : null;
    }

    function ensureToNotBeforeFrom() {
        if (isSyncingDates) return;
        const fromVal = $('#departure-from').val();
        const toVal = $('#departure-to').val();
        const fromDate = parsePickerDate(departureFromPicker, fromVal);
        const toDate = parsePickerDate(departureToPicker, toVal);
        if (fromDate && toDate && toDate < fromDate) {
            isSyncingDates = true;
            departureToPicker.setDate(fromVal, true);
            isSyncingDates = false;
        }
    }

    function ensureFromNotAfterTo() {
        if (isSyncingDates) return;
        const fromVal = $('#departure-from').val();
        const toVal = $('#departure-to').val();
        const fromDate = parsePickerDate(departureFromPicker, fromVal);
        const toDate = parsePickerDate(departureToPicker, toVal);
        if (fromDate && toDate && toDate < fromDate) {
            isSyncingDates = true;
            departureFromPicker.setDate(toVal, true);
            isSyncingDates = false;
        }
    }

    $('#departure-from').on('change', ensureToNotBeforeFrom);
    $('#departure-to').on('change', ensureFromNotAfterTo);

    $('#advanced-fields')
        .on('shown.bs.collapse', function() {
            $('#advanced-toggle-icon').removeClass('bi-plus-lg').addClass('bi-dash-lg');
        })
        .on('hidden.bs.collapse', function() {
            $('#advanced-toggle-icon').removeClass('bi-dash-lg').addClass('bi-plus-lg');
        });

    // Restrict layover inputs to 0-12 range and ensure layover-from <= layover-to in real-time
    $('#layover-from').on('input', function() {
        const layoverFrom = parseFloat(this.value);
        const layoverTo = parseFloat($('#layover-to').val()) || 12; // Default to 12 if layover-to is empty
        if (isNaN(layoverFrom) || layoverFrom < 0) {
            this.value = '';
        } else if (layoverFrom > 12) {
            this.value = 12;
        } else if (layoverFrom > layoverTo) {
            this.value = layoverTo; // Cap layover-from at layover-to
        }
    });

    $('#layover-to').on('input', function() {
        const layoverTo = parseFloat(this.value);
        const layoverFrom = parseFloat($('#layover-from').val()) || 0; // Default to 0 if layover-from is empty
        if (isNaN(layoverTo) || layoverTo < 0) {
            this.value = '';
        } else if (layoverTo > 12) {
            this.value = 12;
        } else if (layoverTo < layoverFrom) {
            this.value = layoverFrom; // Floor layover-to at layover-from
        }
    });

    // Swap button logic
    $('#swap-btn').on('click', function() {
        const originsVal = $('#origins').val() || [];
        const destinationsVal = $('#destinations').val() || [];
        $('#origins').val(destinationsVal).trigger('change');
        $('#destinations').val(originsVal).trigger('change');
        
        // Update localStorage to reflect the swap
        localStorage.setItem('origins', JSON.stringify(destinationsVal));
        localStorage.setItem('destinations', JSON.stringify(originsVal));
    });

    // View toggle logic
    $('#tile-view-btn').on('click', function() {
        $('#tile-view-btn').addClass('active');
        $('#table-view-btn').removeClass('active');
        $('#tiles-container').show();
        $('#flights-table').hide();
        $('.dataTables_paginate').hide();
        $('.dataTables_filter').hide();
        $('.dataTables_info').hide();
        $('.dataTables_length').hide();
    });

    $('#table-view-btn').on('click', function() {
        $('#table-view-btn').addClass('active');
        $('#tile-view-btn').removeClass('active');
        $('#flights-table').show();
        $('#tiles-container').hide();
        $('.dataTables_paginate').show();
        $('.dataTables_filter').show();
        $('.dataTables_info').show();
        $('.dataTables_length').show();
        table.columns.adjust().draw(); // Recalculate table layout
    });

    // Add event listener for the checkbox
    $('#direct-flights-only').on('change', function() {
        const directOnly = $(this).is(':checked'); // true if checked, false if unchecked
        const filteredJourneys = directOnly 
            ? allJourneys.filter(journey => journey.flights.length === 1) // Only direct flights
            : allJourneys; // All flights
        
        // Clear current table and tiles
        table.clear().draw();
        $('#tiles-container').empty();
        
        // Re-render with filtered data
        processFlights(filteredJourneys, table);
    });

    // Load form values from localStorage and apply them
    const savedDepartureFrom = localStorage.getItem('departure-from');
    const savedDepartureTo = localStorage.getItem('departure-to');
    isSyncingDates = true;
    if (savedDepartureFrom) {
        departureFromPicker.setDate(savedDepartureFrom, true);
    } else {
        departureFromPicker.setDate(new Date(), true); // Default to current date if no stored value
    }

    if (savedDepartureTo) {
        departureToPicker.setDate(savedDepartureTo, true);
    } else {
        departureToPicker.setDate(new Date(), true); // Default to current date if no stored value
    }
    isSyncingDates = false;
    ensureToNotBeforeFrom();

    const savedLayoverFrom = localStorage.getItem('layover-from');
    $('#layover-from').val(savedLayoverFrom !== null && savedLayoverFrom !== '' ? savedLayoverFrom : 0);

    const savedLayoverTo = localStorage.getItem('layover-to');
    $('#layover-to').val(savedLayoverTo !== null && savedLayoverTo !== '' ? savedLayoverTo : 12);

    const savedTimeFormat = localStorage.getItem('time-format');
    if (savedTimeFormat) $('#time-format').val(savedTimeFormat);

    // Initialize DataTable with updated column titles
    const table = $('#flights-table').DataTable({
        columns: [
            { data: 'STD', title: 'STD', render: dataTableDatetime_addTimemodeSufix }, // Departure time
            { data: 'ORIGIN', title: 'ORIGIN' },        // Departure airport
            { data: 'STA', title: 'STA', render: dataTableDatetime_addTimemodeSufix  }, // Arrival time at stop (if applicable)
            { data: 'STOP', title: 'STOP' },            // Stopover airport (if applicable)
            { data: 'LAYOVER', title: 'LAYOVER' },      // Layover duration (if applicable)
            { data: 'STD_STOP', title: 'STD_STOP', render: dataTableDatetime_addTimemodeSufix  }, // Departure time from stop (if applicable)
            { data: 'DEST', title: 'DEST' },            // Final destination
            { data: 'STA_DEST', title: 'STA_DEST', render: dataTableDatetime_addTimemodeSufix }, // Arrival time at destination
            { data: 'TOTAL_DURATION', title: 'TOTAL_DURATION' }, // Total journey duration
            {
                title: 'Actions',
                orderable: false,
                searchable: false,
                render: function(data, type, row) {
                    const flight1Url = buildFlightUrl(row, 0); // First segment
                    const flight2Url = row.STOP ? buildFlightUrl(row, 1) : null; // Second segment if stopover
                    return `
                        <a href="${generateGoogleCalendarUrl(row)}" target="_blank" class="btn btn-sm btn-outline-secondary"> 
                            <i class="bi bi-calendar3"> </i> <i class="bi bi-google"> </i> 
                        </a>
                        <button class="btn btn-sm btn-outline-primary" onclick="window.open('${flight1Url}', '_blank')">
                            <i class="bi bi-airplane"></i> Flight 1
                        </button>
                        ${row.STOP ? `
                            <button class="btn btn-sm btn-outline-primary" onclick="window.open('${flight2Url}', '_blank')">
                                <i class="bi bi-airplane"></i> Flight 2
                            </button>
                        ` : ''}
                    `;
                }
            }
        ],
		columnDefs: [
            { targets: [1, 3, 6], width: '60px' } // Narrow width for ORIGIN, STOP, DEST
        ],
        responsive: true,
        order: [[0, 'asc']], // Sort by STD by default
        pageLength: 100      // Set pagination to 100 rows per page
    });

    table.clear().draw(); // Clear the table initially
    $('#tile-view-btn').click(); // Switch to tile view by default
	
	// Add CSS to prevent wrapping in date-time columns
    $('<style>').text(`
        #flights-table td {
            white-space: nowrap;
        }
    `).appendTo('head');

    // Fetch airport list (replace with actual API endpoint)
    fetch(`https://${config.flightsApiHost}/views/locate/5/airports/en/active`)
        .then(response => response.ok ? response.json() : Promise.reject('Network error'))
        .then(data => {
            data.forEach(airport => {
                airportNames[airport.code] = airport.name;
                airportTimeZones[airport.code] = airport.timeZone;
                const option = `<option value="${airport.code}">${airport.name} (${airport.code})</option>`;
                $('#origins').append(option);
                $('#destinations').append(option);
            });

            const savedOrigins = localStorage.getItem('origins');
            if (savedOrigins) {
                const originsArray = JSON.parse(savedOrigins);
                $('#origins').val(originsArray).trigger('change');
            }

            const savedDestinations = localStorage.getItem('destinations');
            if (savedDestinations) {
                const destinationsArray = JSON.parse(savedDestinations);
                $('#destinations').val(destinationsArray).trigger('change');
            }
        })
        .catch(error => {
            console.error('Error fetching airports:', error);
            alert('Failed to load airport list.');
        });

    // Handle form submission
    $('#flight-search-form').on('submit', async function(event) {
        event.preventDefault();

        // Get form values
        const origins = $('#origins').val();
        const destinations = $('#destinations').val();
        const departureFrom = $('#departure-from').val();
        const departureTo = $('#departure-to').val();
        const layoverFrom = $('#layover-from').val() || 0;
        const layoverTo = $('#layover-to').val() || 12;
        const timeMode = $('#time-format').val();

        // Save form values to localStorage
        localStorage.setItem('origins', JSON.stringify(origins));
        localStorage.setItem('destinations', JSON.stringify(destinations));
        localStorage.setItem('departure-from', departureFrom);
        localStorage.setItem('departure-to', departureTo);
        localStorage.setItem('layover-from', layoverFrom === '' ? '' : layoverFrom);
        localStorage.setItem('layover-to', layoverTo === '' ? '' : layoverTo);
        localStorage.setItem('time-format', timeMode);

        // Show loading and disable button
        $('#loading').show();
        $('button[type="submit"]').prop('disabled', true);

        // Clear table
        table.clear().draw();

        // Clear tiles
        $('#tiles-container').empty();

        // Clear checkbox
        $('#direct-flights-only').prop('checked', false);

        try {
            // Create array of fetch promises
            const promises = [];
            for (const origin of origins) {
                for (const destination of destinations) {
                    const url = `https://${config.flightsApiHost}/timtbl/v3/journeys/${origin}/${destination}?` +
                                `departureDateFrom=${departureFrom}&departureDateTo=${departureTo}&` +
                                `timeMode=${timeMode}&layoverFrom=${layoverFrom}&layoverTo=${layoverTo}`;
                    const promise = fetch(url).then(response => {
                        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                        return response.json();
                    });
                    promises.push(promise);
                }
            }

            // Wait for all API calls to finish
            const allResponses = await Promise.all(promises);
            allJourneys = allResponses.flat();

            // Process and display flights
            processFlights(allJourneys, table);
        } catch (error) {
            console.error('Error fetching flights:', error);
            alert('Failed to fetch flight data. Please try again.');
        } finally {
            // Hide loading and enable button
            $('#loading').hide();
            $('button[type="submit"]').prop('disabled', false);
        }
    });

    // Helper functions
    function formatDateTime(dateTime) {
        return moment(dateTime).format('YYYY-MM-DD HH:mm');
    }

    function formatDuration(durationStr) {
        const [hours, minutes] = durationStr.split(':').map(Number);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    function dataTableDatetime_addTimemodeSufix(data, type, row) {
        if (type === 'display') {
            const suffix = row.TIME_MODE === 'UTC' ? 'z' : ' LT';
            return data ? data + suffix : data;
        }
        return data;
    }

    function generateGoogleCalendarUrl(flight) {

        let timeModeSuffix = flight.TIME_MODE === 'LOCAL' ? ' LT' : 'z';
        let startTime = moment(flight.DEPARTURE_DATE, 'YYYY-MM-DD HH:mm').format('YYYYMMDDTHHmmss')+ 'Z';;
        let endTime = moment(flight.ARRIVAL_DATE, 'YYYY-MM-DD HH:mm').format('YYYYMMDDTHHmmss')+ 'Z';;

        // If timeMode is LOCAL, convert times to UTC using the airports' timezones
        if (flight.TIME_MODE === 'LOCAL') {
            const startTimeZone = airportTimeZones[flight.ORIGIN];
            const endTimeZone = airportTimeZones[flight.DEST];

            if (!startTimeZone || !endTimeZone) {
                console.warn(`Timezone not found for airports: ${startAirportCode} or ${endAirportCode}`);
                // Fallback to no conversion if timezone is missing
            } else {
                // Convert local times to UTC
                startTime = moment.tz(flight.DEPARTURE_DATE, 'YYYY-MM-DD HH:mm', startTimeZone).utc().format('YYYYMMDDTHHmmss')+ 'Z';;
                endTime = moment.tz(flight.ARRIVAL_DATE, 'YYYY-MM-DD HH:mm', endTimeZone).utc().format('YYYYMMDDTHHmmss')+ 'Z';;
            }
        }
    
        // Get airport names, falling back to codes if not found
        const origin = airportNames[flight.ORIGIN] || flight.ORIGIN;
        const destination = airportNames[flight.DEST] || flight.DEST;
        const stopover = flight.STOP ? airportNames[flight.STOP] || flight.STOP : null;
    
        // Build the event title
        let title = `Flight ${origin} to ${destination}`;
        if (stopover) {
            title += ` via ${stopover}`; // Add stopover to title
        }
    
        // Build the event description
        const departureDate = moment(flight.DEPARTURE_DATE, 'YYYY-MM-DD HH:mm').format('ddd, MMM D');
        const arrivalDate = moment(flight.ARRIVAL_DATE, 'YYYY-MM-DD HH:mm').format('ddd, MMM D');

        // Build the event description to match the specified format
        let description = `Depart • ${departureDate}\n\n`;

        // First segment: Departure to Stop (or Destination if direct)
        description += `${moment(flight.STD, 'YYYY-MM-DD HH:mm').format('HH:mm')}${timeModeSuffix} ${origin} (${flight.ORIGIN}) | `;
        description += `${moment(flight.STA || flight.STA_DEST, 'YYYY-MM-DD HH:mm').format('HH:mm')}${timeModeSuffix} ${stopover ? stopover : destination} (${stopover ?  flight.STOP : flight.DEST}) | `;
        description += `Flight time ${calculateFlightDuration(flight.STD, flight.STA || flight.STA_DEST, flight.ORIGIN, stopover ? flight.STOP : flight.DEST, flight.TIME_MODE)}\n`;

        // Stopover section (if applicable)
        if (stopover) {
            description += `\n- Stopover for ${flight.LAYOVER} in ${stopover} (${flight.STOP})\n\n`;
            // Second segment: Stop to Destination
            description += `${moment(flight.STD_STOP, 'YYYY-MM-DD HH:mm').format('HH:mm')}${timeModeSuffix} ${stopover} (${flight.STOP}) | `;
            description += `${moment(flight.STA_DEST, 'YYYY-MM-DD HH:mm').format('HH:mm')}${timeModeSuffix} ${destination} (${flight.DEST}) | `;
            description += `Flight time ${calculateFlightDuration(flight.STD_STOP, flight.STA_DEST, flight.STOP, flight.DEST, flight.TIME_MODE)}\n`;
        }

        // Footer
        description += `\nArrive • ${arrivalDate}`;
    
        // Construct the Google Calendar URL
        const baseUrl = 'https://www.google.com/calendar/render';
        const params = new URLSearchParams({
            action: 'TEMPLATE',                    // New event template
            text: title,                           // Event title with stopover
            dates: `${startTime}/${endTime}`,      // Start and end times
            details: description,                  // Description with stopover details
            location: `Departure: ${origin}, Arrival: ${destination}` // Location field
        });
    
        return `${baseUrl}?${params.toString()}`;
    }

    // Helper function to calculate flight duration between two times
    function calculateFlightDuration(start, end, startAirportCode, endAirportCode, timeMode) {
        let startTime = moment(start, 'YYYY-MM-DD HH:mm');
        let endTime = moment(end, 'YYYY-MM-DD HH:mm');

        // If timeMode is LOCAL, convert times to UTC using the airports' timezones
        if (timeMode === 'LOCAL') {
            const startTimeZone = airportTimeZones[startAirportCode];
            const endTimeZone = airportTimeZones[endAirportCode];

            if (!startTimeZone || !endTimeZone) {
                console.warn(`Timezone not found for airports: ${startAirportCode} or ${endAirportCode}`);
                // Fallback to no conversion if timezone is missing
            } else {
                // Convert local times to UTC
                startTime = moment.tz(start, 'YYYY-MM-DD HH:mm', startTimeZone).utc();
                endTime = moment.tz(end, 'YYYY-MM-DD HH:mm', endTimeZone).utc();
            }
        }

        const diffMinutes = endTime.diff(startTime, 'minutes');
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return `${hours}h ${minutes}m`;
    }

    function calculateLayover(arrival, departure) {
        const arrivalTime = moment(arrival);
        const departureTime = moment(departure);
        const diffMinutes = departureTime.diff(arrivalTime, 'minutes');
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    function buildFlightUrl(flight, segmentIndex) {
        // Determine origin and destination based on segment
        let originIata, destinationIata, departureDate;
        if (segmentIndex === 0) {
            // First segment: Origin to Stop (or Dest if direct)
            originIata = flight.ORIGIN;
            destinationIata = flight.STOP || flight.DEST;
            departureDate = moment(flight.STD, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DD');
        } else {
            // Second segment: Stop to Dest
            originIata = flight.STOP;
            destinationIata = flight.DEST;
            departureDate = moment(flight.STD_STOP, 'YYYY-MM-DD HH:mm').format('YYYY-MM-DD');
        }
    
        return `https://www.ryanair.com/ie/en/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut=${departureDate}&dateIn=&isConnectedFlight=false&isReturn=false&discount=0&promoCode=&originIata=${originIata}&destinationIata=${destinationIata}`;
    }

    function createTile(flight, index) {
        // Extract date from STD for the header (e.g., "2025-04-24 08:15" -> "Thu, Apr 24")
        const departureDate = moment(flight.DEPARTURE_DATE, 'YYYY-MM-DD HH:mm').format('ddd, MMM D');
        const arrivalDate = moment(flight.ARRIVAL_DATE, 'YYYY-MM-DD HH:mm').format('ddd, MMM D');

        const originName = airportNames[flight.ORIGIN] || flight.ORIGIN;
        const destName = airportNames[flight.DEST] || flight.DEST;
        const stopName = flight.STOP ? (airportNames[flight.STOP] || flight.STOP) : '';
        let isDirect = stopName !== '' ? false : true;
        let timeModeSuffix = flight.TIME_MODE === 'LOCAL' ? ' LT' : 'z';

        // Build URLs for each flight segment
        const flight1Url = buildFlightUrl(flight, 0); // First flight segment
        const flight2Url = flight.STOP ? buildFlightUrl(flight, 1) : null; // Second flight segment (if stopover exists)

        return `
            <div class="tile ${isDirect ? 'direct' : ''}">
                <div class="tile-header">
                    <span class="date">Depart • ${departureDate}</span>
                    <span class="duration">Duration • ${flight.TOTAL_DURATION}</span>
                </div>
                <div class="timeline">
                    <div class="timeline-point">
                        <p class="time">${moment(flight.STD, 'YYYY-MM-DD HH:mm').format('HH:mm')}${timeModeSuffix}</p>
                        <p class="airport">${originName} (${flight.ORIGIN})</p>
                        ${flight.STOP ? `<p class="duration">${calculateFlightDuration(flight.STD, flight.STA, flight.ORIGIN, flight.STOP, flight.TIME_MODE)}</p>` : ''}
                    </div>
                    ${flight.STOP ? `
                        <div class="timeline-point flight">
                            <p class="time">${moment(flight.STA, 'YYYY-MM-DD HH:mm').format('HH:mm')}${timeModeSuffix}</p>
                            <p class="airport">${stopName} (${flight.STOP})</p>
                        </div>
                        
                        <div class="stopover">
                            ${flight.LAYOVER} • Stopover in ${stopName} (${flight.STOP})
                        </div>
                        <div class="timeline-point">
                            <p class="time">${moment(flight.STD_STOP, 'YYYY-MM-DD HH:mm').format('HH:mm')}${timeModeSuffix}</p>
                            <p class="airport">${stopName} (${flight.STOP})</p>
                            <p class="duration">${calculateFlightDuration(flight.STD_STOP, flight.STA_DEST, flight.STOP, flight.DEST, flight.TIME_MODE)}</p>
                        </div>
                    ` : ''}
                    <div class="timeline-point">
                        <p class="time">${moment(flight.STA_DEST, 'YYYY-MM-DD HH:mm').format('HH:mm')}${timeModeSuffix}</p>
                        <p class="airport">${destName} (${flight.DEST})</p>
                    </div>
                    
                    
                </div>
                <div class="tile-footer">
                    <span class="date">Arrive • ${arrivalDate}</span>
                </div>
                <div class="tile-actions"> 
                    <a href="${generateGoogleCalendarUrl(flight)}" target="_blank" class="btn btn-sm btn-outline-secondary"> 
                        <i class="bi bi-calendar3"> </i> <i class="bi bi-google"> </i> 
                    </a>
                    <button class="btn btn-sm btn-outline-primary" onclick="window.open('${flight1Url}', '_blank')">
                        <i class="bi bi-airplane"></i> Flight 1
                    </button>
                    ${flight.STOP ? `
                        <button class="btn btn-sm btn-outline-primary" onclick="window.open('${flight2Url}', '_blank')">
                                <i class="bi bi-airplane"></i> Flight 2
                        </button>
                        ` : ``}
                </div>
            </div>
        `;
    }

    // Process flight data and populate table
    function processFlights(journeys, table) {
        allFlights = [];
        let tilesHtml = '';

        // Sort journeys by departureDateTime in ascending order
        journeys.sort((a, b) => {
            const dateA = moment(a.departureDateTime);
            const dateB = moment(b.departureDateTime);
            return dateA - dateB; // Ascending order
        });

        journeys.forEach((journey,index) => {
            const flights = journey.flights;
            let flightData = {};

            if (flights.length === 1) {
                // Direct flight
                const flight = flights[0];
                flightData = {
                    TIME_MODE: $('#time-format').val(), // Local or UTC
                    STD: formatDateTime(flight.departureDateTime),
                    ORIGIN: flight.departureAirportCode,
                    STA: '', // Empty for direct flights
                    STOP: '', // No stopover
                    LAYOVER: '', // No layover
                    STD_STOP: '', // No stopover departure
                    DEST: flight.arrivalAirportCode,
                    STA_DEST: formatDateTime(flight.arrivalDateTime),
                    TOTAL_DURATION: formatDuration(journey.duration),
                    DEPARTURE_DATE: journey.departureDateTime, // For the header
                    ARRIVAL_DATE: journey.arrivalDateTime // For the footer
                };
            } else if (flights.length === 2) {
                // Connecting flight
                const firstFlight = flights[0];
                const secondFlight = flights[1];
                const layover = calculateLayover(firstFlight.arrivalDateTime, secondFlight.departureDateTime);
                flightData = {
                    TIME_MODE: $('#time-format').val(), // Local or UTC
                    STD: formatDateTime(firstFlight.departureDateTime),
                    ORIGIN: firstFlight.departureAirportCode,
                    STA: formatDateTime(firstFlight.arrivalDateTime),
                    STOP: firstFlight.arrivalAirportCode,
                    LAYOVER: layover,
                    STD_STOP: formatDateTime(secondFlight.departureDateTime),
                    DEST: secondFlight.arrivalAirportCode,
                    STA_DEST: formatDateTime(secondFlight.arrivalDateTime),
                    TOTAL_DURATION: formatDuration(journey.duration),
                    DEPARTURE_DATE: journey.departureDateTime, // For the header
                    ARRIVAL_DATE: journey.arrivalDateTime // For the footer
                };
            } else {
                console.warn('Unsupported journey with multiple stops:', journey);
                return;
            }

            allFlights.push(flightData);

            // Add data to the table using the object properties
            table.row.add(flightData).draw();

            // Generate a tile for the UI
            const tile = createTile(flightData, index);
            tilesHtml += tile;


        });

        // Render all tiles in the container
        $('#tiles-container').html(tilesHtml);
    }
});
