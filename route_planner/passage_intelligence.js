/**
 * Maritime Passage Intelligence Engine
 * Comprehensive spatial analysis of route tracks against:
 * 1. WWNWS NAVAREA GeoJSON
 * 2. PortToPort Marine Zones (ECA, War Risk, Piracy, Marpol, Loadline, TSS, ASL, PSSA, ATBA, SRS)
 * 3. Admiralty Publications (Sailing Directions Pilots, List of Lights, ALRS, Tide Tables)
 * 4. Admiralty Ports & Harbours database (UN/LOCODE, Timezone)
 * 5. Dynamic Squat & UKC Mathematical Engine
 */

(function (global) {
  'use strict';

  // --- Internal Math & Format Helpers (Self-contained) ---
  function toRad(deg) { return (deg * Math.PI) / 180; }
  function toDeg(rad) { return (rad * 180) / Math.PI; }

  function internalRhumblineDistance(lat1, lon1, lat2, lon2) {
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

  function internalFormatDMS(val, isLat) {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    const degStr = isLat ? String(deg).padStart(2, '0') : String(deg).padStart(3, '0');
    const minStr = min.toFixed(2).padStart(5, '0');
    return `${degStr}°${minStr}'${dir}`;
  }

  // --- Geometry Helpers (Ray-Casting Point-in-Polygon & Line Intersect) ---
  function pointInPoly(pt, ring) {
    const x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInGeometry(pt, geom) {
    if (!geom || !geom.coordinates) return false;
    if (geom.type === 'Polygon') {
      return pointInPoly(pt, geom.coordinates[0]);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        if (pointInPoly(pt, poly[0])) return true;
      }
    }
    return false;
  }

  function lineIntersects(p1, p2, p3, p4) {
    const ccw = (A, B, C) => (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
    return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
  }

  function segmentIntersectsRing(p1, p2, ring) {
    if (pointInPoly(p1, ring) || pointInPoly(p2, ring)) return true;
    for (let i = 0; i < ring.length - 1; i++) {
      if (lineIntersects(p1, p2, ring[i], ring[i + 1])) return true;
    }
    return false;
  }

  function segmentIntersectsGeometry(p1, p2, geom) {
    if (!geom || !geom.coordinates) return false;
    if (geom.type === 'Polygon') {
      return segmentIntersectsRing(p1, p2, geom.coordinates[0]);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        if (segmentIntersectsRing(p1, p2, poly[0])) return true;
      }
    }
    return false;
  }

  function segmentIntersectsBbox(p1, p2, bbox) {
    if (!bbox || bbox.length < 4) return true;
    const [bMinX, bMinY, bMaxX, bMaxY] = bbox;
    const sMinX = Math.min(p1[0], p2[0]), sMaxX = Math.max(p1[0], p2[0]);
    const sMinY = Math.min(p1[1], p2[1]), sMaxY = Math.max(p1[1], p2[1]);
    if (sMaxX < bMinX || sMinX > bMaxX || sMaxY < bMinY || sMinY > bMaxY) return false;
    return true;
  }

  // --- Navarea Analyzer ---
  function scanNavareas(route) {
    if (!route || route.length === 0) return [];
    const navGeo = global.NAVAREA_GEOJSON;
    if (!navGeo || !navGeo.features) return [];

    const ordered = [];
    const seen = new Set();

    for (let i = 0; i < route.length; i++) {
      const pt = [route[i].lon, route[i].lat];
      for (const f of navGeo.features) {
        const code = (f.properties?.code || 'NAVAREA ' + (f.properties?.number || f.id)).replace(/^NAVAREA[\s\-_]*/i, 'NAVAREA ');
        if (!seen.has(code) && pointInGeometry(pt, f.geometry)) {
          seen.add(code);
          ordered.push({
            code: code,
            name: f.properties?.name || code,
            country: f.properties?.coordinator || f.properties?.country || ''
          });
        }
      }

      if (i < route.length - 1) {
        const p1 = [route[i].lon, route[i].lat];
        const p2 = [route[i + 1].lon, route[i + 1].lat];
        for (const f of navGeo.features) {
          const code = (f.properties?.code || 'NAVAREA ' + (f.properties?.number || f.id)).replace(/^NAVAREA[\s\-_]*/i, 'NAVAREA ');
          if (!seen.has(code) && segmentIntersectsGeometry(p1, p2, f.geometry)) {
            seen.add(code);
            ordered.push({
              code: code,
              name: f.properties?.name || code,
              country: f.properties?.coordinator || f.properties?.country || ''
            });
          }
        }
      }
    }

    return ordered;
  }

  // --- PortToPort Marine Zones Analyzer ---
  function scanPortToPortZones(route) {
    const res = {
      ecaDistance: 0,
      ecaActiveIndices: new Set(),
      ecaZonesTraversed: [],
      warDistance: 0,
      warActiveIndices: new Set(),
      warZonesTraversed: [],
      piracyDistance: 0,
      piracyActiveIndices: new Set(),
      piracyZonesTraversed: [],
      marpolZones: [],
      loadlineZones: [],
      tssSchemes: [],
      archipelagicLanes: [],
      avoidedAreas: [],
      pssaAreas: [],
      sraAreas: []
    };

    if (!route || route.length < 2) return res;
    const p2pData = global.PORT_TO_PORT_DATA;
    if (!p2pData || !p2pData.features) return res;

    // Filter features into categorized buckets
    const categories = {};
    for (const f of p2pData.features) {
      const cat = f.properties?.category || 'Other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(f);
    }

    const ecaList = (categories['Marpol Zones'] || []).filter(f => /ECA|Emission|SOx|NOx/i.test(f.properties?.name || ''));
    // If empty, take all Marpol zones for ECA check
    const ecaCandidates = ecaList.length > 0 ? ecaList : (categories['Marpol Zones'] || []);
    const warList = categories['JWC War Areas'] || [];
    const piracyList = categories['Piracy Zones'] || [];
    const marpolList = categories['Marpol Zones'] || [];
    const loadlineList = categories['Loadline Zones'] || [];
    const tssList = categories['Traffic Schemes'] || [];
    const aslList = categories['Archipelagic Lanes'] || [];
    const atbaList = categories['Areas to be Avoided'] || [];
    const pssaList = categories['Particularly Sensitive Sea Areas'] || [];
    const sraList = categories['Ship Reporting Areas'] || [];

    // Subsegment interpolation (15 sample points per leg)
    const SAMPLES = 15;
    const seenEca = new Set(), seenWar = new Set(), seenPiracy = new Set();
    const seenMarpol = new Set(), seenLoad = new Set(), seenTss = new Set();
    const seenAsl = new Set(), seenAtba = new Set(), seenPssa = new Set(), seenSra = new Set();
    const seenWaters = new Set();

    const MARITIME_SEAS = [
      { name: 'East China Sea', minLat: 24.5, maxLat: 33.5, minLon: 119.5, maxLon: 129.0 },
      { name: 'Taiwan Strait', minLat: 22.0, maxLat: 26.0, minLon: 118.0, maxLon: 121.5 },
      { name: 'Luzon Strait', minLat: 19.0, maxLat: 22.0, minLon: 120.0, maxLon: 123.0 },
      { name: 'Philippine Sea', minLat: 5.0, maxLat: 25.0, minLon: 122.0, maxLon: 142.0 },
      { name: 'South China Sea', minLat: 0.0, maxLat: 23.0, minLon: 105.0, maxLon: 121.0 },
      { name: 'Bismarck Sea', minLat: -5.5, maxLat: -1.0, minLon: 143.0, maxLon: 152.0 },
      { name: 'Solomon Sea', minLat: -10.5, maxLat: -4.5, minLon: 148.0, maxLon: 158.0 },
      { name: 'Gulf of Papua', minLat: -11.5, maxLat: -8.0, minLon: 143.0, maxLon: 148.5 },
      { name: 'Coral Sea', minLat: -25.0, maxLat: -10.0, minLon: 145.0, maxLon: 160.0 },
      { name: 'Java Sea', minLat: -7.5, maxLat: -3.0, minLon: 106.0, maxLon: 116.5 },
      { name: 'Banda Sea', minLat: -7.0, maxLat: -3.0, minLon: 125.0, maxLon: 132.5 },
      { name: 'Timor Sea', minLat: -13.0, maxLat: -8.0, minLon: 123.0, maxLon: 132.0 },
      { name: 'Arafura Sea', minLat: -11.5, maxLat: -7.5, minLon: 132.0, maxLon: 141.0 },
      { name: 'Strait of Malacca', minLat: 1.0, maxLat: 6.0, minLon: 98.0, maxLon: 104.0 },
      { name: 'Singapore Strait', minLat: 1.1, maxLat: 1.45, minLon: 103.5, maxLon: 104.5 },
      { name: 'Sunda Strait', minLat: -6.4, maxLat: -5.6, minLon: 105.3, maxLon: 106.2 },
      { name: 'Lombok Strait', minLat: -8.9, maxLat: -8.2, minLon: 115.5, maxLon: 116.3 },
      { name: 'Makassar Strait', minLat: -4.5, maxLat: 1.5, minLon: 116.5, maxLon: 120.0 },
      { name: 'Yellow Sea / Bohai Sea', minLat: 34.0, maxLat: 40.5, minLon: 118.0, maxLon: 126.5 },
      { name: 'Sea of Japan / East Sea', minLat: 35.0, maxLat: 47.0, minLon: 128.0, maxLon: 142.0 },
      { name: 'Bay of Bengal', minLat: 5.0, maxLat: 22.0, minLon: 80.0, maxLon: 95.0 },
      { name: 'Arabian Sea', minLat: 10.0, maxLat: 25.0, minLon: 55.0, maxLon: 75.0 },
      { name: 'Red Sea', minLat: 12.0, maxLat: 28.0, minLon: 32.0, maxLon: 44.0 },
      { name: 'Gulf of Aden', minLat: 11.0, maxLat: 15.0, minLon: 43.0, maxLon: 52.0 },
      { name: 'North Sea', minLat: 51.0, maxLat: 61.0, minLon: -3.0, maxLon: 9.0 },
      { name: 'Baltic Sea', minLat: 54.0, maxLat: 65.0, minLon: 10.0, maxLon: 30.0 },
      { name: 'English Channel', minLat: 49.0, maxLat: 51.5, minLon: -5.5, maxLon: 2.0 },
      { name: 'Mediterranean Sea', minLat: 30.0, maxLat: 45.0, minLon: -6.0, maxLon: 36.0 }
    ];

    for (let i = 0; i < route.length - 1; i++) {
      const p1 = route[i];
      const p2 = route[i + 1];
      const legDist = p1.dist || 0;
      if (legDist <= 0) continue;

      let inEcaCount = 0, lastEcaName = '';
      let inWarCount = 0, lastWarName = '';
      let inPirCount = 0, lastPirName = '';

      for (let s = 0; s <= SAMPLES; s++) {
        const frac = s / SAMPLES;
        const curLon = p1.lon + (p2.lon - p1.lon) * frac;
        const curLat = p1.lat + (p2.lat - p1.lat) * frac;
        const pt = [curLon, curLat];

        // ECA Check
        for (const e of ecaCandidates) {
          if (pointInGeometry(pt, e.geometry)) {
            inEcaCount++;
            lastEcaName = e.properties?.name || 'ECA Zone';
            seenEca.add(lastEcaName);
            break;
          }
        }

        // War Check
        for (const w of warList) {
          if (pointInGeometry(pt, w.geometry)) {
            inWarCount++;
            lastWarName = w.properties?.name || 'JWC War Area';
            seenWar.add(lastWarName);
            break;
          }
        }

        // Piracy Check
        for (const p of piracyList) {
          if (pointInGeometry(pt, p.geometry)) {
            inPirCount++;
            lastPirName = p.properties?.name || 'Piracy Risk Zone';
            seenPiracy.add(lastPirName);
            break;
          }
        }

        // MARPOL General Check
        for (const m of marpolList) {
          if (pointInGeometry(pt, m.geometry)) {
            seenMarpol.add(m.properties?.name);
            break;
          }
        }

        // Loadline Check
        for (const l of loadlineList) {
          if (pointInGeometry(pt, l.geometry)) {
            seenLoad.add(l.properties?.name);
            break;
          }
        }

        // TSS Check
        for (const t of tssList) {
          if (pointInGeometry(pt, t.geometry)) {
            seenTss.add(t.properties?.name);
            break;
          }
        }

        // ASL Check
        for (const a of aslList) {
          if (pointInGeometry(pt, a.geometry)) {
            seenAsl.add(a.properties?.name);
            break;
          }
        }

        // ATBA Check
        for (const at of atbaList) {
          if (pointInGeometry(pt, at.geometry)) {
            seenAtba.add(at.properties?.name);
            break;
          }
        }

        // PSSA Check
        for (const ps of pssaList) {
          if (pointInGeometry(pt, ps.geometry)) {
            seenPssa.add(ps.properties?.name);
            break;
          }
        }

        // SRA / VTS Check
        for (const sr of sraList) {
          if (pointInGeometry(pt, sr.geometry)) {
            seenSra.add(sr.properties?.name);
            break;
          }
        }

        // Regional Seas & Straits Check
        for (const sea of MARITIME_SEAS) {
          if (curLat >= sea.minLat && curLat <= sea.maxLat && curLon >= sea.minLon && curLon <= sea.maxLon) {
            seenWaters.add(sea.name);
          }
        }
      }

      // Aggregate distances
      if (inEcaCount > 0) {
        const ecaNM = (inEcaCount / (SAMPLES + 1)) * legDist;
        res.ecaDistance += ecaNM;
        res.ecaActiveIndices.add(i);
        if (inEcaCount > SAMPLES / 2) res.ecaActiveIndices.add(i + 1);
      }

      if (inWarCount > 0) {
        const warNM = (inWarCount / (SAMPLES + 1)) * legDist;
        res.warDistance += warNM;
        res.warActiveIndices.add(i);
        if (inWarCount > SAMPLES / 2) res.warActiveIndices.add(i + 1);
      }

      if (inPirCount > 0) {
        const pirNM = (inPirCount / (SAMPLES + 1)) * legDist;
        res.piracyDistance += pirNM;
        res.piracyActiveIndices.add(i);
        if (inPirCount > SAMPLES / 2) res.piracyActiveIndices.add(i + 1);
      }
    }

    res.ecaZonesTraversed = Array.from(seenEca);
    res.warZonesTraversed = Array.from(seenWar);
    res.piracyZonesTraversed = Array.from(seenPiracy);
    res.marpolZones = Array.from(seenMarpol);
    res.loadlineZones = Array.from(seenLoad);
    res.tssSchemes = Array.from(seenTss);
    res.archipelagicLanes = Array.from(seenAsl);
    res.avoidedAreas = Array.from(seenAtba);
    res.pssaAreas = Array.from(seenPssa);
    res.sraAreas = Array.from(seenSra);
    res.maritimeWaters = Array.from(seenWaters);

    return res;
  }

  // --- Admiralty Publications Analyzer ---
  function scanAdmiraltyPublications(route) {
    const res = {
      sailingDirections: [],
      listOfLights: [],
      radioSignals: [],
      tideTables: [],
      nearestDeparturePort: null,
      nearestArrivalPort: null
    };

    if (!route || route.length < 2) return res;
    const pubs = global.ADMIRALTY_PUBLICATIONS;
    if (!pubs) return res;

    // 1. Sailing Directions (Pilots: NP1 to NP72)
    const seenSd = new Set();
    if (pubs.sds && Array.isArray(pubs.sds)) {
      for (const sd of pubs.sds) {
        const bbox = sd.properties?.bbox;
        const geom = sd.geometry;
        for (let i = 0; i < route.length - 1; i++) {
          const p1 = [route[i].lon, route[i].lat];
          const p2 = [route[i + 1].lon, route[i + 1].lat];
          if (segmentIntersectsBbox(p1, p2, bbox)) {
            if (geom && !segmentIntersectsGeometry(p1, p2, geom)) continue;
            const code = sd.properties?.code || sd.properties?.name;
            const title = sd.properties?.title || sd.properties?.description || code;
            if (code && !seenSd.has(code)) {
              seenSd.add(code);
              res.sailingDirections.push({ code, title, feature: sd });
            }
            break;
          }
        }
      }
    }
    res.sailingDirections.sort((a, b) => {
      const numA = parseInt(a.code.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.code.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    // 2. List of Lights (ALL Volumes A - P/Q)
    const seenLights = new Set();
    if (pubs.lights && Array.isArray(pubs.lights)) {
      for (const lt of pubs.lights) {
        const bbox = lt.properties?.bbox;
        const geom = lt.geometry;
        for (let i = 0; i < route.length - 1; i++) {
          const p1 = [route[i].lon, route[i].lat];
          const p2 = [route[i + 1].lon, route[i + 1].lat];
          if (segmentIntersectsBbox(p1, p2, bbox)) {
            if (geom && !segmentIntersectsGeometry(p1, p2, geom)) continue;
            const name = lt.properties?.name || lt.properties?.title || 'List of Lights';
            const code = lt.properties?.code || lt.properties?.letter || name;
            if (!seenLights.has(code)) {
              seenLights.add(code);
              res.listOfLights.push({ code, name, feature: lt });
            }
            break;
          }
        }
      }
    }

    // 3. Radio Signals (ALRS NP281 - NP286)
    const seenAlrs = new Set();
    if (pubs.alrs && Array.isArray(pubs.alrs)) {
      for (const al of pubs.alrs) {
        const bbox = al.properties?.bbox;
        const geom = al.geometry;
        for (let i = 0; i < route.length - 1; i++) {
          const p1 = [route[i].lon, route[i].lat];
          const p2 = [route[i + 1].lon, route[i + 1].lat];
          if (segmentIntersectsBbox(p1, p2, bbox)) {
            if (geom && !segmentIntersectsGeometry(p1, p2, geom)) continue;
            const code = al.properties?.code || al.properties?.name;
            const title = al.properties?.title || al.properties?.description || code;
            if (code && !seenAlrs.has(code)) {
              seenAlrs.add(code);
              res.radioSignals.push({ code, title });
            }
            break;
          }
        }
      }
    }

    // 4. Tide Tables (ATT NP201 - NP208)
    const seenAtt = new Set();
    if (pubs.att && Array.isArray(pubs.att)) {
      for (const att of pubs.att) {
        const bbox = att.properties?.bbox;
        const geom = att.geometry;
        for (let i = 0; i < route.length - 1; i++) {
          const p1 = [route[i].lon, route[i].lat];
          const p2 = [route[i + 1].lon, route[i + 1].lat];
          if (segmentIntersectsBbox(p1, p2, bbox)) {
            if (geom && !segmentIntersectsGeometry(p1, p2, geom)) continue;
            const code = att.properties?.code || att.properties?.name;
            const title = att.properties?.title || att.properties?.description || code;
            if (code && !seenAtt.has(code)) {
              seenAtt.add(code);
              res.tideTables.push({ code, title, feature: att });
            }
            break;
          }
        }
      }
    }

    // 5. Port proximity matching
    if (pubs.ports && Array.isArray(pubs.ports) && pubs.ports.length > 0) {
      const pStart = route[0];
      const pEnd = route[route.length - 1];

      let bestDep = null, minDepDist = Infinity;
      let bestArr = null, minArrDist = Infinity;

      for (const pt of pubs.ports) {
        const d1 = internalRhumblineDistance(pStart.lat, pStart.lon, pt.lat, pt.lon);
        if (d1 < minDepDist) {
          minDepDist = d1;
          bestDep = { ...pt, distanceNM: d1 };
        }
        const d2 = internalRhumblineDistance(pEnd.lat, pEnd.lon, pt.lat, pt.lon);
        if (d2 < minArrDist) {
          minArrDist = d2;
          bestArr = { ...pt, distanceNM: d2 };
        }
      }

      res.nearestDeparturePort = bestDep;
      res.nearestArrivalPort = bestArr;
    }

    return res;
  }

  // --- Dynamic Squat & UKC Calculator ---
  function calculateSquatAndUkc(vessel, route, options) {
    options = options || {};
    const L = parseFloat(vessel.length || 137.8);
    const B = parseFloat(vessel.beam || 22.0);
    const df = parseFloat(vessel.draftFwd || 7.2);
    const da = parseFloat(vessel.draftAft || 7.8);
    const maxDraft = Math.max(df, da);
    const speed = parseFloat(vessel.speed || 12.0);
    const vol = parseFloat(vessel.volume || 19855);

    // Block Coefficient Cb = Vol / (L * B * MaxDraft)
    const Cb = (L > 0 && B > 0 && maxDraft > 0) ? Math.min(0.95, Math.max(0.40, vol / (L * B * maxDraft))) : 0.82;

    // Squat formulas:
    // Shallow / Confined water: Squat = Cb * (V^2 / 50) = 2 * Cb * (V^2 / 100)
    // Open sea: Squat = Cb * (V^2 / 100)
    const squatShallow = Cb * ((speed * speed) / 50);
    const squatOpenSea = Cb * ((speed * speed) / 100);

    const squatMode = options.squatCriteria || 'auto'; // 'auto', 'shallow', 'opensea'
    const chartedDepth = parseFloat(options.chartedDepth || 25.0);
    const tideHeight = parseFloat(options.tideHeight || 2.0);
    const totalWaterDepth = chartedDepth + tideHeight;

    const vpfRows = [];

    (route || []).forEach((wpt, idx) => {
      const legDist = wpt.dist || 0;
      let legSquat = 0;

      if (wpt.manualSquat !== undefined && wpt.manualSquat !== null && wpt.manualSquat !== '') {
        legSquat = parseFloat(wpt.manualSquat) || 0;
      } else {
        if (legDist === 0) {
          legSquat = 0;
        } else if (squatMode === 'shallow') {
          legSquat = squatShallow;
        } else if (squatMode === 'opensea') {
          legSquat = squatOpenSea;
        } else {
          // Auto: legs <= 15 NM or XTE <= 1.0 NM are shallow/coastal
          legSquat = (legDist <= 15 || (wpt.portXtd && wpt.portXtd <= 0.5)) ? squatShallow : squatOpenSea;
        }
      }

      const dynamicDraft = maxDraft + legSquat;
      const dynamicUkc = totalWaterDepth - dynamicDraft;

      // Fix Interval criteria (e.g. 15 min for coastal / narrow, 30 min / 1h for open sea)
      let fixInterval = '1 Hour';
      if (legDist <= 5) fixInterval = '6 Min';
      else if (legDist <= 15) fixInterval = '15 Min';
      else if (legDist <= 30) fixInterval = '30 Min';
      else fixInterval = '1 Hour';

      vpfRows.push({
        index: idx + 1,
        id: wpt.id,
        lat: wpt.lat,
        lon: wpt.lon,
        latDms: internalFormatDMS(wpt.lat, true),
        lonDms: internalFormatDMS(wpt.lon, false),
        course: (wpt.course || 0).toFixed(1),
        dist: (wpt.dist || 0).toFixed(2),
        accDist: (wpt.accDist || 0).toFixed(2),
        speed: (wpt.speed || speed).toFixed(1),
        squat: legSquat.toFixed(2),
        dynamicDraft: dynamicDraft.toFixed(2),
        dynamicUkc: dynamicUkc.toFixed(2),
        fixInterval,
        method: 'GPS, RADAR, LOP'
      });
    });

    return {
      vessel: {
        name: vessel.name || 'PROSPERA',
        voyageNo: vessel.voyageNo || '',
        length: L,
        beam: B,
        draftFwd: df,
        draftAft: da,
        maxDraft,
        volume: vol,
        speed,
        blockCoefficient: Cb
      },
      squatShallow,
      squatOpenSea,
      totalWaterDepth,
      vpfRows
    };
  }

  // Export engine
  global.PassageIntelligence = {
    scanNavareas,
    scanPortToPortZones,
    scanAdmiraltyPublications,
    calculateSquatAndUkc,
    pointInGeometry,
    segmentIntersectsGeometry,
    internalRhumblineDistance,
    internalFormatDMS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.PassageIntelligence;
    module.exports.PassageIntelligence = global.PassageIntelligence;
  }

})(typeof window !== 'undefined' ? window : this);
