/**
 * CLI Unit Tests for Carbon Footprint Awareness Platform
 * Verifies calculation accuracy of travel, energy, diet, and waste models.
 * Runs on Node.js using native assertions.
 */

import assert from 'node:assert';
import { 
  calculateTransportEmissions, 
  calculateEnergyEmissions, 
  calculateDietEmissions, 
  calculateWasteEmissions, 
  calculateTotalEmissions,
  EMISSION_FACTORS
} from '../src/js/calculator.js';

console.log('====================================================');
console.log(' RUNNING CARBON FOOTPRINT CALCULATOR CLI UNIT TESTS ');
console.log('====================================================');

let testsPassed = 0;
let testsFailed = 0;

function runTest(description, fn) {
  try {
    fn();
    console.log(`[PASS] ${description}`);
    testsPassed++;
  } catch (error) {
    console.error(`[FAIL] ${description}`);
    console.error(`       Error: ${error.message}`);
    testsFailed++;
  }
}

// 1. Transport calculations tests
runTest('Transport: calculate default or blank emissions', () => {
  const result = calculateTransportEmissions();
  assert.strictEqual(result, 0);
});

runTest('Transport: petrol car calculations (100km)', () => {
  const result = calculateTransportEmissions({ carKm: 100, carFuelType: 'petrol' });
  const expected = 100 * EMISSION_FACTORS.transport.car.petrol;
  assert.strictEqual(result, Number(expected.toFixed(2)));
});

runTest('Transport: electric car calculations (150km)', () => {
  const result = calculateTransportEmissions({ carKm: 150, carFuelType: 'electric' });
  const expected = 150 * EMISSION_FACTORS.transport.car.electric;
  assert.strictEqual(result, Number(expected.toFixed(2)));
});

runTest('Transport: transit emissions (bus and train)', () => {
  const result = calculateTransportEmissions({ busKm: 25, trainKm: 80 });
  const expected = (25 * EMISSION_FACTORS.transport.bus) + (80 * EMISSION_FACTORS.transport.train);
  assert.strictEqual(result, Number(expected.toFixed(2)));
});

runTest('Transport: flights hours conversion', () => {
  const result = calculateTransportEmissions({ flightShortHours: 1.5, flightLongHours: 5 });
  const FLIGHT_SPEED = 750;
  const expectedShort = (1.5 * FLIGHT_SPEED) * EMISSION_FACTORS.transport.flight.shortHaul;
  const expectedLong = (5 * FLIGHT_SPEED) * EMISSION_FACTORS.transport.flight.longHaul;
  assert.strictEqual(result, Number((expectedShort + expectedLong).toFixed(2)));
});

// 2. Energy calculations tests
runTest('Energy: default/empty parameters', () => {
  const result = calculateEnergyEmissions();
  assert.strictEqual(result, 0);
});

runTest('Energy: electricity with green energy offsets', () => {
  const result = calculateEnergyEmissions({ electricityKwh: 200, electricityCleanPercent: 50 });
  const standardKwh = 200 * 0.5;
  const expected = standardKwh * EMISSION_FACTORS.energy.electricity;
  assert.strictEqual(result, Number(expected.toFixed(2)));
});

runTest('Energy: full home services footprint', () => {
  const result = calculateEnergyEmissions({
    electricityKwh: 120,
    electricityCleanPercent: 10, // 90% dirty -> 108 kwh
    gasKwh: 400,
    heatingOilKwh: 250,
    waterM3: 8
  });
  const expected = (108 * EMISSION_FACTORS.energy.electricity) +
                   (400 * EMISSION_FACTORS.energy.naturalGas) +
                   (250 * EMISSION_FACTORS.energy.heatingOil) +
                   (8 * EMISSION_FACTORS.energy.water);
  assert.strictEqual(result, Number(expected.toFixed(2)));
});

// 3. Diet calculations tests
runTest('Diet: different diets (Vegan vs Heavy Meat)', () => {
  const resultVegan = calculateDietEmissions({ dietType: 'vegan', daysCount: 30 });
  const expectedVegan = EMISSION_FACTORS.diet.vegan * 30;
  assert.strictEqual(resultVegan, Number(expectedVegan.toFixed(2)));

  const resultMeat = calculateDietEmissions({ dietType: 'heavyMeat', daysCount: 7 });
  const expectedMeat = EMISSION_FACTORS.diet.heavyMeat * 7;
  assert.strictEqual(resultMeat, Number(expectedMeat.toFixed(2)));
});

// 4. Waste & Consumption tests
runTest('Waste: landfill weight, compost and recycling savings credits', () => {
  const result = calculateWasteEmissions({
    landfillKg: 15,
    recycledKg: 25,
    compostKg: 8
  });
  const expected = (15 * EMISSION_FACTORS.waste.landfill) +
                   (25 * EMISSION_FACTORS.waste.recycledOffset) +
                   (8 * EMISSION_FACTORS.waste.compost);
  assert.strictEqual(result, Number(expected.toFixed(2)));
});

runTest('Waste: retail purchases consumption', () => {
  const result = calculateWasteEmissions({
    clothingCount: 3,
    electronicsCount: 1,
    appliancesCount: 0,
    furnitureCount: 1
  });
  const expected = (3 * EMISSION_FACTORS.consumption.clothing) +
                   (1 * EMISSION_FACTORS.consumption.electronics) +
                   (1 * EMISSION_FACTORS.consumption.furniture);
  assert.strictEqual(result, Number(expected.toFixed(2)));
});

// 5. Total emissions checks
runTest('Total: aggregated daily emission limits', () => {
  const log = {
    transport: { carKm: 30, carFuelType: 'diesel' },
    energy: { electricityKwh: 12, electricityCleanPercent: 100 }, // zero electricity impact
    diet: { dietType: 'vegetarian', daysCount: 1 },
    waste: { landfillKg: 2 }
  };
  const result = calculateTotalEmissions(log);
  const expectedTransport = 30 * EMISSION_FACTORS.transport.car.diesel;
  const expectedEnergy = 0;
  const expectedDiet = EMISSION_FACTORS.diet.vegetarian * 1;
  const expectedWaste = 2 * EMISSION_FACTORS.waste.landfill;
  const expected = expectedTransport + expectedEnergy + expectedDiet + expectedWaste;
  assert.strictEqual(result, Number(expected.toFixed(2)));
});

runTest('Total: handle extreme negative offset boundary checks', () => {
  const log = {
    diet: { dietType: 'vegan', daysCount: 0 },
    waste: { recycledKg: 500 } // negative emissions credit
  };
  // total emissions are mathematically negative but should be bounded to 0
  const result = calculateTotalEmissions(log);
  assert.strictEqual(result, 0);
});

console.log('====================================================');
console.log(` RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
