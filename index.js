import axios from 'axios';

// Define environment variables
const memberIdentifier = '9103185163089';
const datesToBook = [1, 4, 5]; // 0 = Sunday && 6 = Saturday
const eventsToBook = ['Cycle'];
const latestEndTime = '07:30:00';
const dateToBook = new Date().getDate() + 7;
const clubId = 506; // Virgin Active Point

// Define the API endpoints
const validateUserCardIdEndpoint = 'https://my.virginactive.co.za/scripts/validate_user_card_id.php';
const userBookingEndpoint = 'https://my.virginactive.co.za/scripts/booking.php';
const timetableBookingsEndpoint = 'https://my.virginactive.co.za/scripts/timetable_bookings.php';

const scheduleEvents = async () => {
  try {
    // Get the login token
    const {
      data: { token, preferred_club: preferredClub, name, email },
    } = await axios.post(validateUserCardIdEndpoint, { member_identifier: memberIdentifier });

    // Get the user schedule
    const { data: userEvents } = await axios.post(userBookingEndpoint, { action: 'get', token });
    const userCalendarEventIds = userEvents.map((userEvent) => userEvent.CalendarEventId);

    // Get the club's schedule
    const {
      data: {
        ClubTimetable: { Events: clubEvents },
      },
    } = await axios.post(timetableBookingsEndpoint, { clubId, EventTypeId: 1 });

    // Filter the events by name and end time
    const filteredEvents = clubEvents.filter(
      (filteredEvent) =>
        eventsToBook.includes(filteredEvent.EventName) && // Check the event name
        datesToBook.includes(new Date(filteredEvent.Date).getDay()) && // Check the dates you want to book
        new Date(`${filteredEvent.Date}T${filteredEvent.EndTime}`) <=
          new Date(`${filteredEvent.Date}T${latestEndTime}`) && // Check the latest end time
        dateToBook === new Date(filteredEvent.Date).getDate(), // Check the correct date
    );

    if (filteredEvents) {
      // Check if we've already booked one of the events
      const eventAlreadyBooked = filteredEvents.find((filteredEvent) =>
        userCalendarEventIds.includes(filteredEvent.CalendarEventId),
      );

      if (eventAlreadyBooked) {
        console.log(`Event already booked for ${dateToBook}. No bookings made.`);
        return;
      }

      // Find the first event that isn't fully booked
      const eventToBook = filteredEvents.find(
        (filteredEvent) => filteredEvent.BookingSlots != filteredEvent.AlreadyBookedSlots,
      );

      if (eventToBook) {
        await axios.post(userBookingEndpoint, {
          action: 'create',
          CalendarEventId: eventToBook.CalendarEventId,
          EventName: eventToBook.EventName,
          clubId: preferredClub,
          StartTime: eventToBook.StartTime,
          EndTime: eventToBook.EndTime,
          PersonnelName: eventToBook.PersonnelName,
          Studio: eventToBook.LocationName,
          ClubName: eventToBook.ClubName,
          Name: name,
          FullDate: eventToBook.Date,
          token,
          email,
          comms_preferences: '1',
          clubId,
        });
        console.log(`Booked ${eventToBook.EventName} on ${eventToBook.Date} at ${eventToBook.StartTime}`);
      } else {
        console.log('Events fully booked. No bookings made.');
      }
    } else {
      console.log('No events found. No bookings made.');
    }
  } catch (error) {
    console.log(error);
  }
};

export const run = async (event, context) => {
  const time = new Date();
  await scheduleEvents();
  console.log(`Your cron function "${context.functionName}" ran at ${time}`);
};
