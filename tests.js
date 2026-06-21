/**
 * Browser Integration Test Suite
 * Runs automated tests on calculator algorithms and database methods.
 */

import { 
  calculateTransportEmissions, 
  calculateEnergyEmissions, 
  calculateDietEmissions, 
  calculateWasteEmissions, 
  calculateTotalEmissions 
} from './calculator.js';

import {
  getUserProfile,
  saveUserProfile,
  getLogs,
  saveLog,
  deleteLog,
  getChallengesProgress,
  toggleChallengeSubscription,
  recordChallengeCompletion,
  clearAllData
} from './db.js';

import {
  calculateTotalSavings,
  getSavingsByCategory
} from './challenges.js';

const tests = [];

/**
 * Registers a new test case.
 */
function test(name, fn) {
  tests.push({ name, fn });
}

/**
 * Simple Assertions
 */
const assert = {
  equal(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`Expected [${expected}] but got [${actual}]. ${message}`);
    }
  },
  approx(actual, expected, tolerance = 0.01, message = '') {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(`Expected [${expected}] (approx) but got [${actual}]. ${message}`);
    }
  },
  truthy(val, message = '') {
    if (!val) {
      throw new Error(`Expected truthy value but got [${val}]. ${message}`);
    }
  },
  falsy(val, message = '') {
    if (val) {
      throw new Error(`Expected falsy value but got [${val}]. ${message}`);
    }
  }
};

/* --- CALCULATOR TESTS --- */

test('Transport Emissions - Standard petrol car & transit', () => {
  const result = calculateTransportEmissions({
    carKm: 100,
    carFuelType: 'petrol',
    busKm: 20,
    trainKm: 50,
    flightShortHours: 0,
    flightLongHours: 0
  });
  // 100 * 0.170 = 17.0
  // 20 * 0.089 = 1.78
  // 50 * 0.035 = 1.75
  // Total = 20.53
  assert.approx(result, 20.53);
});

test('Transport Emissions - Flight hours conversion', () => {
  const result = calculateTransportEmissions({
    carKm: 0,
    busKm: 0,
    trainKm: 0,
    flightShortHours: 2, // 2h * 750km/h = 1500km * 0.150 = 225
    flightLongHours: 4  // 4h * 750km/h = 3000km * 0.115 = 345
  });
  assert.equal(result, 570);
});

test('Energy Emissions - Clean energy offset', () => {
  const result = calculateEnergyEmissions({
    electricityKwh: 300,
    electricityCleanPercent: 40, // 40% offset = 180 kwh standard * 0.385 = 69.3
    gasKwh: 100, // 100 * 0.182 = 18.2
    heatingOilKwh: 0,
    waterM3: 10 // 10 * 0.298 = 2.98
  });
  // 69.3 + 18.2 + 2.98 = 90.48
  assert.approx(result, 90.48);
});

test('Diet Emissions - Diet type factor resolution', () => {
  const resultVegan = calculateDietEmissions({ dietType: 'vegan', daysCount: 7 });
  const resultMeat = calculateDietEmissions({ dietType: 'heavyMeat', daysCount: 7 });
  // Vegan: 2.89 * 7 = 20.23
  // Heavy Meat: 7.20 * 7 = 50.40
  assert.approx(resultVegan, 20.23);
  assert.approx(resultMeat, 50.40);
});

test('Waste & Retail Emissions - Recycling credits', () => {
  const result = calculateWasteEmissions({
    landfillKg: 20, // 20 * 0.52 = 10.4
    recycledKg: 10, // 10 * -0.21 = -2.1
    compostKg: 5,   // 5 * 0.09 = 0.45
    clothingCount: 2, // 2 * 15 = 30
    electronicsCount: 1, // 1 * 95 = 95
    appliancesCount: 0,
    furnitureCount: 0
  });
  // 10.4 - 2.1 + 0.45 + 30 + 95 = 133.75
  assert.approx(result, 133.75);
});

test('Total Emissions - Positive floor validation', () => {
  const result = calculateTotalEmissions({
    transport: {},
    energy: {},
    diet: { dietType: 'vegan', daysCount: 0 },
    waste: { landfillKg: 0, recycledKg: 100, compostKg: 0 } // Large recycling credit -> negative
  });
  // Total must be bounded to >= 0
  assert.equal(result, 0);
});

/* --- DATABASE & PERSISTENCE TESTS --- */

test('Database - Profile CRUD validations', () => {
  clearAllData();
  const initial = getUserProfile();
  assert.equal(initial.onboarded, false);
  
  saveUserProfile({
    name: 'Test Cadet',
    dailyTarget: 12.5,
    onboarded: true
  });
  
  const updated = getUserProfile();
  assert.equal(updated.name, 'Test Cadet');
  assert.equal(updated.dailyTarget, 12.5);
  assert.equal(updated.onboarded, true);
});

test('Database - Logs saving & deletion', () => {
  clearAllData();
  
  const log = {
    date: '2026-06-20',
    totalEmissions: 15.42,
    transport: { carKm: 50 },
    energy: { electricityKwh: 10 }
  };
  
  saveLog(log);
  
  let logs = getLogs();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].date, '2026-06-20');
  assert.equal(logs[0].totalEmissions, 15.42);
  
  deleteLog(logs[0].id);
  logs = getLogs();
  assert.equal(logs.length, 0);
});

test('Database & Challenges - Achievements and offsets tracking', () => {
  clearAllData();
  
  // Toggle challenge active state
  let progress = toggleChallengeSubscription('meatless_day');
  assert.equal(progress.meatless_day.activated, true);
  
  // Complete challenge once
  recordChallengeCompletion('meatless_day', '2026-06-20');
  progress = getChallengesProgress();
  assert.equal(progress.meatless_day.completedCount, 1);
  assert.equal(progress.meatless_day.streak, 1);
  
  // Complete challenge next day (streak increments)
  recordChallengeCompletion('meatless_day', '2026-06-21');
  progress = getChallengesProgress();
  assert.equal(progress.meatless_day.completedCount, 2);
  assert.equal(progress.meatless_day.streak, 2);
  
  // Savings metrics
  const totalSavings = calculateTotalSavings();
  // 2 * 2.5 (meatless co2SavedPerDay) = 5.0
  assert.approx(totalSavings, 5.0);
  
  const categorySavings = getSavingsByCategory();
  assert.equal(categorySavings.diet, 5.0);
  assert.equal(categorySavings.transport, 0);
});

/**
 * Runs the client test suite and calls back with log details.
 * Backs up and restores user data so diagnostics don't wipe real state.
 */
export async function runClientTests(logCallback) {
  let passed = 0;
  let failed = 0;

  // Backup current user data before tests
  const backupKeys = ['cfap_user_profile', 'cfap_emission_logs', 'cfap_challenges_progress'];
  const backup = {};
  backupKeys.forEach(key => {
    backup[key] = localStorage.getItem(key);
  });
  
  logCallback('--- RUNNING CARBON PLATFORM UNIT TESTS ---', 'info');
  
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      logCallback(`[PASS] ${t.name}`, 'pass');
    } catch (err) {
      failed++;
      logCallback(`[FAIL] ${t.name}\n      Error: ${err.message}`, 'fail');
    }
  }
  
  // Restore user data after tests
  backupKeys.forEach(key => {
    if (backup[key] !== null) {
      localStorage.setItem(key, backup[key]);
    } else {
      localStorage.removeItem(key);
    }
  });
  
  logCallback(`\n--- TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`, failed > 0 ? 'fail' : 'pass');
  return { passed, failed };
}

