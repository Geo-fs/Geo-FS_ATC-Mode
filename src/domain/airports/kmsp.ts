import type { AirportDefinition } from "./types";

export const KMSP_AIRPORT: AirportDefinition = {
  icao: "KMSP",
  iata: "MSP",
  name: "Minneapolis-Saint Paul International Airport",
  city: "Minneapolis / Saint Paul",
  latitude: 44.8848,
  longitude: -93.2223,
  elevationFeet: 841,
  runways: [
    {
      id: "12L/30R",
      airportIcao: "KMSP",
      name: "12L/30R",
      headingDegrees: 120,
      reciprocalHeadingDegrees: 300,
      lengthFeet: 10000,
      widthFeet: 150,
      thresholdA: [44.9101, -93.2313],
      thresholdB: [44.8683, -93.1902],
      midpoint: [44.8892, -93.2108],
      surface: "concrete"
    },
    {
      id: "12R/30L",
      airportIcao: "KMSP",
      name: "12R/30L",
      headingDegrees: 120,
      reciprocalHeadingDegrees: 300,
      lengthFeet: 10000,
      widthFeet: 150,
      thresholdA: [44.8995, -93.2471],
      thresholdB: [44.8578, -93.2061],
      midpoint: [44.8787, -93.2267],
      surface: "concrete"
    },
    {
      id: "04/22",
      airportIcao: "KMSP",
      name: "04/22",
      headingDegrees: 40,
      reciprocalHeadingDegrees: 220,
      lengthFeet: 11006,
      widthFeet: 150,
      thresholdA: [44.8703, -93.2478],
      thresholdB: [44.8971, -93.1789],
      midpoint: [44.8837, -93.2133],
      surface: "concrete"
    },
    {
      id: "17/35",
      airportIcao: "KMSP",
      name: "17/35",
      headingDegrees: 170,
      reciprocalHeadingDegrees: 350,
      lengthFeet: 8000,
      widthFeet: 150,
      thresholdA: [44.9204, -93.2226],
      thresholdB: [44.8832, -93.2194],
      midpoint: [44.9018, -93.221],
      surface: "concrete"
    }
  ]
};
