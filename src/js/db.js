/**
 * Data Storage Manager (LocalStorage Wrapper)
 * 
 * Secure and robust client-side storage for the Carbon Footprint Awareness Platform.
 * Prevents script-injection and guarantees clean state parsing.
 */

// LocalStorage Keys
const KEYS = {
  PROFILE: 'cfap_user_profile',
  LOGS: 'cfap_emission_logs',
  CHALLENGES: 'cfap_challenges_progress'
};

// Default profile structure
const DEFAULT_PROFILE = {
  name: 'Eco Warrior',
  dailyTarget: 15.0, // Standard daily target (in kg CO2e)
  country: 'US',
  onboarded: false,
  joinedDate: new Date().toISOString().split('T')[0]
};

// Initial system challenges
export const PRESETS_CHALLENGES = [
  {
    id: 'meatless_day',
    title: 'Meat-Free Day',
    description: 'Opt for a vegetarian or vegan diet for the entire day.',
    co2SavedPerDay: 2.5,
    category: 'diet',
    icon: '🥕'
  },
  {
    id: 'commute_green',
    title: 'Active Commuting',
    description: 'Walk, cycle, or use public transit instead of driving a car today.',
    co2SavedPerDay: 4.8,
    category: 'transport',
    icon: '🚲'
  },
  {
    id: 'energy_saver',
    title: 'Standby Slash',
    description: 'Turn off power strips and unplug idle electronics for the night.',
    co2SavedPerDay: 0.9,
    category: 'energy',
    icon: '🔌'
  },
  {
    id: 'cold_wash',
    title: 'Cold Laundry Cycle',
    description: 'Wash all clothes at 30°C or cold wash, then air-dry instead of tumble drying.',
    co2SavedPerDay: 1.2,
    category: 'energy',
    icon: '👕'
  },
  {
    id: 'zero_waste_day',
    title: 'Zero Waste Challenge',
    description: 'Avoid single-use plastics, recycle fully, and compost organic matter today.',
    co2SavedPerDay: 1.5,
    category: 'waste',
    icon: '♻️'
  }
];

/**
 * Securely sanitizes text input to prevent XSS / script injections.
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Safe local storage read wrapper.
 */
function readStorage(key, fallback = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error(`Failed to read storage key: ${key}`, e);
    return fallback;
  }
}

/**
 * Safe local storage write wrapper.
 */
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Failed to write storage key: ${key}`, e);
    return false;
  }
}

/**
 * USER PROFILE UTILITIES
 */
export function getUserProfile() {
  const profile = readStorage(KEYS.PROFILE, DEFAULT_PROFILE);
  // Ensure basic fields are present
  return { ...DEFAULT_PROFILE, ...profile };
}

export function saveUserProfile(profileData) {
  const current = getUserProfile();
  const updated = {
    name: sanitizeString(profileData.name || current.name),
    dailyTarget: Math.max(1, Number(profileData.dailyTarget || current.dailyTarget)),
    country: sanitizeString(profileData.country || current.country),
    onboarded: profileData.onboarded !== undefined ? !!profileData.onboarded : current.onboarded,
    joinedDate: current.joinedDate
  };
  return writeStorage(KEYS.PROFILE, updated);
}

/**
 * LOGS UTILITIES
 */
export function getLogs() {
  const logs = readStorage(KEYS.LOGS, []);
  if (!Array.isArray(logs)) return [];
  // Sort logs by date descending
  return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getLogByDate(dateString) {
  const logs = getLogs();
  return logs.find(log => log.date === dateString) || null;
}

export function saveLog(logEntry) {
  if (!logEntry.date) {
    throw new Error('Log entry must contain a valid ISO date string (YYYY-MM-DD)');
  }

  const logs = getLogs();
  const existingIndex = logs.findIndex(log => log.date === logEntry.date);

  const cleanEntry = {
    id: logEntry.id || `log-${Date.now()}`,
    date: logEntry.date,
    transport: logEntry.transport || {},
    energy: logEntry.energy || {},
    diet: logEntry.diet || {},
    waste: logEntry.waste || {},
    totalEmissions: Number(logEntry.totalEmissions) || 0,
    timestamp: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    logs[existingIndex] = cleanEntry;
  } else {
    logs.push(cleanEntry);
  }

  return writeStorage(KEYS.LOGS, logs);
}

export function deleteLog(logId) {
  const logs = getLogs();
  const filtered = logs.filter(log => log.id !== logId);
  return writeStorage(KEYS.LOGS, filtered);
}

/**
 * CHALLENGES UTILITIES
 */
export function getChallengesProgress() {
  const progress = readStorage(KEYS.CHALLENGES, {});
  // Guarantee all presets exist in progress map
  PRESETS_CHALLENGES.forEach(c => {
    if (!progress[c.id]) {
      progress[c.id] = {
        id: c.id,
        activated: false,
        streak: 0,
        completedCount: 0,
        lastCompleted: null
      };
    }
  });
  return progress;
}

export function toggleChallengeSubscription(challengeId) {
  const progress = getChallengesProgress();
  if (progress[challengeId]) {
    progress[challengeId].activated = !progress[challengeId].activated;
    if (!progress[challengeId].activated) {
      // Reset streak if deactivated
      progress[challengeId].streak = 0;
    }
    writeStorage(KEYS.CHALLENGES, progress);
  }
  return progress;
}

export function recordChallengeCompletion(challengeId, dateString) {
  const progress = getChallengesProgress();
  const challenge = progress[challengeId];
  if (!challenge) return null;

  const todayStr = dateString || new Date().toISOString().split('T')[0];
  
  if (challenge.lastCompleted === todayStr) {
    // Already completed today
    return challenge;
  }

  // Calculate streak
  if (challenge.lastCompleted) {
    const lastDate = new Date(challenge.lastCompleted);
    const currentDate = new Date(todayStr);
    const diffTime = Math.abs(currentDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      challenge.streak += 1;
    } else if (diffDays > 1) {
      challenge.streak = 1; // streak broken, reset to 1
    }
  } else {
    challenge.streak = 1;
  }

  challenge.completedCount += 1;
  challenge.lastCompleted = todayStr;

  writeStorage(KEYS.CHALLENGES, progress);
  return challenge;
}

/**
 * Resets all user databases (useful for testing or profile clearing).
 */
export function clearAllData() {
  localStorage.removeItem(KEYS.PROFILE);
  localStorage.removeItem(KEYS.LOGS);
  localStorage.removeItem(KEYS.CHALLENGES);
  return true;
}
