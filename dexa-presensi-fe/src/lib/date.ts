import { formatInTimeZone } from 'date-fns-tz';
import { enGB } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
export let ZONE = 'UTC';
export function configureTimezone(zone: string) {
  new Intl.DateTimeFormat('en', { timeZone: zone }).format();
  ZONE = zone;
}
export function zoneLabel() {
  return ZONE === 'Asia/Jakarta' ? 'WIB' : ZONE;
}
export const time = (value?: string | null) =>
  value ? `${formatInTimeZone(value, ZONE, 'HH:mm', { locale: enGB })} ${zoneLabel()}` : '—';
export const date = (value: string) => format(parseISO(value), 'd MMMM yyyy', { locale: enGB });
export const today = () => formatInTimeZone(new Date(), ZONE, 'yyyy-MM-dd');
