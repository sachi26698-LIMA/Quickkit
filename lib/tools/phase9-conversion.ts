// Factors represent SI base units per unit, except fuel economy which uses L/100 km.
export const units: Record<string, Record<string, number>> = {
  Length: {
    Metre: 1,
    Kilometre: 1000,
    Centimetre: 0.01,
    Millimetre: 0.001,
    Mile: 1609.344,
    Yard: 0.9144,
    Foot: 0.3048,
    Inch: 0.0254,
  },
  Mass: {
    Kilogram: 1,
    Gram: 0.001,
    Milligram: 0.000001,
    Tonne: 1000,
    Pound: 0.45359237,
    Ounce: 0.028349523125,
  },
  Area: {
    "Square metre": 1,
    "Square kilometre": 1e6,
    Hectare: 10000,
    Acre: 4046.8564224,
    "Square foot": 0.09290304,
    "Square mile": 2589988.110336,
  },
  Volume: {
    Litre: 1,
    Millilitre: 0.001,
    "Cubic metre": 1000,
    "US gallon": 3.785411784,
    "Imperial gallon": 4.54609,
    "US fluid ounce": 0.0295735295625,
  },
  Speed: {
    "Metres per second": 1,
    "Kilometres per hour": 1 / 3.6,
    "Miles per hour": 0.44704,
    Knot: 0.5144444444444445,
  },
  Time: {
    Second: 1,
    Minute: 60,
    Hour: 3600,
    Day: 86400,
    Week: 604800,
    "Month (30 days)": 2592000,
    "Year (365 days)": 31536000,
  },
  "Data storage": {
    Byte: 1,
    Bit: 0.125,
    Kilobyte: 1000,
    Megabyte: 1e6,
    Gigabyte: 1e9,
    Terabyte: 1e12,
    Kibibyte: 1024,
    Mebibyte: 1048576,
    Gibibyte: 1073741824,
  },
  Energy: {
    Joule: 1,
    Kilojoule: 1000,
    Calorie: 4.184,
    Kilocalorie: 4184,
    "Kilowatt-hour": 3600000,
    "British thermal unit": 1055.05585262,
  },
  Pressure: {
    Pascal: 1,
    Kilopascal: 1000,
    Bar: 100000,
    Atmosphere: 101325,
    PSI: 6894.757293168,
  },
  Power: { Watt: 1, Kilowatt: 1000, "Mechanical horsepower": 745.699871582 },
  Frequency: { Hertz: 1, Kilohertz: 1000, Megahertz: 1e6, Gigahertz: 1e9 },
  "Fuel consumption": {
    "L/100 km": 1,
    "US mpg": 235.214583,
    "Imperial mpg": 282.480936,
  },
};
export function convert(
  value: number,
  category: string,
  from: string,
  to: string,
) {
  if (
    !Number.isFinite(value) ||
    !units[category]?.[from] ||
    !units[category]?.[to]
  )
    throw new Error("Enter a valid value and units.");
  if (category === "Fuel consumption") {
    if (value <= 0)
      throw new Error("Fuel consumption must be greater than zero.");
    const l = from === "L/100 km" ? value : units[category][from] / value;
    const result = to === "L/100 km" ? l : units[category][to] / l;
    if (!Number.isFinite(result) || result === 0)
      throw new Error("Result is outside the supported range.");
    return result;
  }
  const result = (value * units[category][from]) / units[category][to];
  if (!Number.isFinite(result))
    throw new Error("Result is outside the supported range.");
  return result;
}
export function temperature(value: number, from: string, to: string) {
  if (
    !Number.isFinite(value) ||
    !["Celsius", "Fahrenheit", "Kelvin"].includes(from) ||
    !["Celsius", "Fahrenheit", "Kelvin"].includes(to)
  )
    throw new Error("Enter a valid temperature and units.");
  const k =
    from === "Celsius"
      ? value + 273.15
      : from === "Fahrenheit"
        ? ((value - 32) * 5) / 9 + 273.15
        : value;
  if (k < -1e-10) throw new Error("Temperature cannot be below absolute zero.");
  const result =
    to === "Celsius"
      ? k - 273.15
      : to === "Fahrenheit"
        ? ((k - 273.15) * 9) / 5 + 32
        : k;
  if (!Number.isFinite(result))
    throw new Error("Result is outside the supported range.");
  return result;
}
