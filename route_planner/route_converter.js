/**
 * Marine Route Converter Engine
 * High-precision Multi-ECDIS Route Importer & Exporter
 * Supports 31 Maritime Route Formats
 */

(function (global) {
  'use strict';

  // --- Helper Math & Coordinates ---
  function toRad(deg) { return (deg * Math.PI) / 180; }
  function toDeg(rad) { return (rad * 180) / Math.PI; }

  function rhumblineDistance(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth radius in NM
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaPhi = phi2 - phi1;
    let deltaLambda = toRad(Math.abs(lon2 - lon1));
    if (deltaLambda > Math.PI) deltaLambda = 2 * Math.PI - deltaLambda;

    const deltaPsi = Math.log(Math.tan(Math.PI / 4 + phi2 / 2) / Math.tan(Math.PI / 4 + phi1 / 2));
    const q = Math.abs(deltaPsi) > 1e-10 ? deltaPhi / deltaPsi : Math.cos(phi1);
    return Math.sqrt(deltaPhi * deltaPhi + q * q * deltaLambda * deltaLambda) * R;
  }

  function rhumblineBearing(lat1, lon1, lat2, lon2) {
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    let deltaLambda = toRad(lon2 - lon1);
    if (deltaLambda > Math.PI) deltaLambda -= 2 * Math.PI;
    if (deltaLambda < -Math.PI) deltaLambda += 2 * Math.PI;

    const deltaPsi = Math.log(Math.tan(Math.PI / 4 + phi2 / 2) / Math.tan(Math.PI / 4 + phi1 / 2));
    let theta = Math.atan2(deltaLambda, deltaPsi);
    let brg = toDeg(theta);
    return (brg + 360) % 360;
  }

  function formatDMS(val, isLat, style) {
    if (val === undefined || val === null || isNaN(val)) return '-';
    const hemi = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    const degPad = isLat ? 2 : 3;

    if (style === 'furuno_txt') {
      // e.g. 29 54.830 N
      return `${String(deg).padStart(degPad, '0')} ${min.toFixed(3).padStart(6, '0')} ${hemi}`;
    } else if (style === 'nmea') {
      // e.g. 2954.830,N
      const minInt = Math.floor(min);
      const minDec = Math.round((min - minInt) * 1000);
      return `${String(deg).padStart(degPad, '0')}${String(minInt).padStart(2, '0')}.${String(minDec).padStart(3, '0')},${hemi}`;
    } else if (style === 'adc') {
      // e.g. 29°54.83'N
      return `${String(deg).padStart(degPad, '0')}°${min.toFixed(2).padStart(5, '0')}'${hemi}`;
    } else {
      // standard nautical DMS
      return `${String(deg).padStart(degPad, '0')}°${min.toFixed(3).padStart(6, '0')}'${hemi}`;
    }
  }

  function recalculateRoute(wpts) {
    if (!wpts || !Array.isArray(wpts)) return [];
    let acc = 0;
    for (let i = 0; i < wpts.length; i++) {
      const cur = wpts[i];
      cur.id = cur.id || cur.name || `WP${String(i + 1).padStart(3, '0')}`;
      cur.name = cur.name || cur.id;
      cur.lat = parseFloat(cur.lat);
      cur.lon = parseFloat(cur.lon);
      cur.portXtd = cur.portXtd !== undefined ? parseFloat(cur.portXtd) : 0.1;
      cur.stbdXtd = cur.stbdXtd !== undefined ? parseFloat(cur.stbdXtd) : 0.1;
      cur.radius = cur.radius !== undefined ? parseFloat(cur.radius) : 0.5;
      cur.speed = cur.speed !== undefined ? parseFloat(cur.speed) : 12.0;

      if (i < wpts.length - 1) {
        const next = wpts[i + 1];
        cur.dist = rhumblineDistance(cur.lat, cur.lon, next.lat, next.lon);
        cur.course = rhumblineBearing(cur.lat, cur.lon, next.lat, next.lon);
      } else {
        cur.dist = 0;
        cur.course = 0;
      }
      cur.accDist = acc;
      acc += cur.dist;
    }
    return wpts;
  }

  // --- PARSERS & SERIALIZERS FOR 31 FORMATS ---
  const FORMATS = [
  {
    "id": "furuno_3000_rtz",
    "name": "Furuno 3000 / 3200 / 3300 (.rtz)",
    "category": "🇯🇵 Furuno ECDIS & GPS",
    "extension": ".rtz",
    "mimeType": "application/xml",
    "description": "Standard CIRM RTZ 1.0 XML route format utilized by Furuno 3000 / 3200 / 3300 ECDIS."
  },
  {
    "id": "furuno_fea_fmd_txt",
    "name": "Furuno FEA/FMD (.txt)",
    "category": "🇯🇵 Furuno ECDIS & GPS",
    "extension": ".txt",
    "mimeType": "text/plain",
    "description": "Furuno FEA-2107 / FMD-3100 / FMD-3200 text-based route exchange format."
  },
  {
    "id": "furuno_gpx",
    "name": "Furuno GP-170 (.gpx)",
    "category": "🇯🇵 Furuno ECDIS & GPS",
    "extension": ".gpx",
    "mimeType": "application/gpx+xml",
    "description": "GPX 1.1 format for Furuno GP-170, GP-150 GPS Navigator & NavNet chart plotters."
  },
  {
    "id": "jrc_csv",
    "name": "JRC ECDIS JAN-701B/901B/9201 (.csv)",
    "category": "🇯🇵 JRC (Japan Radio Co.)",
    "extension": ".csv",
    "mimeType": "text/csv",
    "description": "JRC JAN-701B, 901B, 7201, 9201 standard route CSV format with degrees & minutes."
  },
  {
    "id": "chartco_csv",
    "name": "ChartCo PassageManager (.csv)",
    "category": "🇯🇵 JRC (Japan Radio Co.)",
    "extension": ".csv",
    "mimeType": "text/csv",
    "description": "ChartCo PassageManager route sheet CSV format (compatible with JRC ECDIS)."
  },
  {
    "id": "jrc_rtm",
    "name": "JRC ECDIS Master Route (.rtm)",
    "category": "🇯🇵 JRC (Japan Radio Co.)",
    "extension": ".rtm",
    "mimeType": "text/plain",
    "description": "JRC ECDIS Master Route (.rtm) binary/text interchange format."
  },
  {
    "id": "jrc_rtn",
    "name": "JRC ECDIS Route File (.rtn)",
    "category": "🇯🇵 JRC (Japan Radio Co.)",
    "extension": ".rtn",
    "mimeType": "text/plain",
    "description": "JRC ECDIS Route File (.rtn) interchange format."
  },
  {
    "id": "jrc_rta",
    "name": "JRC ECDIS Alternate Route (.rta)",
    "category": "🇯🇵 JRC (Japan Radio Co.)",
    "extension": ".rta",
    "mimeType": "text/plain",
    "description": "JRC ECDIS Alternate Route (.rta) format."
  },
  {
    "id": "jrc_jmr",
    "name": "JRC JMA-9122 Marine Radar (.jmr)",
    "category": "🇯🇵 JRC (Japan Radio Co.)",
    "extension": ".jmr",
    "mimeType": "text/plain",
    "description": "JRC JMA-9122, JMA-9132, JMA-9000 Marine Radar route format."
  },
  {
    "id": "transas_rt3",
    "name": "Transas Navi-Sailor 3000/4000 (.rt3)",
    "category": "🇷🇺/🇫🇮 Transas & Wärtsilä",
    "extension": ".rt3",
    "mimeType": "text/plain",
    "description": "Transas Navi-Sailor 3000 / 4000 ECDIS standard route exchange file format."
  },
  {
    "id": "transas_rt4",
    "name": "Transas Wärtsilä iSailor (.rt4)",
    "category": "🇷🇺/🇫🇮 Transas & Wärtsilä",
    "extension": ".rt4",
    "mimeType": "application/json",
    "description": "Transas Wärtsilä iSailor mobile navigation route exchange format."
  },
  {
    "id": "wartsila_nacos",
    "name": "Wärtsilä NACOS Platinum (.xml)",
    "category": "🇷🇺/🇫🇮 Transas & Wärtsilä",
    "extension": ".xml",
    "mimeType": "application/xml",
    "description": "Wärtsilä SAM NACOS Platinum integrated navigation system XML route format."
  },
  {
    "id": "kongsberg_rut",
    "name": "Kongsberg K-Bridge (.rut)",
    "category": "🇳🇴 Kongsberg Maritime",
    "extension": ".rut",
    "mimeType": "text/plain",
    "description": "Kongsberg K-Bridge, K-Nav ECDIS RUT route table file format."
  },
  {
    "id": "kongsberg_rux",
    "name": "Kongsberg XML Route (.rux)",
    "category": "🇳🇴 Kongsberg Maritime",
    "extension": ".rux",
    "mimeType": "application/xml",
    "description": "Kongsberg Maritime XML-based RUX route exchange format."
  },
  {
    "id": "sperry_route",
    "name": "Sperry Marine VisionMaster (.route)",
    "category": "🇺🇸/🇬🇧 Sperry Marine & eGlobe",
    "extension": ".route",
    "mimeType": "text/plain",
    "description": "Sperry Marine VisionMaster FT ECDIS route file format."
  },
  {
    "id": "eglobe_rte",
    "name": "eGlobe / ChartWorld G2 (.rte)",
    "category": "🇺🇸/🇬🇧 Sperry Marine & eGlobe",
    "extension": ".rte",
    "mimeType": "text/plain",
    "description": "eGlobe / ChartWorld G2 ECDIS RTE route file format."
  },
  {
    "id": "eglobe_cb",
    "name": "eGlobe ChartBrowser (.cb)",
    "category": "🇺🇸/🇬🇧 Sperry Marine & eGlobe",
    "extension": ".cb",
    "mimeType": "text/plain",
    "description": "ChartWorld / eGlobe ECDIS CB route exchange file format."
  },
  {
    "id": "simrad_rtx",
    "name": "Simrad Maris ECDIS900 (.rtx)",
    "category": "🇳🇴 Simrad / Navico",
    "extension": ".rtx",
    "mimeType": "text/plain",
    "description": "Simrad Maris ECDIS900 RTX route export format."
  },
  {
    "id": "simrad_no_ext",
    "name": "Simrad ECDIS (No Extension)",
    "category": "🇳🇴 Simrad / Navico",
    "extension": "",
    "mimeType": "text/plain",
    "description": "Simrad ECDIS ASCII text format without file extension."
  },
  {
    "id": "raytheon_cvt",
    "name": "Raytheon Anschütz Synapsis (.cvt)",
    "category": "🇩🇪 Raytheon Anschütz & SAM",
    "extension": ".cvt",
    "mimeType": "text/plain",
    "description": "Raytheon Anschütz Synapsis / ECDIS 24 CVT route format."
  },
  {
    "id": "sam_no_ext",
    "name": "SAM Electronics ChartPilot (No Ext)",
    "category": "🇩🇪 Raytheon Anschütz & SAM",
    "extension": "",
    "mimeType": "text/plain",
    "description": "SAM Electronics / Wärtsilä SAM ChartPilot route format without extension."
  },
  {
    "id": "chart_pilot_txt",
    "name": "Chart Pilot 1100 (.txt)",
    "category": "🇩🇪 Raytheon Anschütz & SAM",
    "extension": ".txt",
    "mimeType": "text/plain",
    "description": "Atlas Elektronik / SAM ChartPilot text route plan."
  },
  {
    "id": "mecys_txt",
    "name": "ECDIS MECys PM3D2 (.txt)",
    "category": "🇩🇪 Raytheon Anschütz & SAM",
    "extension": ".txt",
    "mimeType": "text/plain",
    "description": "ECDIS MECys PM3D2 text waypoint route file."
  },
  {
    "id": "mecys_rtz",
    "name": "ECDIS MECys PM3D2 (.rtz)",
    "category": "🇩🇪 Raytheon Anschütz & SAM",
    "extension": ".rtz",
    "mimeType": "application/xml",
    "description": "ECDIS MECys PM3D2 standard CIRM RTZ XML format."
  },
  {
    "id": "spos_xml",
    "name": "MeteoGroup / DTN SPOS (.xml)",
    "category": "🌦️ Weather Routing & Fleet Systems",
    "extension": ".xml",
    "mimeType": "application/xml",
    "description": "MeteoGroup / DTN SPOS weather routing route exchange format."
  },
  {
    "id": "bon_voyage_bvs",
    "name": "AWT Bon Voyage System (.bvs)",
    "category": "🌦️ Weather Routing & Fleet Systems",
    "extension": ".bvs",
    "mimeType": "text/plain",
    "description": "AWT Bon Voyage System (BVS) marine weather routing file format."
  },
  {
    "id": "opengis_kml",
    "name": "Google Earth OpenGIS (.kml)",
    "category": "📊 GIS, Office & Open Formats",
    "extension": ".kml",
    "mimeType": "application/vnd.google-earth.kml+xml",
    "description": "OpenGIS KML 2.2 format for Google Earth, GIS & ECDIS track verification."
  },
  {
    "id": "bridgemate_xml",
    "name": "Marine Tech BridgeMate-DP2 (.xml)",
    "category": "📊 GIS, Office & Open Formats",
    "extension": ".xml",
    "mimeType": "application/xml",
    "description": "Marine Technologies BridgeMate DP2 XML navigation route format."
  },
  {
    "id": "admiralty_adc_txt",
    "name": "Admiralty Digital Catalogue ADC (.txt)",
    "category": "📊 GIS, Office & Open Formats",
    "extension": ".txt",
    "mimeType": "text/plain",
    "description": "UKHO Admiralty Digital Catalogue (ADC) standard waypoint route file."
  },
  {
    "id": "maxsea_wpt",
    "name": "MaxSea / TimeZero (.wpt)",
    "category": "📊 GIS, Office & Open Formats",
    "extension": ".wpt",
    "mimeType": "text/plain",
    "description": "MaxSea Marine / TimeZero WPT waypoint exchange format."
  },
  {
    "id": "totem_csv",
    "name": "TOTEM Plus ECDIS (.csv)",
    "category": "📊 GIS, Office & Open Formats",
    "extension": ".csv",
    "mimeType": "text/csv",
    "description": "Totem Plus ECDIS CSV route format."
  },
  {
    "id": "native_csv",
    "name": "Native Excel Spreadsheet (.csv)",
    "category": "📊 GIS, Office & Open Formats",
    "extension": ".csv",
    "mimeType": "text/csv",
    "description": "Structured spreadsheet format with columns for WPT, Lat, Long, Course, Distance, XTD & Speed."
  }
];

  // --- Core Universal Parser ---
  function parseAny(text, filename) {
    filename = filename || '';
    let routeName = filename.replace(/\.[^/.]+$/, '').trim() || 'NEW_ROUTE';
    let rawWpts = [];
    if (!text || typeof text !== 'string') return { routeName, waypoints: [] };
    const trimmed = text.trim();

    // 1. Check XML / RTZ / GPX / KML
    if (trimmed.includes('<') && trimmed.includes('>')) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(trimmed, 'text/xml');

        // Extract route name
        const rInfo = doc.querySelector('routeInfo, Route, route, NacosRoute, KongsbergRoute, BridgeMateRoute, spos_route, rte');
        if (rInfo) {
          const candidate = rInfo.getAttribute('routeName') || rInfo.getAttribute('name') || rInfo.getAttribute('RouteName') || rInfo.querySelector('name')?.textContent;
          if (candidate && candidate.trim()) routeName = candidate.trim();
        }

        // A. RTZ waypoints
        const rtzWpts = doc.querySelectorAll('waypoint');
        if (rtzWpts && rtzWpts.length > 0) {
          rtzWpts.forEach((wpt, idx) => {
            const pos = wpt.querySelector('position');
            if (pos) {
              const lat = parseFloat(pos.getAttribute('lat'));
              const lon = parseFloat(pos.getAttribute('lon'));
              let name = wpt.getAttribute('name') || wpt.getAttribute('id') || `WP${String(idx + 1).padStart(3, '0')}`;
              const leg = wpt.querySelector('leg');
              const portXtd = leg ? parseFloat(leg.getAttribute('portsideXTD') || '0.1') : 0.1;
              const stbdXtd = leg ? parseFloat(leg.getAttribute('starboardXTD') || '0.1') : 0.1;
              const radius = parseFloat(wpt.getAttribute('radius') || '0.5');
              if (!isNaN(lat) && !isNaN(lon)) {
                rawWpts.push({ id: name, name, lat, lon, portXtd, stbdXtd, radius });
              }
            }
          });
          if (rawWpts.length > 0) return { routeName, waypoints: recalculateRoute(rawWpts) };
        }

        // B. GPX rtept / wpt
        const gpxPts = doc.querySelectorAll('rtept, wpt, trkpt');
        if (gpxPts && gpxPts.length > 0) {
          gpxPts.forEach((pt, idx) => {
            const lat = parseFloat(pt.getAttribute('lat'));
            const lon = parseFloat(pt.getAttribute('lon'));
            const nameEl = pt.querySelector('name');
            const name = nameEl ? nameEl.textContent.trim() : `WP${String(idx + 1).padStart(3, '0')}`;
            if (!isNaN(lat) && !isNaN(lon)) {
              rawWpts.push({ id: name, name, lat, lon, portXtd: 0.1, stbdXtd: 0.1, radius: 0.5 });
            }
          });
          if (rawWpts.length > 0) return { routeName, waypoints: recalculateRoute(rawWpts) };
        }

        // C. KML coordinates / Placemark
        const kmlCoords = doc.querySelector('LineString coordinates, coordinates');
        if (kmlCoords) {
          const raw = kmlCoords.textContent.trim().split(/\s+/);
          raw.forEach((tuple, idx) => {
            const parts = tuple.split(',');
            if (parts.length >= 2) {
              const lon = parseFloat(parts[0]);
              const lat = parseFloat(parts[1]);
              if (!isNaN(lat) && !isNaN(lon)) {
                rawWpts.push({ id: `WP${String(idx + 1).padStart(3, '0')}`, lat, lon });
              }
            }
          });
          if (rawWpts.length > 0) return { routeName, waypoints: recalculateRoute(rawWpts) };
        }

        // D. Generic Waypoint tags (NACOS, BridgeMate, SPOS)
        const genWpts = doc.querySelectorAll('Waypoint, waypoint, WPT, wpt');
        if (genWpts && genWpts.length > 0) {
          genWpts.forEach((w, idx) => {
            const lat = parseFloat(w.getAttribute('lat') || w.getAttribute('Latitude') || w.getAttribute('latitude'));
            const lon = parseFloat(w.getAttribute('lon') || w.getAttribute('Longitude') || w.getAttribute('longitude'));
            const name = w.getAttribute('name') || w.getAttribute('Name') || `WP${String(idx + 1).padStart(3, '0')}`;
            if (!isNaN(lat) && !isNaN(lon)) {
              rawWpts.push({ id: name, name, lat, lon });
            }
          });
          if (rawWpts.length > 0) return { routeName, waypoints: recalculateRoute(rawWpts) };
        }
      } catch (e) {
        // Fall through to regex
      }

      // Fast XML regex fallback if DOMParser failed or produced 0 points
      const xmlPosRegex = /(?:<position|<rtept|<wpt|<Waypoint|<waypoint|<point)[^>]*?\s(?:lat|latitude|Latitude)=["']([+-]?\d+\.?\d*)["'][^>]*?\s(?:lon|longitude|Longitude)=["']([+-]?\d+\.?\d*)["']/gi;
      let mXml;
      let xId = 1;
      while ((mXml = xmlPosRegex.exec(trimmed)) !== null) {
        const lat = parseFloat(mXml[1]);
        const lon = parseFloat(mXml[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
          rawWpts.push({ id: `WP${String(xId).padStart(3, '0')}`, lat, lon });
          xId++;
        }
      }
      if (rawWpts.length > 0) return { routeName, waypoints: recalculateRoute(rawWpts) };
    }

    // 2. Check JSON (iSailor / GeoJSON)
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const obj = JSON.parse(trimmed);
        const list = Array.isArray(obj) ? obj : (obj.waypoints || obj.route?.waypoints || obj.features || []);
        if (Array.isArray(list) && list.length > 0) {
          list.forEach((item, idx) => {
            let lat, lon, name;
            if (item.geometry && item.geometry.coordinates) {
              lon = item.geometry.coordinates[0];
              lat = item.geometry.coordinates[1];
              name = item.properties?.name || item.properties?.id;
            } else {
              lat = parseFloat(item.latitude ?? item.lat ?? item.y);
              lon = parseFloat(item.longitude ?? item.lon ?? item.lng ?? item.x);
              name = item.name ?? item.id;
            }
            if (!isNaN(lat) && !isNaN(lon)) {
              rawWpts.push({ id: name || `WP${String(idx + 1).padStart(3, '0')}`, lat, lon });
            }
          });
          if (rawWpts.length > 0) return { routeName, waypoints: recalculateRoute(rawWpts) };
        }
      } catch (e) {}
    }

    // 3. Line-by-line parsing (CSV, RT3, Sperry, Furuno TXT, JRC, etc.)
    const lines = trimmed.split(/\r?\n/);
    const dmsRegex = /(\d{1,2})[°\s\-:,	]+(\d{1,2}(?:\.\d+)?)[′'\s,]*([NSns])[\s,;\t\/]+(\d{1,3})[°\s\-:,	]+(\d{1,2}(?:\.\d+)?)[′'\s,]*([EWew])/i;
    const splitDmsRegex = /(?:^|[,\t;])\s*(\d{1,2})\s*[,;\t]\s*(\d{1,2}(?:\.\d+)?)\s*[,;\t]\s*([NSns])\s*[,;\t]\s*(\d{1,3})\s*[,;\t]\s*(\d{1,2}(?:\.\d+)?)\s*[,;\t]\s*([EWew])/i;
    const nmeaRegex = /(\d{2})(\d{2}\.\d+)[,\s]*([NSns])[\s,;\t/]+(\d{2,3})(\d{2}\.\d+)[,\s]*([EWew])/;
    const decRegex = /([+-]?\d{1,3}\.\d{3,8})[\s,;\t]+([+-]?\d{1,3}\.\d{3,8})/;

    let idCounter = 1;
    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('/*')) {
        // Detect route name in comments
        const rMatch = line.match(/(?:route|name|title)\s*[:=]\s*(.+)/i);
        if (rMatch && rMatch[1]) routeName = rMatch[1].trim();
        continue;
      }

      // Check header or route name
      const nameMatch = line.match(/^(?:route|routename|name)\s*[:=]\s*(.+)/i);
      if (nameMatch && nameMatch[1]) {
        routeName = nameMatch[1].trim().replace(/^["']|["']$/g, '');
        continue;
      }

      // Skip table header lines
      if (/^(wpt|no|index|waypoint|name|lat|latitude|leg)/i.test(line) && !/\d{2}/.test(line)) continue;

      // Match DMS (unified or split columns)
      let m = line.match(dmsRegex) || line.match(splitDmsRegex);
      if (m) {
        const latDeg = parseFloat(m[1]), latMin = parseFloat(m[2]), latDir = m[3].toUpperCase();
        const lonDeg = parseFloat(m[4]), lonMin = parseFloat(m[5]), lonDir = m[6].toUpperCase();
        let lat = latDeg + latMin / 60;
        if (latDir === 'S') lat = -lat;
        let lon = lonDeg + lonMin / 60;
        if (lonDir === 'W') lon = -lon;

        let wpName = null;
        const prefix = line.match(/^["']?([A-Za-z0-9_\-\s]{1,24})["']?[\s,;\t=:]+/);
        if (prefix && isNaN(parseFloat(prefix[1]))) wpName = prefix[1].trim();

        rawWpts.push({ id: wpName || `WP${String(idCounter).padStart(3, '0')}`, lat, lon });
        idCounter++;
        continue;
      }

      // Match NMEA (e.g. 2954.83N, 12215.20E)
      m = line.match(nmeaRegex);
      if (m) {
        const latDeg = parseFloat(m[1]), latMin = parseFloat(m[2]), latDir = m[3].toUpperCase();
        const lonDeg = parseFloat(m[4]), lonMin = parseFloat(m[5]), lonDir = m[6].toUpperCase();
        let lat = latDeg + latMin / 60;
        if (latDir === 'S') lat = -lat;
        let lon = lonDeg + lonMin / 60;
        if (lonDir === 'W') lon = -lon;

        let wpName = null;
        const prefix = line.match(/^["']?([A-Za-z0-9_\-\s]{1,24})["']?[\s,;\t=:]+/);
        if (prefix && isNaN(parseFloat(prefix[1]))) wpName = prefix[1].trim();

        rawWpts.push({ id: wpName || `WP${String(idCounter).padStart(3, '0')}`, lat, lon });
        idCounter++;
        continue;
      }

      // Match Decimal
      m = line.match(decRegex);
      if (m) {
        const v1 = parseFloat(m[1]), v2 = parseFloat(m[2]);
        const lat = Math.abs(v1) <= 90 ? v1 : v2;
        const lon = Math.abs(v1) <= 90 ? v2 : v1;

        let wpName = null;
        const parts = line.split(/[,\t;=]/);
        if (parts.length >= 2 && isNaN(parseFloat(parts[0].trim()))) {
          wpName = parts[0].trim().replace(/^["']|["']$/g, '');
        }

        rawWpts.push({ id: wpName || `WP${String(idCounter).padStart(3, '0')}`, lat, lon });
        idCounter++;
        continue;
      }
    }

    return { routeName, waypoints: recalculateRoute(rawWpts) };
  }

  // --- Core Serializer to 31 Formats ---
  function exportFormat(formatId, routeName, waypoints) {
    const wpts = recalculateRoute(waypoints || []);
    const rName = (routeName || 'ROUTE_EXPORT').trim();
    const count = wpts.length;

    switch (formatId) {
      case 'furuno_3000_rtz':
      case 'mecys_rtz': {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<route xmlns="http://www.cirm.org/RTZ/1/0" version="1.0">\n`;
        xml += `  <routeInfo routeName="${rName}"/>\n`;
        xml += `  <waypoints>\n`;
        xml += `    <defaultWaypoint radius="0.50">\n`;
        xml += `      <leg geometryType="Loxodrome" portsideXTD="0.10" starboardXTD="0.10"/>\n`;
        xml += `    </defaultWaypoint>\n`;
        wpts.forEach((w, idx) => {
          xml += `    <waypoint id="${idx + 1}" name="${w.id || 'WP' + (idx + 1)}" revision="1" radius="${(w.radius || 0.5).toFixed(2)}">\n`;
          xml += `      <position lat="${w.lat.toFixed(8)}" lon="${w.lon.toFixed(8)}"/>\n`;
          xml += `      <leg geometryType="Loxodrome" portsideXTD="${(w.portXtd || 0.1).toFixed(2)}" starboardXTD="${(w.stbdXtd || 0.1).toFixed(2)}"/>\n`;
          xml += `    </waypoint>\n`;
        });
        xml += `  </waypoints>\n`;
        xml += `</route>\n`;
        return xml;
      }

      case 'furuno_fea_fmd_txt': {
        let out = `// FURUNO ECDIS FEA/FMD ROUTE FILE\n`;
        out += `ROUTE NAME: ${rName}\n`;
        out += `TOTAL WPT: ${count}\n`;
        out += `WP NO, NAME, LATITUDE, LONGITUDE, LEG TYPE, RADIUS, PORT XTD, STBD XTD, PLAN SPEED\n`;
        wpts.forEach((w, idx) => {
          out += `${idx + 1}, ${w.id}, ${formatDMS(w.lat, true, 'furuno_txt')}, ${formatDMS(w.lon, false, 'furuno_txt')}, RL, ${(w.radius || 0.5).toFixed(2)}, ${(w.portXtd || 0.1).toFixed(2)}, ${(w.stbdXtd || 0.1).toFixed(2)}, ${(w.speed || 12.0).toFixed(1)}\n`;
        });
        return out;
      }

      case 'furuno_gpx': {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<gpx version="1.1" creator="FURUNO GP-170" xmlns="http://www.topografix.com/GPX/1/1">\n`;
        xml += `  <rte>\n`;
        xml += `    <name>${rName}</name>\n`;
        wpts.forEach((w) => {
          xml += `    <rtept lat="${w.lat.toFixed(8)}" lon="${w.lon.toFixed(8)}">\n`;
          xml += `      <name>${w.id}</name>\n`;
          xml += `      <extensions>\n`;
          xml += `        <radius>${(w.radius || 0.5).toFixed(2)}</radius>\n`;
          xml += `        <portsideXTD>${(w.portXtd || 0.1).toFixed(2)}</portsideXTD>\n`;
          xml += `        <starboardXTD>${(w.stbdXtd || 0.1).toFixed(2)}</starboardXTD>\n`;
          xml += `      </extensions>\n`;
          xml += `    </rtept>\n`;
        });
        xml += `  </rte>\n`;
        xml += `</gpx>\n`;
        return xml;
      }

      case 'native_csv': {
        let csv = `WPT_NO,NAME,LATITUDE,LONGITUDE,LAT_DMS,LON_DMS,COURSE,DISTANCE,SPEED,PORT_XTD,STBD_XTD,REMARKS\n`;
        wpts.forEach((w, idx) => {
          csv += `${idx + 1},"${w.id}",${w.lat.toFixed(6)},${w.lon.toFixed(6)},"${formatDMS(w.lat, true)}","${formatDMS(w.lon, false)}",${(w.course || 0).toFixed(1)},${(w.dist || 0).toFixed(2)},${(w.speed || 12).toFixed(1)},${(w.portXtd || 0.1).toFixed(2)},${(w.stbdXtd || 0.1).toFixed(2)},"${w.remarks || ''}"\n`;
        });
        return csv;
      }

      case 'transas_rt3': {
        let out = `[Route]\nName=${rName}\nTotalWaypoints=${count}\n\n[Waypoints]\n`;
        wpts.forEach((w, idx) => {
          out += `WP${idx + 1}=${w.id},${formatDMS(w.lat, true, 'nmea')},${formatDMS(w.lon, false, 'nmea')},${(w.portXtd || 0.1).toFixed(2)},${(w.stbdXtd || 0.1).toFixed(2)},${(w.radius || 0.5).toFixed(2)},${(w.speed || 12).toFixed(1)},Rhumbline\n`;
        });
        return out;
      }

      case 'transas_rt4': {
        const payload = {
          route: {
            name: rName,
            totalWaypoints: count,
            waypoints: wpts.map((w, idx) => ({
              index: idx + 1,
              name: w.id,
              latitude: w.lat,
              longitude: w.lon,
              radius: w.radius || 0.5,
              xtdPort: w.portXtd || 0.1,
              xtdStarboard: w.stbdXtd || 0.1,
              speed: w.speed || 12.0
            }))
          }
        };
        return JSON.stringify(payload, null, 2);
      }

      case 'wartsila_nacos': {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<NacosPlatinumRoute version="1.0" name="${rName}">\n`;
        xml += `  <Waypoints>\n`;
        wpts.forEach((w, idx) => {
          xml += `    <Waypoint index="${idx + 1}" name="${w.id}" latitude="${w.lat.toFixed(8)}" longitude="${w.lon.toFixed(8)}" radius="${(w.radius || 0.5).toFixed(2)}" xtePort="${(w.portXtd || 0.1).toFixed(2)}" xteStarboard="${(w.stbdXtd || 0.1).toFixed(2)}" speed="${(w.speed || 12).toFixed(1)}"/>\n`;
        });
        xml += `  </Waypoints>\n`;
        xml += `</NacosPlatinumRoute>\n`;
        return xml;
      }

      case 'eglobe_rte': {
        let out = `// eGlobe ECDIS Route (.rte)\n`;
        out += `[EGLOBE_ROUTE]\nNAME=${rName}\nCOUNT=${count}\n`;
        wpts.forEach((w, idx) => {
          out += `${idx + 1},${w.id},${w.lat.toFixed(6)},${w.lon.toFixed(6)},${(w.radius || 0.5).toFixed(2)},${(w.portXtd || 0.1).toFixed(2)},${(w.stbdXtd || 0.1).toFixed(2)},${(w.speed || 12).toFixed(1)}\n`;
        });
        return out;
      }

      case 'eglobe_cb': {
        let out = `// eGlobe ChartWorld ECDIS Route (.cb)\n`;
        out += `ROUTE=${rName}\n`;
        wpts.forEach((w, idx) => {
          out += `WP${idx + 1}: ${w.id}, ${formatDMS(w.lat, true)}, ${formatDMS(w.lon, false)}, RAD=${(w.radius || 0.5).toFixed(2)}, XTD_P=${(w.portXtd || 0.1).toFixed(2)}, XTD_S=${(w.stbdXtd || 0.1).toFixed(2)}\n`;
        });
        return out;
      }

      case 'jrc_csv':
      case 'chartco_csv': {
        let out = `// JRC ECDIS Route File\n`;
        out += `// Route Name: ${rName}\n`;
        out += `No.,Name,Latitude,Longitude,Leg type,Turn radius,Port XTD,Starboard XTD,Plan speed\n`;
        wpts.forEach((w, idx) => {
          out += `${idx + 1},${w.id},${formatDMS(w.lat, true)},${formatDMS(w.lon, false)},RL,${(w.radius || 0.5).toFixed(2)},${(w.portXtd || 0.1).toFixed(2)},${(w.stbdXtd || 0.1).toFixed(2)},${(w.speed || 12).toFixed(1)}\n`;
        });
        return out;
      }

      case 'jrc_rtm':
      case 'jrc_rtn':
      case 'jrc_rta':
      case 'jrc_jmr': {
        let out = `// JRC ECDIS / RADAR ROUTE FILE (${formatId.toUpperCase()})\n`;
        out += `// ROUTE_NAME: ${rName}\n`;
        out += `INDEX,NAME,LAT,LON,COURSE,DIST,XTD_P,XTD_S\n`;
        wpts.forEach((w, idx) => {
          out += `${idx + 1},${w.id},${formatDMS(w.lat, true, 'adc')},${formatDMS(w.lon, false, 'adc')},${(w.course || 0).toFixed(1)},${(w.dist || 0).toFixed(2)},${(w.portXtd || 0.1).toFixed(2)},${(w.stbdXtd || 0.1).toFixed(2)}\n`;
        });
        return out;
      }

      case 'kongsberg_rut': {
        let out = `// KONGSBERG K-BRIDGE ROUTE FILE (.rut)\n`;
        out += `NAME: ${rName}\n`;
        out += `WPT, NAME, LAT, LON, RAD, XTD_P, XTD_S, SPD, ROT\n`;
        wpts.forEach((w, idx) => {
          out += `${idx + 1}, ${w.id}, ${w.lat.toFixed(6)}, ${w.lon.toFixed(6)}, ${(w.radius || 0.5).toFixed(2)}, ${(w.portXtd || 0.1).toFixed(2)}, ${(w.stbdXtd || 0.1).toFixed(2)}, ${(w.speed || 12).toFixed(1)}, 15.0\n`;
        });
        return out;
      }

      case 'kongsberg_rux': {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<KongsbergRoute version="1.0" name="${rName}">\n`;
        xml += `  <Waypoints>\n`;
        wpts.forEach((w, idx) => {
          xml += `    <Waypoint id="${idx + 1}" name="${w.id}" lat="${w.lat.toFixed(8)}" lon="${w.lon.toFixed(8)}" radius="${(w.radius || 0.5).toFixed(2)}" portXtd="${(w.portXtd || 0.1).toFixed(2)}" stbdXtd="${(w.stbdXtd || 0.1).toFixed(2)}"/>\n`;
        });
        xml += `  </Waypoints>\n`;
        xml += `</KongsbergRoute>\n`;
        return xml;
      }

      case 'mecys_txt': {
        let out = `// ECDIS MECys PM3D2 Route (.txt)\n`;
        out += `ROUTE: ${rName}\n`;
        out += `WPT, LAT, LON, PORT_XTD, STBD_XTD, RADIUS, SPEED\n`;
        wpts.forEach((w, idx) => {
          out += `${idx + 1}, ${w.lat.toFixed(6)}, ${w.lon.toFixed(6)}, ${(w.portXtd || 0.1).toFixed(2)}, ${(w.stbdXtd || 0.1).toFixed(2)}, ${(w.radius || 0.5).toFixed(2)}, ${(w.speed || 12).toFixed(1)}\n`;
        });
        return out;
      }

      case 'maxsea_wpt': {
        let out = `// MaxSea / TimeZero Route Export\n`;
        wpts.forEach((w) => {
          out += `$MXWPT,${w.id},${w.lat.toFixed(6)},${w.lat >= 0 ? 'N' : 'S'},${w.lon.toFixed(6)},${w.lon >= 0 ? 'E' : 'W'},${(w.radius || 0.5).toFixed(2)},${(w.portXtd || 0.1).toFixed(2)},${(w.stbdXtd || 0.1).toFixed(2)}\n`;
        });
        return out;
      }

      case 'raytheon_cvt': {
        let out = `// RAYTHEON ANSCHUTZ SYNAPSIS ROUTE FILE (.cvt)\n`;
        out += `ROUTE: ${rName}\n`;
        out += `COUNT: ${count}\n`;
        wpts.forEach((w, idx) => {
          out += `WP${idx + 1}: ${w.id}, ${w.lat.toFixed(6)}, ${w.lon.toFixed(6)}, ${formatDMS(w.lat, true)}, ${formatDMS(w.lon, false)}, ${(w.radius || 0.5).toFixed(2)}, ${(w.portXtd || 0.1).toFixed(2)}\n`;
        });
        return out;
      }

      case 'sperry_route': {
        let out = `[ROUTE_INFO]\nRouteName=${rName}\nTotalWpt=${count}\n\n[WAYPOINT_LIST]\n`;
        wpts.forEach((w, idx) => {
          out += `WP${idx + 1}=${w.id},${w.lat.toFixed(6)},${w.lon.toFixed(6)},${(w.radius || 0.5).toFixed(2)},${(w.portXtd || 0.1).toFixed(2)},${(w.stbdXtd || 0.1).toFixed(2)},${(w.speed || 12).toFixed(1)}\n`;
        });
        return out;
      }

      case 'simrad_rtx':
      case 'simrad_no_ext': {
        let out = `SIMRAD MARIS ECDIS900 ROUTE FILE\n`;
        out += `ROUTE NAME: ${rName}\n`;
        out += `TOTAL WPT: ${count}\n`;
        out += `WPT, NAME, LAT, LON, PORT_XTD, STBD_XTD, RADIUS\n`;
        wpts.forEach((w, idx) => {
          out += `${idx + 1}, ${w.id}, ${formatDMS(w.lat, true)}, ${formatDMS(w.lon, false)}, ${(w.portXtd || 0.1).toFixed(2)}, ${(w.stbdXtd || 0.1).toFixed(2)}, ${(w.radius || 0.5).toFixed(2)}\n`;
        });
        return out;
      }

      case 'sam_no_ext':
      case 'chart_pilot_txt': {
        let out = `// SAM ELECTRONICS / CHART PILOT ROUTE FILE\n`;
        out += `ROUTE: ${rName}\n`;
        out += `NO, NAME, LAT, LON, LEG_CRS, LEG_DIST, SPEED\n`;
        wpts.forEach((w, idx) => {
          out += `${idx + 1}, ${w.id}, ${w.lat.toFixed(6)}, ${w.lon.toFixed(6)}, ${(w.course || 0).toFixed(1)}, ${(w.dist || 0).toFixed(2)}, ${(w.speed || 12).toFixed(1)}\n`;
        });
        return out;
      }

      case 'totem_csv': {
        let out = `Waypoint,Name,Latitude,Longitude,XTE_Port,XTE_Stbd,Turn_Radius,Speed\n`;
        wpts.forEach((w, idx) => {
          out += `${idx + 1},"${w.id}",${w.lat.toFixed(6)},${w.lon.toFixed(6)},${(w.portXtd || 0.1).toFixed(2)},${(w.stbdXtd || 0.1).toFixed(2)},${(w.radius || 0.5).toFixed(2)},${(w.speed || 12).toFixed(1)}\n`;
        });
        return out;
      }

      case 'bridgemate_xml': {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<BridgeMateRoute name="${rName}">\n`;
        xml += `  <Waypoints>\n`;
        wpts.forEach((w, idx) => {
          xml += `    <WPT no="${idx + 1}" name="${w.id}" lat="${w.lat.toFixed(8)}" lon="${w.lon.toFixed(8)}" radius="${(w.radius || 0.5).toFixed(2)}"/>\n`;
        });
        xml += `  </Waypoints>\n`;
        xml += `</BridgeMateRoute>\n`;
        return xml;
      }

      case 'spos_xml': {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<spos_route name="${rName}">\n`;
        wpts.forEach((w) => {
          xml += `  <waypoint name="${w.id}" lat="${w.lat.toFixed(6)}" lon="${w.lon.toFixed(6)}" speed="${(w.speed || 12).toFixed(1)}"/>\n`;
        });
        xml += `</spos_route>\n`;
        return xml;
      }

      case 'bon_voyage_bvs': {
        let out = `BON VOYAGE SYSTEM (BVS) ROUTE FILE\n`;
        out += `ROUTE: ${rName}\n`;
        out += `WP, NAME, LAT, LON, SPEED, COURSE, DIST\n`;
        wpts.forEach((w, idx) => {
          out += `${idx + 1}, ${w.id}, ${formatDMS(w.lat, true)}, ${formatDMS(w.lon, false)}, ${(w.speed || 12).toFixed(1)}, ${(w.course || 0).toFixed(1)}, ${(w.dist || 0).toFixed(2)}\n`;
        });
        return out;
      }

      case 'admiralty_adc_txt': {
        let out = `Admiralty Digital Catalogue Route\n`;
        out += `Route: ${rName}\n`;
        wpts.forEach((w) => {
          out += `${w.id} ${formatDMS(w.lat, true, 'adc')} ${formatDMS(w.lon, false, 'adc')}\n`;
        });
        return out;
      }

      case 'opengis_kml': {
        let coordsStr = wpts.map(w => `${w.lon.toFixed(6)},${w.lat.toFixed(6)},0`).join(' ');
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<kml xmlns="http://www.opengis.net/kml/2.2">\n`;
        xml += `  <Document>\n`;
        xml += `    <name>${rName}</name>\n`;
        wpts.forEach((w, idx) => {
          xml += `    <Placemark>\n`;
          xml += `      <name>${w.id || 'WP' + (idx + 1)}</name>\n`;
          xml += `      <Point><coordinates>${w.lon.toFixed(6)},${w.lat.toFixed(6)},0</coordinates></Point>\n`;
          xml += `    </Placemark>\n`;
        });
        xml += `    <Placemark>\n`;
        xml += `      <name>${rName} Track</name>\n`;
        xml += `      <LineString><coordinates>${coordsStr}</coordinates></LineString>\n`;
        xml += `    </Placemark>\n`;
        xml += `  </Document>\n`;
        xml += `</kml>\n`;
        return xml;
      }

      default:
        // Default to CSV
        return exportFormat('native_csv', rName, wpts);
    }
  }

  // Export to global object
  global.RouteConverter = {
    FORMATS,
    parseAny,
    exportFormat,
    recalculateRoute,
    formatDMS,
    rhumblineDistance,
    rhumblineBearing
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.RouteConverter;
    module.exports.RouteConverter = global.RouteConverter;
  }

})(typeof window !== 'undefined' ? window : this);
