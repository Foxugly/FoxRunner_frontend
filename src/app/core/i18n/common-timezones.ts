/**
 * Curated IANA timezone list used as the source for the profile timezone
 * autocomplete. The backend no longer exposes `/timezones/common`, so this
 * list is shipped with the frontend.
 *
 * Coverage: every timezone emitted by `Intl.supportedValuesOf('timeZone')`
 * when that API is available, otherwise a static pan-continental fallback.
 * The default is `Europe/Brussels` to match `APP_TIMEZONE` on the backend.
 */
const FALLBACK_IANA_ZONES = [
  'UTC',
  'Europe/Brussels',
  'Europe/Paris',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Lisbon',
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/Zurich',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Kiev',
  'Europe/Moscow',
  'Africa/Casablanca',
  'Africa/Algiers',
  'Africa/Tunis',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Asia/Jerusalem',
  'Asia/Dubai',
  'Asia/Tehran',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Montreal',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Caracas',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'Pacific/Honolulu',
] as const;

function resolveZones(): readonly string[] {
  const api = (
    Intl as unknown as {
      supportedValuesOf?: (key: 'timeZone') => string[];
    }
  ).supportedValuesOf;
  if (typeof api === 'function') {
    try {
      const zones = api('timeZone');
      if (Array.isArray(zones) && zones.length > 0) return zones;
    } catch {
      /* fall through to static list */
    }
  }
  return FALLBACK_IANA_ZONES;
}

export const COMMON_TIMEZONES: readonly string[] = resolveZones();

export const DEFAULT_TIMEZONE = 'Europe/Brussels';
