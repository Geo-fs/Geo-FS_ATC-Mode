const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const distanceMeters = (
  originLat: number,
  originLon: number,
  targetLat: number,
  targetLon: number
): number => {
  const dLat = toRadians(targetLat - originLat);
  const dLon = toRadians(targetLon - originLon);
  const lat1 = toRadians(originLat);
  const lat2 = toRadians(targetLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
};

export const bearingDegrees = (
  originLat: number,
  originLon: number,
  targetLat: number,
  targetLon: number
): number => {
  const lat1 = toRadians(originLat);
  const lat2 = toRadians(targetLat);
  const dLon = toRadians(targetLon - originLon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return (bearing + 360) % 360;
};

export const normalizeHeading = (heading: number): number => {
  const normalized = heading % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};
