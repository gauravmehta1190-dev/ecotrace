import { PRESETS_CHALLENGES, getChallengesProgress } from './db.js';

/**
 * Calculates the total CO2 offset saved by the user.
 * Sums (completedCount * co2SavedPerDay) for all challenges.
 * @returns {number} kg CO2e saved
 */
export function calculateTotalSavings() {
  const progress = getChallengesProgress();
  let totalSaved = 0;

  PRESETS_CHALLENGES.forEach(c => {
    const prog = progress[c.id];
    if (prog) {
      totalSaved += (prog.completedCount * c.co2SavedPerDay);
    }
  });

  return Number(totalSaved.toFixed(2));
}

/**
 * Returns detailed details about the active challenges of the user.
 * Joins presets metadata with current user persistence progress.
 */
export function getActiveChallengesDetails() {
  const progress = getChallengesProgress();
  return PRESETS_CHALLENGES.map(preset => {
    const prog = progress[preset.id] || {
      activated: false,
      streak: 0,
      completedCount: 0,
      lastCompleted: null
    };

    return {
      ...preset,
      activated: prog.activated,
      streak: prog.streak,
      completedCount: prog.completedCount,
      lastCompleted: prog.lastCompleted
    };
  });
}

/**
 * Compiles a report of savings categorized by environmental impact area.
 * Returns an object with category keys and accumulated saved kg CO2.
 */
export function getSavingsByCategory() {
  const progress = getChallengesProgress();
  const summary = {
    diet: 0,
    transport: 0,
    energy: 0,
    waste: 0
  };

  PRESETS_CHALLENGES.forEach(c => {
    const prog = progress[c.id];
    if (prog && summary[c.category] !== undefined) {
      summary[c.category] += (prog.completedCount * c.co2SavedPerDay);
    }
  });

  // Round values
  Object.keys(summary).forEach(cat => {
    summary[cat] = Number(summary[cat].toFixed(2));
  });

  return summary;
}
