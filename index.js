import axios from 'axios';

const bookingsToMake = [
  {
    name: 'stephendg',
    id_number: process.env.STEPHENDG,
    days_of_week: [4, 5], // 0 = Sunday && 6 = Saturday
    event: 'cycle',
    earliest_start_time: '05:00:00',
    latest_end_time: '07:30:00',
    days_to_book_in_advance: 8,
    club_id: 506,
  },
  {
    name: 'kate',
    id_number: process.env.KATE,
    days_of_week: [2, 5], // 0 = Sunday && 6 = Saturday
    event: 'cycle',
    earliest_start_time: '06:15:00',
    latest_end_time: '07:00:00',
    days_to_book_in_advance: 8,
    club_id: 506,
  },
  {
    name: 'tristan',
    id_number: process.env.TRISTAN,
    days_of_week: [2, 5], // 0 = Sunday && 6 = Saturday
    event: 'cycle',
    earliest_start_time: '06:15:00',
    latest_end_time: '07:00:00',
    days_to_book_in_advance: 8,
    club_id: 506,
  },
];

// Define the API endpoints
const validateUserCardIdEndpoint = 'https://my.virginactive.co.za/scripts/validate_user_card_id.php';
const userBookingEndpoint = 'https://my.virginactive.co.za/scripts/booking.php';
const timetableBookingsEndpoint = 'https://my.virginactive.co.za/scripts/timetable_bookings.php';

// const toJSON = ({ idNumber, daysOfWeek, event, earliestStartTime, latestEndTime, daysToBookInAdvance, clubId }) => {
//   return {
//     id_number: idNumber,
//     days_of_week: daysOfWeek,
//     event,
//     earliest_start_time: earliestStartTime,
//     latest_end_time: latestEndTime,
//     days_to_book_in_advance: daysToBookInAdvance,
//     club_id: clubId,
//   };
// };

const fromJSON = ({
  name,
  id_number,
  days_of_week,
  event,
  earliest_start_time,
  latest_end_time,
  days_to_book_in_advance,
  club_id,
}) => {
  return {
    name,
    idNumber: id_number,
    daysOfWeek: days_of_week,
    event,
    earliestStartTime: earliest_start_time,
    latestEndTime: latest_end_time,
    daysToBookInAdvance: days_to_book_in_advance,
    clubId: club_id,
  };
};

const scheduleEvents = async ({
  name,
  idNumber,
  daysOfWeek,
  event,
  earliestStartTime,
  latestEndTime,
  daysToBookInAdvance,
  clubId,
}) => {
  const memberIdentifier = idNumber;
  const allowedDaysOfWeek = daysOfWeek;
  const eventToBook = event;
  const dayOfMonthToBook = new Date().getDate() + daysToBookInAdvance;

  console.log(`Starting auto scheduler for ${name}`);
  try {
    console.log('Fetching the login token');
    const {
      data: { token, preferred_club: preferredClub, name, email },
    } = await axios
      .post(validateUserCardIdEndpoint, { member_identifier: memberIdentifier })
      .then((response) => {
        console.log('Login token found');
        return response;
      })
      .catch(() => {
        console.log('Error fetching login token');
      });

    console.log('Fetching user schedule');
    const { data: userEvents } = await axios
      .post(userBookingEndpoint, { action: 'get', token })
      .then((response) => {
        console.log('User schedule found');
        return response;
      })
      .catch(() => {
        console.log('Error fetching user schedule');
      });

    console.log(`Create user calendar event id's array`);
    const userCalendarEventIds = userEvents.map((userEvent) => userEvent.CalendarEventId);

    console.log('Fetching club schedule');
    const {
      data: {
        ClubTimetable: { Events: clubEvents },
      },
    } = await axios
      .post(timetableBookingsEndpoint, { clubId, EventTypeId: 1 })
      .then((response) => {
        console.log('Club schedule found');
        return response;
      })
      .catch(() => {
        console.log('Error fetching club schedule');
      });

    console.log('Filter the events for parameters');
    const filteredEvents = clubEvents.filter((filteredEvent) => {
      return (
        filteredEvent.EventName.toLowerCase().indexOf(eventToBook.toLowerCase()) >= 0 && // Check the event name
        allowedDaysOfWeek.includes(new Date(filteredEvent.Date).getDay()) && // Check the dates you want to book
        new Date(`${filteredEvent.Date}T${filteredEvent.EndTime}`) <=
          new Date(`${filteredEvent.Date}T${latestEndTime}`) && // Check the latest end time
        new Date(`${filteredEvent.Date}T${filteredEvent.StartTime}`) >=
          new Date(`${filteredEvent.Date}T${earliestStartTime}`) && // Check the earliest start time
        dayOfMonthToBook === new Date(filteredEvent.Date).getDate() // Check the correct date
      );
    });

    if (filteredEvents[0]) {
      console.log('Filtered events exist!');

      console.log('Considering the following events: ', filteredEvents);

      console.log('Checking if any of the events have already been booked');
      const eventAlreadyBooked = filteredEvents.find((filteredEvent) =>
        userCalendarEventIds.includes(filteredEvent.CalendarEventId),
      );

      if (eventAlreadyBooked) {
        console.log(`Event already booked for ${dayOfMonthToBook}. No bookings made.`);
        return;
      }

      console.log(`No existing bookings found for day of month ${dayOfMonthToBook}`);
      console.log('Checking if there are any slots available to book');
      const eventToBook = filteredEvents.find(
        (filteredEvent) => filteredEvent.BookingSlots != filteredEvent.AlreadyBookedSlots,
      );

      if (eventToBook) {
        console.log('Available slots found!');

        const bookingInfo = {
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
        };

        console.log('Booking the following event');
        console.log(bookingInfo);

        await axios
          .post(userBookingEndpoint, bookingInfo)
          .then(() => {
            console.log('Event successfully booked');
          })
          .catch(() => {
            console.log('Error making the booking');
          });
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
  for (const booking of bookingsToMake) {
    await scheduleEvents(fromJSON(booking));
  }
  console.log(`Your cron function "${context.functionName}" ran at ${time}`);
};
