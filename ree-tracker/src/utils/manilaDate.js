// src/utils/manilaDate.js
// Re-export shim — Manila calendar-day bucketing now lives in @ree/shared so
// "today" cannot mean two different things across the two packages.
//
// The locale (en-CA, which yields the ISO-like YYYY-MM-DD shape) and the zone
// are load-bearing, and each side previously owned its own Intl formatter with
// nothing enforcing that they agreed. The backend keeps its own manilaDaySql
// helper, which is genuinely backend-only: it encodes the naive-timestamp
// two-step conversion that has no client equivalent.
export { todayManila, yesterdayManila, manilaDateOf } from '@ree/shared';
