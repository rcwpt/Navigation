# China Ship Routing
### 中国沿海船舶定线制与全国沿海公共航路 (China Coastal Routeing & Public Routes)

Integrated Nautical GIS & Routeing Database encompassing:
1. **Liaoning Coastal Waters Ship Routeing System** (`附件9：辽宁沿海船舶定线制.pdf`)
2. **China Coastal Main Public Routes (Guide on Coastal Public Routes)** (`Huatai Circular [2026] 02` / China MSA Announcement No. 2 [2026])
3. **Zhejiang Coastal Waters Navigation Warning Zones** (`IMG_20261008_141758.jpg` - Yellow & Orange No-Sail Zones)

- **Coordinate System:** CGCS2000 / WGS-84
- **Default Language:** English (with 1-click toggle to Chinese `中 / EN`)

---

## 📁 Folder Contents (`china_ship_routing`)

This standalone package contains everything required to visualize and inspect the entire Chinese coastal ship routeing system offline or online:

1. **`index.html`** (~66 KB)  
   Interactive web GIS application built with Leaflet and TinyWorldMap.
   - **Default Language:** English (with quick one-click toggle to Chinese `中 / EN`).
   - **Base Maps:**
     - 🌍 **Tiny World Map** (Ultra-lightweight vector world map from [tinyworldmap/tiny-world-map](https://github.com/tinyworldmap/tiny-world-map), operates 100% offline).
     - 🗺️ **OpenStreetMap** (Standard marine & topographic map).
     - 🧭 **CartoDB Voyager** (Clean navigation style).
     - 🌙 **CartoDB Dark Matter** (ECDIS Night Marine Mode).
     - 🛰️ **Esri World Imagery** (High-resolution satellite imagery).
     - 🌊 **OpenSeaMap Seamarks** (Nautical buoys, lights, beacons overlay).
   - **Interactive Features & Controls:**
     - Real-time Cursor Coordinates HUD (DMS & Decimal Degrees).
     - Dropdown selector for:
       - 6 Liaoning TSS Sections
       - 10 National Outer Public Routes
       - 13 National Inner Public Routes
       - 2 Zhejiang/Zhoushan Warning / No-Sail Zones
     - Search bar across all routes, schemes, waypoints, and flow bearings.
     - 9 Layer Toggle Chips with color-coded chips.
     - Interactive Feature Inspector with waypoint sequence table, courses, distances, corridor widths, and "📋 Copy Coordinates" button.
     - One-click export to JSON and GeoJSON.

2. **`china_ship_routing.json`** (~572 KB)  
   Complete bilingual hierarchical JSON database containing:
   - System metadata, chart references, and regulations.
   - **6 Routeing Sections** (Liaoning Coastal Waters).
   - **30 Traffic Separation Schemes (TSS)**.
   - **60 Traffic Lanes** (with width, length, and true bearings).
   - **10 Precautionary Areas** (circles, semicircles, and polygons).
   - **5 Junction / Connection Areas**.
   - **10 National Outer Public Routes** (Tianjin-Laotieshan, Bohai-Laotieshan, Laotieshan-Chengshanjiao, Chengshanjiao-Yangtze, Zhejiang Outer, Fujian Outer, Guangdong Outer, Qiongzhou-Qinzhou, branches).
   - **13 National Inner Public Routes** (Tianjin-Changshan, Changshan-Chengshanjiao, Chengshanjiao-Yangtze Inner, Zhejiang East, Fujian Middle, Guangdong Inner, Maoming-Qiongzhou, Qiongzhou-Beihai, branches).
   - **2 Navigation Warning / No-Sail Zones** (Yellow Warning Zone 5 pts, Orange Warning Zone 8 pts).
   - Embedded RFC 7946 GeoJSON FeatureCollection (158 features).

3. **`china_ship_routing.geojson`** (~226 KB)  
   Standard RFC 7946 GeoJSON file containing all 158 spatial features for GIS software (QGIS, ArcGIS, Mapbox, Leaflet, OpenLayers).

4. **`data.js`** (~320 KB)  
   JavaScript wrapper enabling `index.html` to run directly from local file protocol (`file:///...`) without web server or CORS restrictions.

5. **`tiny-world-all-10000.js`** (~1.2 MB)  
   Local build of the TinyWorldMap vector engine and OSM 10,000 cities dataset.

6. **`leaflet.js` & `leaflet.css`** + **`images/`**  
   Self-contained Leaflet library and icons for full offline functionality.

---

## 🚀 How to Run

Simply **double-click** `index.html` in Windows Explorer or open it in any web browser (Google Chrome, Microsoft Edge, Firefox).  
No web server, installation, or internet connection required.
