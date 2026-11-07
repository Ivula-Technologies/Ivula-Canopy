// One-on-one Google Meet calls with Bius. The default goes to the booking page
// on the Ivula website, which shows his Google Calendar appointment schedule.
// Set NEXT_PUBLIC_BOOKING_URL at build time to send Canopy users elsewhere.
export const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL || 'https://www.ivulatechnologies.com/book/?about=canopy'
