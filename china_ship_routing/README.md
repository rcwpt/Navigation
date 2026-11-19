# China Ship Routing
### 中国沿海船舶定线制与全国沿海公共航路 (China Coastal Routeing & Public Routes)

Integrated Nautical GIS & Routeing Database encompassing:
1. **Liaoning Coastal Waters Ship Routeing System** (`附件9：辽宁沿海船舶定线制.pdf`)
2. **China Coastal Main Public Routes (Guide on Coastal Public Routes)** (`Huatai Circular [2026] 02` / China MSA Announcement No. 2 [2026])
3. **Zhejiang Coastal Waters Navigation Warning Zones** (`IMG_20261008_141758.jpg` - Yellow & Orange No-Sail Zones)
4. **Interactive Multi-ECDIS Route Importer & Safety Comparison Suite** (RTZ, GPX, CSV, KML, TXT, JSON)

- **Coordinate System:** CGCS2000 / WGS-84
- **Default Language:** English (with 1-click toggle to Chinese `中 / EN`)

---

## 📁 Folder Contents (`china_ship_routing`)

This standalone package contains everything required to visualize and inspect the entire Chinese coastal ship routeing system offline or online:

1. **`index.html`**  
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
     - **Route Comparison Suite**:
       - 1-Click File Browse, Drag & Drop onto sidebar or map canvas.
       - Supports ECDIS RTZ, GPX, CSV, KML, TXT, and JSON.
       - Automated safety audit: detects penetrations into Zhejiang No-Sail Warning Zones (Orange/Yellow).
       - TSS Separation Zone & Precautionary Area transit detection.
       - Corridor adherence, cross-track offset, and traffic flow alignment against China Coastal Public Routes.
       - Waypoint and leg comparison table with 1-click map zoom.
       - Exportable ASCII/plain text safety audit report.
       - Cruising speed calculator with real-time transit time estimates.
     - Dropdown selector for:
       - 6 Liaoning TSS Sections
       - 10 National Outer Public Routes
       - 13 National Inner Public Routes
       - 2 Zhejiang/Zhoushan Warning / No-Sail Zones
     - Search bar across all routes, schemes, waypoints, and flow bearings.
     - 9 Layer Toggle Chips with color-coded chips.
     - Interactive Feature Inspector with waypoint sequence table, courses, distances, corridor widths, and "📋 Copy Coordinates" button.

2. **`route_converter.js`**  
   Universal Marine Route Converter supporting 31 maritime formats, robust CSV/DMS/NMEA parser, and automatic coordinate sanitization.

3. **`route_comparator.js`**  
   Safety audit and mathematical engine calculating Rhumbline distance/bearing, point-in-polygon ray-casting, segment intersection, and public route alignment.

4. **`china_ship_routing.json`** (~572 KB)  
   Complete bilingual hierarchical JSON database containing 158 features.

5. **`china_ship_routing.geojson`** (~226 KB)  
   Standard RFC 7946 GeoJSON file containing all 158 spatial features for GIS software.

6. **`data.js`** (~320 KB)  
   JavaScript wrapper enabling `index.html` to run directly from local file protocol (`file:///...`) without CORS restrictions.

7. **`tiny-world-all-10000.js`** (~1.2 MB)  
   Local build of the TinyWorldMap vector engine and OSM 10,000 cities dataset.

8. **`leaflet.js` & `leaflet.css`** + **`images/`**  
   Self-contained Leaflet library and icons for full offline functionality.

---

## 🚀 How to Run

Simply **double-click** `index.html` in Windows Explorer or open it in any web browser (Google Chrome, Microsoft Edge, Firefox).  
No web server, installation, or internet connection required.
