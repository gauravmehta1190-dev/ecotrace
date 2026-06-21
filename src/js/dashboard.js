/**
 * Dashboard Rendering and Analytics Engine
 * 
 * Generates custom SVG charts (Category breakdowns & Historical Trends)
 * and evaluates daily log logs to provide tailored ecological insights.
 */

import { calculateTotalEmissions } from './calculator.js';
import { getSavingsByCategory } from './challenges.js';

/**
 * Generates personalized ecological insights based on current emission profiles.
 * @param {Object} latestLog - The most recent daily log entry.
 * @param {number} target - User's daily emissions target limit in kg CO2e.
 * @returns {Array<Object>} List of insights with title, text, type (info, success, warning) and icon.
 */
export function generateInsights(latestLog, target) {
  const insights = [];
  
  if (!latestLog) {
    insights.push({
      type: 'info',
      icon: '💡',
      title: 'First Step: Track a Day',
      text: 'Use the "Track Emissions" tab to log your first day of carbon data. Once done, you will receive personalized tips here.'
    });
    return insights;
  }

  const total = latestLog.totalEmissions;

  // Insight 1: Budget Analysis
  if (total <= target) {
    insights.push({
      type: 'success',
      icon: '🌱',
      title: 'Under Emissions Budget!',
      text: `Excellent work! Your total of ${total.toFixed(1)} kg CO2e is below your daily target of ${target} kg CO2e.`
    });
  } else {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Emissions Budget Exceeded',
      text: `Your emissions of ${total.toFixed(1)} kg CO2e are above your daily target of ${target} kg CO2e. Explore active challenges to lower it.`
    });
  }

  // Calculate percentages of each category
  const transport = latestLog.transport ? calculateTotalEmissions({ transport: latestLog.transport }) : 0;
  const energy = latestLog.energy ? calculateTotalEmissions({ energy: latestLog.energy }) : 0;
  const diet = latestLog.diet ? calculateTotalEmissions({ diet: latestLog.diet }) : 0;
  const waste = latestLog.waste ? calculateTotalEmissions({ waste: latestLog.waste }) : 0;

  const pct = (catVal) => (total > 0 ? (catVal / total) * 100 : 0);

  // Category specific checks
  if (pct(transport) > 40) {
    insights.push({
      type: 'warning',
      icon: '🚗',
      title: 'High Travel Footprint',
      text: 'Transportation accounts for over 40% of your footprint today. Consider grouping errands, active cycling, or switching to public transit.'
    });
  }

  if (pct(energy) > 45) {
    insights.push({
      type: 'warning',
      icon: '⚡',
      title: 'High Energy Intensity',
      text: 'Your household energy usage is high. Try unplugging standby appliances, taking shorter showers, or opting for a clean-energy grid option.'
    });
  }

  if (pct(diet) > 35 && latestLog.diet?.dietType !== 'vegan' && latestLog.diet?.dietType !== 'vegetarian') {
    insights.push({
      type: 'info',
      icon: '🍔',
      title: 'Dietary Adjustments',
      text: 'Dietary choices contribute significantly to your emissions. Replacing one beef or pork meal with a vegetarian option saves ~2.5 kg CO2e.'
    });
  }

  if (pct(waste) > 20) {
    insights.push({
      type: 'info',
      icon: '🗑️',
      title: 'Waste & Consumer Footprint',
      text: 'Retail purchases and landfill trash are driving up your waste footprint. Try composting organic scraps or recycling more plastic/paper.'
    });
  }

  // Add challenge suggestion if doing well
  if (insights.length <= 2) {
    insights.push({
      type: 'info',
      icon: '🎖️',
      title: 'Boost Your Score',
      text: 'Subscribe to a new green challenge in the "Reduce/Challenges" tab to build long-term carbon-saving streaks!'
    });
  }

  return insights;
}

/**
 * Renders the circular progress widget.
 */
export function updateBudgetCircle(total, target) {
  const circleFill = document.querySelector('.metric-circle-fill');
  const valueDisplay = document.querySelector('.metric-value');
  const comparisonText = document.querySelector('.metric-compare');

  if (!circleFill || !valueDisplay) return;

  // Cap value display to 1 decimal
  valueDisplay.textContent = total.toFixed(1);

  // Calculate percentage of budget
  const pct = target > 0 ? (total / target) * 100 : 0;
  
  // Calculate SVG stroke offset (circumference of r=70 is 440)
  const maxOffset = 440;
  const offset = Math.max(0, maxOffset - (Math.min(100, pct) / 100) * maxOffset);
  circleFill.style.strokeDashoffset = offset;

  // Toggle over-budget warning style
  if (total > target) {
    circleFill.classList.add('over-budget');
    const overAmt = (total - target).toFixed(1);
    comparisonText.innerHTML = `<span style="color: var(--accent-red); font-weight: 600;">+${overAmt} kg over budget</span>`;
  } else {
    circleFill.classList.remove('over-budget');
    const remaining = (target - total).toFixed(1);
    comparisonText.innerHTML = `<span style="color: var(--accent-emerald-light); font-weight: 600;">${remaining} kg remaining</span>`;
  }
}

/**
 * Renders the category breakdown list inside the widget grid.
 */
export function renderCategoryWidgets(latestLog) {
  const values = {
    transport: latestLog?.transport ? calculateTotalEmissions({ transport: latestLog.transport }) : 0,
    energy: latestLog?.energy ? calculateTotalEmissions({ energy: latestLog.energy }) : 0,
    diet: latestLog?.diet ? calculateTotalEmissions({ diet: latestLog.diet }) : 0,
    waste: latestLog?.waste ? calculateTotalEmissions({ waste: latestLog.waste }) : 0
  };

  const displays = {
    transport: document.querySelector('#val-transport'),
    energy: document.querySelector('#val-energy'),
    diet: document.querySelector('#val-diet'),
    waste: document.querySelector('#val-waste')
  };

  Object.keys(values).forEach(cat => {
    if (displays[cat]) {
      displays[cat].textContent = `${values[cat].toFixed(1)} kg`;
    }
  });
}

/**
 * Draws a lightweight, highly-interactive SVG Bar Chart showing the last 7 logs.
 * @param {Array} logs - Sorted logs (assumed sorted by date desc).
 */
export function renderTrendsChart(logs) {
  const chartWrapper = document.getElementById('trends-chart-container');
  if (!chartWrapper) return;

  // Clear previous chart
  chartWrapper.innerHTML = '';

  // Get last 7 days of logs, sort them chronologically (oldest to newest)
  const last7Logs = logs.slice(0, 7).reverse();

  if (last7Logs.length === 0) {
    chartWrapper.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <p>No historical data logs recorded yet. Track a few days to view trends!</p>
      </div>
    `;
    return;
  }

  // Find max emissions to scale the graph height
  const maxEmissions = Math.max(...last7Logs.map(l => l.totalEmissions), 10); // Floor of 10 for neat scale

  // Construct SVG structure
  const svgWidth = 600;
  const svgHeight = 240;
  const paddingLeft = 40;
  const paddingBottom = 30;
  const paddingTop = 20;
  const paddingRight = 10;
  
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  
  const barWidth = Math.min(45, (chartWidth / last7Logs.length) * 0.5);
  const gapWidth = (chartWidth - (barWidth * last7Logs.length)) / (last7Logs.length + 1);

  let gridLines = '';
  // 3 grid lines (25%, 50%, 75%, 100%)
  for (let i = 1; i <= 4; i++) {
    const yVal = paddingTop + chartHeight - (chartHeight * (i / 4));
    const labelVal = (maxEmissions * (i / 4)).toFixed(0);
    gridLines += `
      <line x1="${paddingLeft}" y1="${yVal}" x2="${svgWidth - paddingRight}" y2="${yVal}" stroke="var(--border-color)" stroke-dasharray="4,4" />
      <text x="${paddingLeft - 8}" y="${yVal + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end" font-family="var(--font-body)">${labelVal}</text>
    `;
  }

  let bars = '';
  last7Logs.forEach((log, index) => {
    const x = paddingLeft + gapWidth + index * (barWidth + gapWidth);
    const height = (log.totalEmissions / maxEmissions) * chartHeight;
    const y = paddingTop + chartHeight - height;
    
    // Parse nice date label (e.g. "Jun 20" or short weekday "Mon")
    const dateObj = new Date(log.date);
    const dateLabel = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

    bars += `
      <g class="chart-bar-group">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" fill="url(#barGradient)" rx="4" ry="4">
          <title>${log.date}: ${log.totalEmissions.toFixed(1)} kg CO2e</title>
        </rect>
        <text x="${x + barWidth/2}" y="${y - 6}" fill="var(--text-primary)" font-size="10" font-weight="600" text-anchor="middle" font-family="var(--font-body)">${log.totalEmissions.toFixed(0)}</text>
        <text x="${x + barWidth/2}" y="${paddingTop + chartHeight + 16}" fill="var(--text-muted)" font-size="10" text-anchor="middle" font-family="var(--font-heading)">${dateLabel}</text>
      </g>
    `;
  });

  const svgContent = `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="svg-chart" aria-label="Carbon emission trends chart for the last 7 logged days" role="img">
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent-emerald-light)" />
          <stop offset="100%" stop-color="var(--accent-teal)" />
        </linearGradient>
      </defs>
      
      <!-- Grid lines & Y Axis -->
      ${gridLines}
      <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${paddingTop + chartHeight}" stroke="var(--border-color)" />
      
      <!-- X Axis -->
      <line x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${svgWidth - paddingRight}" y2="${paddingTop + chartHeight}" stroke="var(--border-color)" />
      
      <!-- Bars & Values -->
      ${bars}
    </svg>
  `;
  
  chartWrapper.innerHTML = svgContent;
}
