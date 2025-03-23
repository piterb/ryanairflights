$(document).ready(function() {

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

    // Load form values from localStorage and apply them
        const savedDepartureFrom = localStorage.getItem('departure-from');
    if (savedDepartureFrom) {
        departureFromPicker.setDate(savedDepartureFrom, true);
    } else {
        departureFromPicker.setDate(new Date(), true); // Default to current date if no stored value
    }

    const savedDepartureTo = localStorage.getItem('departure-to');
    if (savedDepartureTo) {
        departureToPicker.setDate(savedDepartureTo, true);
    } else {
        departureToPicker.setDate(new Date(), true); // Default to current date if no stored value
    }

    const savedLayoverFrom = localStorage.getItem('layover-from');
    $('#layover-from').val(savedLayoverFrom !== null && savedLayoverFrom !== '' ? savedLayoverFrom : 0);

    const savedLayoverTo = localStorage.getItem('layover-to');
    $('#layover-to').val(savedLayoverTo !== null && savedLayoverTo !== '' ? savedLayoverTo : 12);

    const savedTimeFormat = localStorage.getItem('time-format');
    if (savedTimeFormat) $('#time-format').val(savedTimeFormat);

    // Initialize DataTable with updated column titles
    const table = $('#flights-table').DataTable({
        columns: [
            { title: 'STD' },                    // Departure time from origin
            { title: 'ORIGIN' },                 // Origin airport code
            { title: 'STA' },            // Arrival time at stop (empty for direct)
            { title: 'STOP' },           // Stopover airport code
            { title: 'LAYOVER' },        // Layover duration
            { title: 'STD' },          // Departure time from stop
            { title: 'DEST' },            // Destination airport code
            { title: 'STA' },     // Arrival time at destination
            { title: 'Total duration' }  // Total journey duration
        ],
		columnDefs: [
            { targets: [1, 3, 6], width: '60px' } // Narrow width for ORIGIN, STOP, DEST
        ],
        responsive: true,
        order: [[8, 'asc']], // Sort by total duration by default
        pageLength: 100      // Set pagination to 100 rows per page
    });
	
	// Add CSS to prevent wrapping in date-time columns
    $('<style>').text(`
        #flights-table td {
            white-space: nowrap;
        }
    `).appendTo('head');

    // Fetch airport list (replace with actual API endpoint)
    fetch('https://services-api.ryanair.com/views/locate/5/airports/en/active')
        .then(response => response.ok ? response.json() : Promise.reject('Network error'))
        .then(data => {
            data.forEach(airport => {
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

        try {
            // Create array of fetch promises
            const promises = [];
            for (const origin of origins) {
                for (const destination of destinations) {
                    const url = `https://services-api.ryanair.com/timtbl/v3/journeys/${origin}/${destination}?` +
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
            const allJourneys = allResponses.flat();

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
});

// Helper functions
function formatDateTime(dateTime) {
    return moment(dateTime).format('YYYY-MM-DD HH:mm');
}

function formatDuration(durationStr) {
    const [hours, minutes] = durationStr.split(':').map(Number);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateLayover(arrival, departure) {
    const arrivalTime = moment(arrival);
    const departureTime = moment(departure);
    const diffMinutes = departureTime.diff(arrivalTime, 'minutes');
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Process flight data and populate table
function processFlights(journeys, table) {
    journeys.forEach(journey => {
        const flights = journey.flights;
        let rowData = [];

        if (flights.length === 1) {
            // Direct flight
            const flight = flights[0];
            rowData = [
                formatDateTime(flight.departureDateTime), // STD
                flight.departureAirportCode,              // ORIGIN
                '',                                       // STA at stop (empty)
                '',                                       // STOP AIRPORT (empty)
                '',                                       // LAYOVER (empty)
                '',                                       // STD from stop (empty)
                flight.arrivalAirportCode,                // DESTINATION
                formatDateTime(flight.arrivalDateTime),   // STA at destination
                formatDuration(journey.duration)          // Total duration
            ];
        } else if (flights.length === 2) {
            // Connecting flight
            const firstFlight = flights[0];
            const secondFlight = flights[1];
            const layover = calculateLayover(firstFlight.arrivalDateTime, secondFlight.departureDateTime);
            rowData = [
                formatDateTime(firstFlight.departureDateTime),    // STD
                firstFlight.departureAirportCode,                 // ORIGIN
                formatDateTime(firstFlight.arrivalDateTime),      // STA at stop
                firstFlight.arrivalAirportCode,                   // STOP AIRPORT
                layover,                                          // LAYOVER
                formatDateTime(secondFlight.departureDateTime),   // STD from stop
                secondFlight.arrivalAirportCode,                  // DESTINATION
                formatDateTime(secondFlight.arrivalDateTime),     // STA at destination
                formatDuration(journey.duration)                  // Total duration
            ];
        } else {
            console.warn('Unsupported journey with multiple stops:', journey);
            return;
        }

        table.row.add(rowData).draw();
    });
}