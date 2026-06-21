/**
 * Main Application Orchestrator
 * 
 * Manages SPA state transitions, navigation, onboarding, tracking form
 * submissions, challenges actions, theme switches, and browser diagnostics.
 */

import { 
  getUserProfile, 
  saveUserProfile, 
  getLogs, 
  saveLog, 
  deleteLog, 
  toggleChallengeSubscription, 
  recordChallengeCompletion, 
  clearAllData 
} from './db.js';

import { 
  calculateTotalEmissions, 
  calculateTransportEmissions,
  calculateEnergyEmissions,
  calculateDietEmissions,
  calculateWasteEmissions
} from './calculator.js';

import { 
  updateBudgetCircle, 
  renderCategoryWidgets, 
  renderTrendsChart, 
  generateInsights 
} from './dashboard.js';

import { 
  getActiveChallengesDetails, 
  calculateTotalSavings 
} from './challenges.js';

import { runClientTests } from './tests.js';

// Application State
const STATE = {
  profile: null,
  logs: [],
  activeView: 'dashboard',
  selectedLogDate: new Date().toISOString().split('T')[0],
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth()
};

// DOM Elements
const elements = {};

/**
 * Initialize DOM element cache
 */
function cacheElements() {
  elements.body = document.body;
  elements.navLinks = document.querySelectorAll('.nav-link');
  elements.views = document.querySelectorAll('.app-view');
  
  // Header details
  elements.themeToggle = document.getElementById('theme-toggle');
  elements.profileBadge = document.getElementById('profile-badge');
  elements.profileName = document.getElementById('profile-name');
  
  // Onboarding Wizard
  elements.wizardOverlay = document.getElementById('wizard-overlay');
  elements.wizardDots = document.querySelectorAll('.wizard-dot');
  elements.wizardSteps = document.querySelectorAll('.wizard-step');
  elements.btnWizardNext = document.getElementById('wizard-next');
  elements.btnWizardPrev = document.getElementById('wizard-prev');
  elements.wizardNameInput = document.getElementById('wizard-name');
  elements.wizardTargetInput = document.getElementById('wizard-target');
  elements.wizardCountryInput = document.getElementById('wizard-country');
  
  // Log tracker form
  elements.trackerForm = document.getElementById('tracker-form');
  elements.btnToday = document.getElementById('btn-log-today');
  elements.cleanEnergySlider = document.getElementById('electricityCleanPercent');
  elements.cleanEnergyVal = document.getElementById('slider-val-clean');
  elements.selectedDateDisplay = document.getElementById('selected-date-display');
  
  // Calendar
  elements.calGrid = document.getElementById('cal-grid');
  elements.calMonthLabel = document.getElementById('cal-month-label');
  elements.calPrev = document.getElementById('cal-prev');
  elements.calNext = document.getElementById('cal-next');
  
  // Dialog modal
  elements.settingsModal = document.getElementById('settings-modal');
  elements.btnCloseSettings = document.getElementById('btn-close-settings');
  elements.settingsForm = document.getElementById('settings-form');
  
  // Dynamic Containers
  elements.insightsContainer = document.getElementById('insights-container');
  elements.historyList = document.getElementById('history-list');
  elements.challengesGrid = document.getElementById('challenges-grid');
  elements.totalSavingsBadge = document.getElementById('total-savings-badge');
  
  // Diagnostics
  elements.btnRunTests = document.getElementById('btn-run-tests');
  elements.btnResetData = document.getElementById('btn-reset-data');
  elements.testLogConsole = document.getElementById('test-log-console');
  elements.testPassedCount = document.getElementById('test-passed-count');
  elements.testFailedCount = document.getElementById('test-failed-count');
}

/**
 * Creates and shows a temporary floating toast alert.
 */
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.role = 'alert';
  toast.innerHTML = `
    <span>${type === 'error' ? '❌' : '✅'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Animate slide-out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Navigation
  elements.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      switchView(targetView);
    });
  });

  // Theme switch
  elements.themeToggle.addEventListener('click', toggleTheme);

  // Settings modal operations — profile badge opens modal
  elements.profileBadge?.addEventListener('click', openSettingsModal);
  elements.btnCloseSettings?.addEventListener('click', closeSettingsModal);
  elements.settingsModal?.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) closeSettingsModal();
  });
  elements.settingsForm?.addEventListener('submit', handleSettingsSave);

  // Clean energy slider values
  elements.cleanEnergySlider?.addEventListener('input', (e) => {
    elements.cleanEnergyVal.textContent = `${e.target.value}%`;
  });

  // Track emissions form submit
  elements.trackerForm?.addEventListener('submit', handleLogSubmission);

  // Today button jumps calendar to today and selects it
  elements.btnToday?.addEventListener('click', () => {
    const today = new Date();
    STATE.selectedLogDate = today.toISOString().split('T')[0];
    STATE.calendarYear = today.getFullYear();
    STATE.calendarMonth = today.getMonth();
    renderCalendar();
    updateSelectedDateDisplay();
    loadLogForSelectedDate();
  });

  // Calendar month navigation
  elements.calPrev?.addEventListener('click', () => {
    STATE.calendarMonth--;
    if (STATE.calendarMonth < 0) {
      STATE.calendarMonth = 11;
      STATE.calendarYear--;
    }
    renderCalendar();
  });

  elements.calNext?.addEventListener('click', () => {
    STATE.calendarMonth++;
    if (STATE.calendarMonth > 11) {
      STATE.calendarMonth = 0;
      STATE.calendarYear++;
    }
    renderCalendar();
  });

  // Onboarding Wizard buttons
  let currentWizardStep = 0;
  elements.btnWizardNext?.addEventListener('click', () => {
    if (validateWizardStep(currentWizardStep)) {
      if (currentWizardStep < elements.wizardSteps.length - 1) {
        currentWizardStep++;
        updateWizardStep(currentWizardStep);
      } else {
        completeWizard();
      }
    }
  });

  elements.btnWizardPrev?.addEventListener('click', () => {
    if (currentWizardStep > 0) {
      currentWizardStep--;
      updateWizardStep(currentWizardStep);
    }
  });

  // System Diagnostics
  elements.btnRunTests?.addEventListener('click', runSystemDiagnostics);
  elements.btnResetData?.addEventListener('click', handleResetDataRequest);
}

/**
 * View Routing
 */
function switchView(viewName) {
  STATE.activeView = viewName;
  
  elements.views.forEach(view => {
    if (view.id === `${viewName}-view`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  elements.navLinks.forEach(link => {
    if (link.getAttribute('data-view') === viewName) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });

  // Run specific view refreshes
  if (viewName === 'dashboard') {
    refreshDashboard();
  } else if (viewName === 'logger') {
    renderCalendar();
    updateSelectedDateDisplay();
    loadLogForSelectedDate();
    refreshHistoryList();
  } else if (viewName === 'challenges') {
    refreshChallengesView();
  }
}

/**
 * Theme Operations
 */
function toggleTheme() {
  const isLight = elements.body.classList.toggle('light-theme');
  localStorage.setItem('cfap_theme', isLight ? 'light' : 'dark');
  elements.themeToggle.innerHTML = isLight ? '🌙' : '☀️';
  elements.themeToggle.setAttribute('aria-label', isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme');
}

function loadThemePreference() {
  const saved = localStorage.getItem('cfap_theme');
  if (saved === 'light') {
    elements.body.classList.add('light-theme');
    elements.themeToggle.innerHTML = '🌙';
    elements.themeToggle.setAttribute('aria-label', 'Switch to Dark Theme');
  } else {
    elements.body.classList.remove('light-theme');
    elements.themeToggle.innerHTML = '☀️';
    elements.themeToggle.setAttribute('aria-label', 'Switch to Light Theme');
  }
}

/**
 * Onboarding Wizard steps
 */
function checkOnboarding() {
  STATE.profile = getUserProfile();
  if (!STATE.profile.onboarded) {
    elements.wizardOverlay.classList.add('active');
    updateWizardStep(0);
  } else {
    elements.wizardOverlay.classList.remove('active');
    initializeDashboard();
  }
}

function updateWizardStep(stepIdx) {
  elements.wizardSteps.forEach((step, idx) => {
    step.classList.toggle('active', idx === stepIdx);
  });
  
  elements.wizardDots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === stepIdx);
  });

  elements.btnWizardPrev.style.display = stepIdx === 0 ? 'none' : 'inline-flex';
  elements.btnWizardNext.textContent = stepIdx === elements.wizardSteps.length - 1 ? 'Get Started' : 'Next Step';
}

function validateWizardStep(stepIdx) {
  if (stepIdx === 0) {
    const name = elements.wizardNameInput.value.trim();
    if (!name) {
      showToast('Please enter your name', 'error');
      elements.wizardNameInput.focus();
      return false;
    }
  } else if (stepIdx === 1) {
    const target = Number(elements.wizardTargetInput.value);
    if (isNaN(target) || target <= 0) {
      showToast('Please specify a positive emissions target limit', 'error');
      elements.wizardTargetInput.focus();
      return false;
    }
  }
  return true;
}

function completeWizard() {
  const newProfile = {
    name: elements.wizardNameInput.value.trim(),
    dailyTarget: Number(elements.wizardTargetInput.value),
    country: elements.wizardCountryInput.value,
    onboarded: true
  };
  saveUserProfile(newProfile);
  STATE.profile = getUserProfile();
  elements.wizardOverlay.classList.remove('active');
  
  showToast(`Welcome ${STATE.profile.name}! Your green profile is initialized.`);
  initializeDashboard();
}

/**
 * Dashboard & Statistics Updates
 */
function initializeDashboard() {
  // Update UI values
  elements.profileName.textContent = STATE.profile.name;
  STATE.logs = getLogs();
  
  refreshDashboard();
}

function refreshDashboard() {
  STATE.logs = getLogs();
  
  // Calculate average emissions budget progress
  const latestLog = STATE.logs[0] || null; // Most recent log
  const target = STATE.profile.dailyTarget;
  const totalSavings = calculateTotalSavings();
  
  // Render summary text badges
  elements.totalSavingsBadge.textContent = `${totalSavings.toFixed(1)} kg`;
  
  // Draw circular budget chart
  const currentEmissions = latestLog ? latestLog.totalEmissions : 0;
  updateBudgetCircle(currentEmissions, target);

  // Render mini category values
  renderCategoryWidgets(latestLog);

  // Draw trend graph
  renderTrendsChart(STATE.logs);

  // Generate recommendation list
  renderInsights(latestLog, target);
}

function renderInsights(latestLog, target) {
  elements.insightsContainer.innerHTML = '';
  const insights = generateInsights(latestLog, target);
  
  insights.forEach(ins => {
    const card = document.createElement('div');
    card.className = `insight-card ${ins.type === 'warning' ? 'warning' : ''} ${ins.type === 'success' ? 'success' : ''}`;
    card.innerHTML = `
      <div class="insight-icon" aria-hidden="true">${ins.icon}</div>
      <div class="insight-details">
        <h4 class="insight-title">${ins.title}</h4>
        <p class="insight-text">${ins.text}</p>
      </div>
    `;
    elements.insightsContainer.appendChild(card);
  });
}

/**
 * Settings Modal handlers
 */
function openSettingsModal() {
  const profile = getUserProfile();
  
  // Pre-fill inputs
  document.getElementById('settings-name').value = profile.name;
  document.getElementById('settings-target').value = profile.dailyTarget;
  document.getElementById('settings-country').value = profile.country;
  
  elements.settingsModal.classList.add('active');
  elements.settingsModal.setAttribute('aria-hidden', 'false');
  document.getElementById('settings-name').focus();
}

function closeSettingsModal() {
  elements.settingsModal.classList.remove('active');
  elements.settingsModal.setAttribute('aria-hidden', 'true');
  elements.profileBadge?.focus();
}

function handleSettingsSave(e) {
  e.preventDefault();
  const name = document.getElementById('settings-name').value.trim();
  const target = Number(document.getElementById('settings-target').value);
  const country = document.getElementById('settings-country').value;

  if (!name || isNaN(target) || target <= 0) {
    showToast('Invalid parameters in profile settings', 'error');
    return;
  }

  saveUserProfile({ name, dailyTarget: target, country });
  STATE.profile = getUserProfile();
  elements.profileName.textContent = STATE.profile.name;
  
  closeSettingsModal();
  showToast('Profile configuration updated successfully!');
  
  if (STATE.activeView === 'dashboard') {
    refreshDashboard();
  }
}

/**
 * Emissions Tracking Logger Logic
 */
function loadLogForSelectedDate() {
  // Reset form and slider display
  elements.trackerForm.reset();
  elements.cleanEnergyVal.textContent = '0%';

  // Retrieve existing log for this date if any
  const logs = getLogs();
  const log = logs.find(l => l.date === STATE.selectedLogDate);

  if (log) {
    // Fill form elements
    // Transport
    document.getElementById('carKm').value = log.transport.carKm || '';
    document.getElementById('carFuelType').value = log.transport.carFuelType || 'petrol';
    document.getElementById('busKm').value = log.transport.busKm || '';
    document.getElementById('trainKm').value = log.transport.trainKm || '';
    document.getElementById('flightShortHours').value = log.transport.flightShortHours || '';
    document.getElementById('flightLongHours').value = log.transport.flightLongHours || '';

    // Energy
    document.getElementById('electricityKwh').value = log.energy.electricityKwh || '';
    document.getElementById('electricityCleanPercent').value = log.energy.electricityCleanPercent || 0;
    elements.cleanEnergyVal.textContent = `${log.energy.electricityCleanPercent || 0}%`;
    document.getElementById('gasKwh').value = log.energy.gasKwh || '';
    document.getElementById('heatingOilKwh').value = log.energy.heatingOilKwh || '';
    document.getElementById('waterM3').value = log.energy.waterM3 || '';

    // Diet
    document.getElementById('dietType').value = log.diet.dietType || 'mediumMeat';

    // Waste
    document.getElementById('landfillKg').value = log.waste.landfillKg || '';
    document.getElementById('recycledKg').value = log.waste.recycledKg || '';
    document.getElementById('compostKg').value = log.waste.compostKg || '';
    document.getElementById('clothingCount').value = log.waste.clothingCount || '';
    document.getElementById('electronicsCount').value = log.waste.electronicsCount || '';
    document.getElementById('appliancesCount').value = log.waste.appliancesCount || '';
    document.getElementById('furnitureCount').value = log.waste.furnitureCount || '';
  }
}

function handleLogSubmission(e) {
  e.preventDefault();

  // Date comes from calendar state, NOT from FormData
  const date = STATE.selectedLogDate;
  if (!date) {
    showToast('Please select a date on the calendar first.', 'error');
    return;
  }

  const formData = new FormData(elements.trackerForm);

  // Parse values into categories
  const log = {
    date: date,
    transport: {
      carKm: Number(formData.get('carKm')),
      carFuelType: formData.get('carFuelType'),
      busKm: Number(formData.get('busKm')),
      trainKm: Number(formData.get('trainKm')),
      flightShortHours: Number(formData.get('flightShortHours')),
      flightLongHours: Number(formData.get('flightLongHours'))
    },
    energy: {
      electricityKwh: Number(formData.get('electricityKwh')),
      electricityCleanPercent: Number(formData.get('electricityCleanPercent')),
      gasKwh: Number(formData.get('gasKwh')),
      heatingOilKwh: Number(formData.get('heatingOilKwh')),
      waterM3: Number(formData.get('waterM3'))
    },
    diet: {
      dietType: formData.get('dietType'),
      daysCount: 1
    },
    waste: {
      landfillKg: Number(formData.get('landfillKg')),
      recycledKg: Number(formData.get('recycledKg')),
      compostKg: Number(formData.get('compostKg')),
      clothingCount: Number(formData.get('clothingCount')),
      electronicsCount: Number(formData.get('electronicsCount')),
      appliancesCount: Number(formData.get('appliancesCount')),
      furnitureCount: Number(formData.get('furnitureCount'))
    }
  };

  // Compile calculations
  log.totalEmissions = calculateTotalEmissions(log);

  // Save to DB
  saveLog(log);
  showToast(`Daily footprint for ${date} saved: ${log.totalEmissions.toFixed(1)} kg CO2e.`);

  // Refresh calendar to show the newly-logged date, and reload history
  renderCalendar();
  refreshHistoryList();
}

function refreshHistoryList() {
  elements.historyList.innerHTML = '';
  const logs = getLogs();

  if (logs.length === 0) {
    elements.historyList.innerHTML = `
      <div class="empty-state">
        <p>No historical logged entries. Complete the tracking form to save logs.</p>
      </div>
    `;
    return;
  }

  logs.forEach(log => {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    // Parse date human format
    const dateObj = new Date(log.date);
    const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    
    const transport = calculateTransportEmissions(log.transport).toFixed(0);
    const energy = calculateEnergyEmissions(log.energy).toFixed(0);
    const diet = calculateDietEmissions(log.diet).toFixed(0);
    const waste = calculateWasteEmissions(log.waste).toFixed(0);

    item.innerHTML = `
      <div class="history-meta">
        <span class="history-date">${dateStr}</span>
        <div class="history-details">
          <span>🚗 Transit: ${transport}kg</span>
          <span>⚡ Energy: ${energy}kg</span>
          <span>🥗 Diet: ${diet}kg</span>
          <span>♻️ Waste: ${waste}kg</span>
        </div>
      </div>
      <div class="history-emissions">
        <span class="history-val">${log.totalEmissions.toFixed(1)} kg CO2e</span>
        <button class="btn-delete-log" data-id="${log.id}" aria-label="Delete entry for ${log.date}">🗑️</button>
      </div>
    `;

    // Deletion handler
    item.querySelector('.btn-delete-log').addEventListener('click', () => {
      if (confirm(`Are you sure you want to remove the log entry for ${log.date}?`)) {
        deleteLog(log.id);
        refreshHistoryList();
        renderCalendar();
        showToast('Log entry removed', 'info');
      }
    });

    elements.historyList.appendChild(item);
  });
}

/**
 * Inline Calendar Widget — renders a month grid with logged-date indicators.
 */
function renderCalendar() {
  if (!elements.calGrid) return;

  const year = STATE.calendarYear;
  const month = STATE.calendarMonth;
  const todayStr = new Date().toISOString().split('T')[0];

  // Update month label
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  elements.calMonthLabel.textContent = `${monthNames[month]} ${year}`;

  // Build a set of logged dates for fast lookup
  const logs = getLogs();
  const loggedDates = new Set(logs.map(l => l.date));

  // First day of the month (0=Sun, 6=Sat)
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  elements.calGrid.innerHTML = '';

  // Leading empty cells for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('button');
    empty.className = 'cal-day cal-day--empty';
    empty.disabled = true;
    empty.setAttribute('aria-hidden', 'true');
    elements.calGrid.appendChild(empty);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day';
    btn.textContent = d;
    btn.setAttribute('aria-label', `${monthNames[month]} ${d}, ${year}`);

    if (dateStr === todayStr) btn.classList.add('cal-day--today');
    if (loggedDates.has(dateStr)) btn.classList.add('cal-day--logged');
    if (dateStr === STATE.selectedLogDate) btn.classList.add('cal-day--selected');

    btn.addEventListener('click', () => {
      STATE.selectedLogDate = dateStr;
      renderCalendar();
      updateSelectedDateDisplay();
      loadLogForSelectedDate();
    });

    elements.calGrid.appendChild(btn);
  }
}

/**
 * Updates the selected-date banner text inside the tracker form.
 */
function updateSelectedDateDisplay() {
  if (!elements.selectedDateDisplay) return;
  const dateObj = new Date(STATE.selectedLogDate + 'T00:00:00');
  const todayStr = new Date().toISOString().split('T')[0];
  if (STATE.selectedLogDate === todayStr) {
    elements.selectedDateDisplay.textContent = 'Today — ' + dateObj.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });
  } else {
    elements.selectedDateDisplay.textContent = dateObj.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });
  }
}

/**
 * Challenges Management Tab logic
 */
function refreshChallengesView() {
  elements.challengesGrid.innerHTML = '';
  const challenges = getActiveChallengesDetails();
  const todayStr = new Date().toISOString().split('T')[0];

  challenges.forEach(c => {
    const card = document.createElement('div');
    card.className = 'glass-card challenge-card';
    
    // Streak formatting
    let streakHtml = '';
    if (c.streak > 0) {
      streakHtml = `<span class="challenge-streak" aria-label="Streak of ${c.streak} days">🔥 ${c.streak} Day Streak</span>`;
    }

    card.innerHTML = `
      ${c.activated ? '<span class="challenge-badge-active">Active</span>' : ''}
      <div class="challenge-header">
        <div class="challenge-icon" aria-hidden="true">${c.icon}</div>
        <div class="challenge-meta">
          <h3 class="challenge-title">${c.title}</h3>
          <span class="challenge-saving">Saves ~${c.co2SavedPerDay} kg CO2/day</span>
        </div>
      </div>
      <p class="challenge-desc">${c.description}</p>
      
      <div class="challenge-stats">
        <span>Completed: ${c.completedCount} times</span>
        ${streakHtml}
      </div>
      
      <div class="challenge-actions">
        <button class="btn btn-secondary btn-sub" data-id="${c.id}">
          ${c.activated ? 'Unsubscribe' : 'Subscribe'}
        </button>
        <button class="btn btn-primary btn-comp" data-id="${c.id}" ${!c.activated || c.lastCompleted === todayStr ? 'disabled' : ''}>
          ${c.lastCompleted === todayStr ? 'Completed Today' : 'Log Success'}
        </button>
      </div>
    `;

    // Click hooks
    card.querySelector('.btn-sub').addEventListener('click', () => {
      toggleChallengeSubscription(c.id);
      refreshChallengesView();
      showToast(`${c.title} ${c.activated ? 'deactivated' : 'activated!'}`);
    });

    card.querySelector('.btn-comp').addEventListener('click', () => {
      const updated = recordChallengeCompletion(c.id, todayStr);
      if (!updated) {
        showToast('Could not log completion for this challenge.', 'error');
        return;
      }
      refreshChallengesView();
      showToast(`Logged success! You saved ${c.co2SavedPerDay} kg CO2 today. Streak is now ${updated.streak}!`);
    });

    elements.challengesGrid.appendChild(card);
  });
}

/**
 * Diagnostics & Test execution in browser
 */
function runSystemDiagnostics() {
  elements.testLogConsole.innerHTML = '';
  elements.testPassedCount.textContent = '0';
  elements.testFailedCount.textContent = '0';

  runClientTests((msg, style) => {
    const line = document.createElement('div');
    line.className = `test-log-entry ${style || ''}`;
    line.textContent = msg;
    elements.testLogConsole.appendChild(line);
    elements.testLogConsole.scrollTop = elements.testLogConsole.scrollHeight;
  }).then(results => {
    elements.testPassedCount.textContent = results.passed;
    elements.testFailedCount.textContent = results.failed;
    
    if (results.failed === 0) {
      showToast('All browser unit validation checks passed!', 'success');
    } else {
      showToast(`${results.failed} tests failed. Check console output.`, 'error');
    }
  });
}

function handleResetDataRequest() {
  if (confirm('CAUTION: This will permanently wipe all logs, challenges, and settings details. Are you sure you want to proceed?')) {
    clearAllData();
    showToast('Platform databases cleared.', 'info');
    checkOnboarding();
    switchView('dashboard');
  }
}

// Initial run
window.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  setupEventListeners();
  loadThemePreference();
  checkOnboarding();
});
