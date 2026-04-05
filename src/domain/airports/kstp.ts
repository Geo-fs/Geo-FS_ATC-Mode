import type { AirportDefinition } from "./types";

export const KSTP_AIRPORT: AirportDefinition = {
  icao: "KSTP",
  iata: "STP",
  name: "St Paul Downtown Airport",
  city: "Saint Paul",
  latitude: 44.9344,
  longitude: -93.06,
  elevationFeet: 705,
  runways: [
    {
      id: "14/32",
      airportIcao: "KSTP",
      name: "14/32",
      headingDegrees: 140,
      reciprocalHeadingDegrees: 320,
      lengthFeet: 6491,
      widthFeet: 150,
      thresholdA: [44.9455, -93.0734],
      thresholdB: [44.9231, -93.0462],
      midpoint: [44.9343, -93.0598],
      surface: "concrete"
    },
    {
      id: "13/31",
      airportIcao: "KSTP",
      name: "13/31",
      headingDegrees: 130,
      reciprocalHeadingDegrees: 310,
      lengthFeet: 4004,
      widthFeet: 100,
      thresholdA: [44.9396, -93.0699],
      thresholdB: [44.9293, -93.0506],
      midpoint: [44.9345, -93.0602],
      surface: "asphalt"
    }
  ]
};
