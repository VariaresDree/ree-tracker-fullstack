// Scheduled reminders: the hours the server can send one at. The scheduler
// (.github/workflows/reminders.yml) runs hourly 06:00–23:00 Manila, and each
// run also sends the two hours before it (a late run still delivers), so a
// reminder set for 04:00–23:00 is sent by the server. Outside that, the app
// keeps the phone's own reminder (it never relies on a server that won't come).

'use strict';

const SERVER_REMINDER_FIRST_HOUR = 4;
const SERVER_REMINDER_LAST_HOUR = 23;

/** Whether the server sends a reminder set for this Manila hour. */
function serverRemindsAt(hour) {
    return Number.isInteger(hour) && hour >= SERVER_REMINDER_FIRST_HOUR && hour <= SERVER_REMINDER_LAST_HOUR;
}

module.exports = { SERVER_REMINDER_FIRST_HOUR, SERVER_REMINDER_LAST_HOUR, serverRemindsAt };
