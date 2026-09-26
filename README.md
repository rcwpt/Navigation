# 🧭 Navigation Hub | Advanced Bridge Dashboard

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frcwpt%2Fnavigation)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-green.svg)](https://rcwpt.github.io/navigation/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployment%20Ready-black?logo=vercel)](https://vercel.com)

**Navigation Hub** is an advanced, client-side tactical navigation suite and maritime bridge dashboard designed for navigational officers, mariners, and maritime students. It combines ENC/AVCS chart management, voyage route analysis, GMDSS radio operations, meteorological intelligence, and celestial navigation into a single modern dashboard.

---

## 🌐 Live Deployments

- **Vercel (Primary App)**: [https://navigator-lime.vercel.app/](https://navigator-lime.vercel.app/)
- **GitHub Pages (Mirror)**: [https://rcwpt.github.io/navigation/](https://rcwpt.github.io/navigation/)

---

## ⚡ Core Modules & Features

### 1. 🎛️ Bridge Dashboard (`index.html`)
- Central tactical launcher with dark/light mode and multilingual localization (**English**, **中文**, **Bahasa Indonesia**).
- **GMDSS Maintenance Protocols**: Built-in SOLAS Chapter IV checklists covering Daily, Weekly, and Monthly diagnostic tests, plus official Radio Log directives.

### 2. 📡 Navtex Tracker (`navtex.html`)
- Interactive global Leaflet map displaying operational NAVTEX stations across all NAVAREAs (I through XVI).
- Transmission frequencies (518 kHz International, 490 kHz / 4209.5 kHz National), B1 station identifiers, broadcast time slots, and Maritime Safety Information (MSI).

### 3. 📻 GMDSS DSC Directory (`dscfinder.html`)
- Comprehensive Coast Radio Station (CRS) lookup database.
- Searchable frequencies for VHF, MF, and HF Digital Selective Calling (DSC) for routine and distress communications.

### 4. 🌦️ Marine Meteo Hub (`meteo.html`)
- Consolidated meteorological monitoring station.
- Live surface pressure charts, synoptic analysis, satellite imagery, ocean wave/swell forecasts, lightning maps, and aviation METAR/TAF telemetry.

### 5. ⭐ Celestial Calculator (`celestial.html`)
- Powered by high-accuracy astronomical algorithms (`astronomy-engine`).
- Computes altitude (Hc), azimuth (Zn), and gyro compass error for the Sun, Moon, planets, and primary navigational stars based on Dead Reckoning (DR) coordinates and UTC time.

### 6. 🧭 Gyro Compass Error ABC Method (`gyroerror.html`)
- Rapid determination of gyro compass error and deviation using celestial ABC tables.
- Supports data export/import (JSON), print-ready reporting, and night mode for bridge watchkeeping.

### 7. 📏 CATZOC Accuracy Evaluator (`catzoc.html`)
- Evaluates Electronic Navigational Chart (ENC) bathymetric accuracy based on IMO / IHO S-57 Category of Zones of Confidence (A1, A2, B, C, D, U).
- Calculates maximum position uncertainty and depth accuracy tolerance for safe under-keel clearance (UKC).

### 8. 🗺️ ADMIRALTY Digital Catalogue (`admiralty.html`)
- Interactive global map featuring:
  - **AVCS Folios & ENC Bands 1–6** (Overview, General, Coastal, Approach, Harbour, Berthing) with 35,000+ cell coverage.
  - **Admiralty Sailing Directions** (NP1–NP74).
  - **Admiralty List of Radio Signals** (ALRS NP281–NP286).
  - **Admiralty Tide Tables (ATT)** and **List of Lights (ALL/ADLL)**.
  - Over **5,100+ UN/LOCODE** worldwide commercial ports and harbours.

### 9. 🗂️ ENC Permit Manager Pro (`encmanager.html`)
- ECDIS permit expiration tracker with color-coded status alerts.
- Supports CSV voyage permit import (`.eusr.csv`), 1-click duplicate removal, order basket requisition, and official UKHO export format.

### 10. 🚀 Unified ENC & ADMIRALTY Voyage Suite (`encsuite.html`)
- Dual-screen tactical bridge interface: Interactive ADMIRALTY catalogue map paired alongside an ENC permit manager sidebar.
- Import standard passage routes (`.rtz`, `.csv`, `.gpx`), automatically cross-reference existing permits, and identify missing charts needed for the voyage.

---

## 🚀 Deployment to Vercel

### Method 1: 1-Click Button (Recommended)
Click the button below to deploy this repository directly into your Vercel account:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frcwpt%2Fnavigation)

### Method 2: Import via Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." > "Project"**.
2. Select **GitHub** and authorize access to `rcwpt/navigation`.
3. In the project configuration:
   - **Framework Preset**: `Other` (Static HTML)
   - **Root Directory**: `./`
   - Leave Build Command and Output Directory blank.
4. Click **Deploy**.
5. Your app will be live within seconds at `https://<project-name>.vercel.app` (e.g., `https://navigation-hub.vercel.app`).

### Updating the GitHub "About" Website Link
Once your Vercel project is deployed:
1. Open your repository at [github.com/rcwpt/navigation](https://github.com/rcwpt/navigation).
2. Look at the right sidebar under **About**.
3. Click the ⚙️ (gear/settings) icon next to **About**.
4. In the **Website** field, enter your new Vercel URL:
   ```text
   https://<your-project-name>.vercel.app
   ```
5. Click **Save changes**.

---

## 💻 Local Development

Because this project is built with static web standards, no complex build tools or compilers are required:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rcwpt/navigation.git
   cd navigation
   ```

2. **Serve locally** using any lightweight static server:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Or using Node.js npx
   npx serve .
   ```

3. Open your browser and navigate to `http://localhost:8000`.

---

## 🛠️ Built With

- **Tailwind CSS** - Modern utility-first CSS styling
- **Leaflet.js** - Open-source interactive mapping engine
- **Astronomy Engine** - High-precision planetary and celestial ephemeris calculations
- **FontAwesome & Lucide Icons** - Bridge and technical iconography
- **Vercel** - High-performance global edge hosting

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more details.

---

## 👤 Author

Developed by **C. Wijaya** ([@rcwpt](https://github.com/rcwpt))  
Instagram: [@c.wijaya.t](https://www.instagram.com/c.wijaya.t/)
