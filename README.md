# EcoTrace - Carbon Footprint Awareness Platform

EcoTrace is an interactive Single Page Application (SPA) designed to help individuals calculate, track, and systematically reduce their daily carbon footprint through personalized insights and active challenge streaks.

---

## 1. Selected Vertical
We chose the **Individual Lifestyle Carbon Tracking & Habit Mitigation** vertical. 
Rather than analyzing industrial or corporate emissions, EcoTrace focuses on individual daily habits: commuting choices, household utilities, diet patterns, and retail consumer waste. This is the vertical where personal accountability can be translated into immediate, quantifiable environmental improvements.

---

## 2. Approach and Logic

### Architectural Architecture
EcoTrace is built as a **zero-dependency, modular Vanilla JS Single Page Application (SPA)**.
- **Strict Separation of Concerns**: Logic is divided into distinct ES6 modules:
  - `calculator.js`: Pure mathematical functions implementing verified coefficient models.
  - `db.js`: Local storage manager enforcing schema integrity and protection routines.
  - `challenges.js`: Subscriptions tracker evaluating streak progression and carbon savings.
  - `dashboard.js`: Custom SVG chart generation engine and rules-based insights analyst.
  - `app.js`: Master application view controller and DOM router.
  - `tests.js`: Embedded user-facing assertion testing engine.
- **Performance & Security**: Eliminating complex frameworks (React/Next) and charting libraries (Chart.js) translates into instantaneous load times, zero third-party dependency vulnerabilities, and complete visual control.

### Mathematical Logic (Emission Coefficients)
All calculation coefficients are derived from standard environmental databases (US EPA, UK DEFRA, EEA) and computed in **kilograms of CO2 equivalent (kg CO2e)**:

1. **Travel & Transit**:
   - *Private Vehicles*: Petrol car (0.170 kg/km), Diesel car (0.165 kg/km), Hybrid car (0.095 kg/km), Electric car (0.045 kg/km).
   - *Public Transport*: Local bus (0.089 kg/km), Train/Subway (0.035 kg/km).
   - *Flights*: Air travel emissions scale with duration. Short-haul flights (< 3 hours) are calculated at 0.150 kg/km (accounting for radiative forcing). Long-haul flights (>= 3 hours) are calculated at 0.115 kg/km. (Assumed average cruise speed: 750 km/h).
   
2. **Household Utilities**:
   - *Grid Electricity*: 0.385 kg/kWh (average standard global grid mix). Renewable offset logic: `standardKwh = electricityKwh * (1 - cleanPercent/100)`.
   - *Natural Gas*: 0.182 kg/kWh.
   - *Heating Oil*: 0.268 kg/kWh.
   - *Water Supply & Wastewater Treatment*: 0.298 kg/m³.

3. **Dietary Patterns (Per Day)**:
   - Heavy Meat (>100g/day): 7.20 kg CO2e
   - Medium Meat/Mixed: 5.63 kg CO2e
   - Low Meat (<50g/day): 4.67 kg CO2e
   - Pescatarian: 3.91 kg CO2e
   - Vegetarian: 3.81 kg CO2e
   - Vegan: 2.89 kg CO2e

4. **Waste & Consumer Purchases**:
   - *Landfill Trash*: 0.520 kg CO2e per kg.
   - *Recycling Offset (Credit)*: -0.210 kg CO2e per kg recycled (subtracted from footprint).
   - *Organic Composting*: 0.090 kg CO2e per kg.
   - *Cradle-to-Grave Purchase Offsets*: Clothing (15.0 kg/item), Electronics/Tech (95.0 kg/item), Large Appliances (220.0 kg/item), Furniture (45.0 kg/item).

---

## 3. How the Solution Works

1. **Onboarding Wizard**:
   When launching the platform, the wizard prompts the user to enter their name, setup their baseline daily emissions target limit, and select their region. This is stored securely in `localStorage` to initialize their profile.
   
2. **Interactive Logging**:
   Under the "Track Emissions" tab, users enter details about their daily actions. EcoTrace calculates their sub-footprints and aggregates them. The form automatically pre-fills existing data if they select a date they have logged before.
   
3. **Analytics Dashboard**:
   - **Circular Budget Chart**: Compares total emissions vs the user's customized target. Warnings turn red if they exceed budget limits.
   - **Interactive Trends Chart**: A custom SVG-rendered bar graph displaying logs over the last 7 logged days.
   - **Personalized Insights**: Adapts to the user's data. If transport emissions represent > 40% of their footprint, it suggests specific mitigations.
   
4. **Action Pledges & Streaks**:
   Users subscribe to green habit challenges (e.g., "Active Commuting", "Meat-Free Day"). Logging success on an active challenge updates their cumulative offset credit and increases their daily streak fire counter.
   
5. **System Diagnostics Test Runner**:
   The diagnostics screen includes a test suite that evaluates all calculations and data operations, rendering real-time pass/fail states in a styled console.

---

## 4. Design Decisions & Assumptions

- **Local Storage Limitations**: We assume the browser supports HTML5 local storage. All values are stored client-side for privacy and zero latency.
- **Flight Calculations**: Flight calculations assume a constant speed of 750 km/h to convert flight duration input (easier for users to remember) into actual distance.
- **Baseline Floor**: Total daily emissions are constrained mathematically to never go below 0, preventing hypothetical scenarios where massive recycling offsets output negative emissions.
- **Accessibility (a11y)**: Focus layouts are highlighted using bright neon borders. HTML elements are mapped using semantic tags. Navigation tabs can be completely browsed using standard Keyboard controls (Tab, Enter/Space). Skip-to-content links bypass long navigation headers.

---

## 5. Running the Application

EcoTrace is entirely static. You can launch it by double-clicking the `index.html` file in any modern web browser.

### Local Development Server
To serve it over local networks or review responsiveness, run a simple local web server. 
For example, inside PowerShell:
```powershell
python -m http.server 8000
```
Then visit: `http://localhost:8000`.

---

## 6. Running Tests

EcoTrace has both command-line test runners and client-side testing setups.

### Command-Line (CLI) Tests
You can run automated tests using Node.js.
Make sure you have Node.js installed, then execute:
```bash
npm test
```
Or directly:
```bash
node tests/calculator.test.js
```

### Browser Diagnostics Tests
Navigate to the **Diagnostics** section in the application navigation header and click **Run Test Suite Assertions** to execute the tests in the browser context.
