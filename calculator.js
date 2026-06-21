/**
 * Carbon Footprint Calculation Engine
 * 
 * All emission factors are based on standard environmental databases:
 * - US EPA (Environmental Protection Agency)
 * - UK DEFRA (Department for Environment, Food & Rural Affairs)
 * - EEA (European Environment Agency)
 * 
 * All values are calculated in kilograms of CO2 equivalent (kg CO2e).
 */

// Global constant coefficients for carbon footprint calculations
export const EMISSION_FACTORS = {
  transport: {
    // kg CO2e per kilometer per vehicle/passenger
    car: {
      petrol: 0.170, // Average petrol passenger car
      diesel: 0.165, // Average diesel passenger car
      hybrid: 0.095, // Average hybrid car
      electric: 0.045 // Electric car (grid-charging average)
    },
    bus: 0.089,      // Average local bus passenger-km
    train: 0.035,     // Light rail/subway/national train passenger-km
    flight: {
      shortHaul: 0.150, // Short haul (< 3 hrs, including radiative forcing)
      longHaul: 0.115   // Long haul (>= 3 hrs, including radiative forcing)
    }
  },
  energy: {
    // kg CO2e per unit
    electricity: 0.385, // kg CO2e per kWh (Global average grid mix)
    naturalGas: 0.182,  // kg CO2e per kWh (Gross calorific value)
    heatingOil: 0.268,  // kg CO2e per kWh
    water: 0.298        // kg CO2e per cubic meter (supplied + treated wastewater)
  },
  diet: {
    // Daily average kg CO2e based on dietary habits
    heavyMeat: 7.20,    // High meat consumption (>100g/day)
    mediumMeat: 5.63,   // Average meat consumption (50-100g/day)
    lowMeat: 4.67,      // Low meat consumption (<50g/day)
    pescatarian: 3.91,  // Fish and plant products
    vegetarian: 3.81,   // Dairy, eggs, no meat
    vegan: 2.89         // Purely plant-based
  },
  waste: {
    // kg CO2e per kg of material
    landfill: 0.520,    // Municipal solid waste to landfill
    recycledOffset: -0.210, // Avoided emissions from recycling (credit)
    compost: 0.090      // Composted organic waste
  },
  consumption: {
    // kg CO2e per new item purchased (cradle-to-grave average)
    clothing: 15.0,     // Average new apparel item
    electronics: 95.0,  // Average phone, tablet, small laptop
    appliances: 220.0,  // Large household electronic appliance
    furniture: 45.0     // Medium size furniture item
  }
};

/**
 * Validates that an input is a finite, non-negative number.
 * Returns 0 if invalid or empty.
 */
function sanitizeInput(value) {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num) || num < 0) {
    return 0;
  }
  return num;
}

/**
 * Calculates travel emissions.
 * @param {Object} travelData
 * @param {number} travelData.carKm - Kilometers driven by car
 * @param {string} travelData.carFuelType - petrol, diesel, hybrid, electric
 * @param {number} travelData.busKm - Kilometers traveled by bus
 * @param {number} travelData.trainKm - Kilometers traveled by train/subway
 * @param {number} travelData.flightShortHours - Estimated hours on short-haul flights
 * @param {number} travelData.flightLongHours - Estimated hours on long-haul flights
 * @returns {number} kg CO2e
 */
export function calculateTransportEmissions(travelData = {}) {
  const carKm = sanitizeInput(travelData.carKm);
  const fuelType = travelData.carFuelType || 'petrol';
  const busKm = sanitizeInput(travelData.busKm);
  const trainKm = sanitizeInput(travelData.trainKm);
  const shortFlightHours = sanitizeInput(travelData.flightShortHours);
  const longFlightHours = sanitizeInput(travelData.flightLongHours);

  // Get car factor
  const carFactor = EMISSION_FACTORS.transport.car[fuelType] || EMISSION_FACTORS.transport.car.petrol;
  const carEmissions = carKm * carFactor;

  // Public transit
  const busEmissions = busKm * EMISSION_FACTORS.transport.bus;
  const trainEmissions = trainKm * EMISSION_FACTORS.transport.train;

  // Flights (Assume average speed of 750 km/h for flight hour to distance conversion)
  const FLIGHT_SPEED_KMH = 750;
  const shortFlightEmissions = (shortFlightHours * FLIGHT_SPEED_KMH) * EMISSION_FACTORS.transport.flight.shortHaul;
  const longFlightEmissions = (longFlightHours * FLIGHT_SPEED_KMH) * EMISSION_FACTORS.transport.flight.longHaul;

  return Number((carEmissions + busEmissions + trainEmissions + shortFlightEmissions + longFlightEmissions).toFixed(2));
}

/**
 * Calculates home energy emissions.
 * @param {Object} energyData
 * @param {number} energyData.electricityKwh - Monthly or daily electricity used in kWh
 * @param {number} energyData.electricityCleanPercent - Percent of electricity from renewable sources (0 to 100)
 * @param {number} energyData.gasKwh - Monthly or daily gas used in kWh
 * @param {number} energyData.heatingOilKwh - Heating oil used in kWh
 * @param {number} energyData.waterM3 - Water used in cubic meters (1 m3 = 1000 Liters)
 * @returns {number} kg CO2e
 */
export function calculateEnergyEmissions(energyData = {}) {
  const electricity = sanitizeInput(energyData.electricityKwh);
  const cleanPercent = Math.min(100, Math.max(0, sanitizeInput(energyData.electricityCleanPercent)));
  const gas = sanitizeInput(energyData.gasKwh);
  const oil = sanitizeInput(energyData.heatingOilKwh);
  const water = sanitizeInput(energyData.waterM3);

  // Renewable electricity offset
  const standardElectricityKwh = electricity * (1 - (cleanPercent / 100));
  const electricityEmissions = standardElectricityKwh * EMISSION_FACTORS.energy.electricity;

  const gasEmissions = gas * EMISSION_FACTORS.energy.naturalGas;
  const oilEmissions = oil * EMISSION_FACTORS.energy.heatingOil;
  const waterEmissions = water * EMISSION_FACTORS.energy.water;

  return Number((electricityEmissions + gasEmissions + oilEmissions + waterEmissions).toFixed(2));
}

/**
 * Calculates dietary emissions.
 * @param {Object} dietData
 * @param {string} dietData.dietType - heavyMeat, mediumMeat, lowMeat, pescatarian, vegetarian, vegan
 * @param {number} dietData.daysCount - Number of days in the log period (default 1)
 * @returns {number} kg CO2e
 */
export function calculateDietEmissions(dietData = {}) {
  const dietType = dietData.dietType || 'mediumMeat';
  const days = sanitizeInput(dietData.daysCount || 1);
  const factor = EMISSION_FACTORS.diet[dietType] || EMISSION_FACTORS.diet.mediumMeat;
  
  return Number((factor * days).toFixed(2));
}

/**
 * Calculates waste and retail purchases emissions.
 * @param {Object} wasteData
 * @param {number} wasteData.landfillKg - Waste sent to general landfill (kg)
 * @param {number} wasteData.recycledKg - Recycled waste (kg)
 * @param {number} wasteData.compostKg - Organic composted waste (kg)
 * @param {number} wasteData.clothingCount - Count of clothing items bought
 * @param {number} wasteData.electronicsCount - Count of electronics items bought
 * @param {number} wasteData.appliancesCount - Count of appliance items bought
 * @param {number} wasteData.furnitureCount - Count of furniture items bought
 * @returns {number} kg CO2e
 */
export function calculateWasteEmissions(wasteData = {}) {
  const landfill = sanitizeInput(wasteData.landfillKg);
  const recycled = sanitizeInput(wasteData.recycledKg);
  const compost = sanitizeInput(wasteData.compostKg);

  const clothing = sanitizeInput(wasteData.clothingCount);
  const electronics = sanitizeInput(wasteData.electronicsCount);
  const appliances = sanitizeInput(wasteData.appliancesCount);
  const furniture = sanitizeInput(wasteData.furnitureCount);

  // Waste emissions and recycling credits
  const wasteEmissions = (landfill * EMISSION_FACTORS.waste.landfill) +
                         (recycled * EMISSION_FACTORS.waste.recycledOffset) +
                         (compost * EMISSION_FACTORS.waste.compost);

  // Consumption emissions
  const purchaseEmissions = (clothing * EMISSION_FACTORS.consumption.clothing) +
                             (electronics * EMISSION_FACTORS.consumption.electronics) +
                             (appliances * EMISSION_FACTORS.consumption.appliances) +
                             (furniture * EMISSION_FACTORS.consumption.furniture);

  return Number((wasteEmissions + purchaseEmissions).toFixed(2));
}

/**
 * Calculates total emissions for a complete day log.
 * Ensures total is never below 0 (e.g. extreme recycling offsets).
 */
export function calculateTotalEmissions(log = {}) {
  const transport = calculateTransportEmissions(log.transport || {});
  const energy = calculateEnergyEmissions(log.energy || {});
  const diet = calculateDietEmissions(log.diet || {});
  const waste = calculateWasteEmissions(log.waste || {});

  return Math.max(0, Number((transport + energy + diet + waste).toFixed(2)));
}
