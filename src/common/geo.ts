/** Great-circle distance in miles (Haversine). */
export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3959;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Normalise a UK postcode: uppercase, single space before the inward code. */
export function normalisePostcode(postcode: string): string {
  const compact = postcode.replace(/\s+/g, '').toUpperCase();
  return compact.length > 3
    ? `${compact.slice(0, -3)} ${compact.slice(-3)}`
    : compact;
}

/** Outward code ("SW1A 1AA" → "SW1A"): the only location shared before shortlisting. */
export function postcodeDistrict(
  postcode: string | null | undefined,
): string | null {
  if (!postcode) return null;
  return normalisePostcode(postcode).split(' ')[0] || null;
}
