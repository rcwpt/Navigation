/**
 * China Ship Routing - Route Comparator & Safety Audit Engine
 * Multi-ECDIS Route Comparison against China Coastal Public Routes, TSS & Warning Zones
 */

(function (global) {
  'use strict';

  // --- 1. GEODETIC & MATH UTILITIES ---
  const R_NM = 3440.065; // Earth radius in Nautical Miles

  function toRad(deg) { return (deg * Math.PI) / 180; }
  function toDeg(rad) { return (rad * 180) / Math.PI; }

  function rhumblineDistance(lat1, lon1, lat2, lon2) {
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaPhi = phi2 - phi1;
    let deltaLambda = toRad(Math.abs(lon2 - lon1));
    if (deltaLambda > Math.PI) deltaLambda = 2 * Math.PI - deltaLambda;

    const deltaPsi = Math.log(Math.tan(Math.PI / 4 + phi2 / 2) / Math.tan(Math.PI / 4 + phi1 / 2));
    const q = Math.abs(deltaPsi) > 1e-10 ? deltaPhi / deltaPsi : Math.cos(phi1);
    return Math.sqrt(deltaPhi * deltaPhi + q * q * deltaLambda * deltaLambda) * R_NM;
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

  function formatDMS(val, isLat) {
    if (val === undefined || val === null || isNaN(val)) return '-';
    const hemi = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    const degPad = isLat ? 2 : 3;
    return `${String(deg).padStart(degPad, '0')}°${min.toFixed(3).padStart(6, '0')}′${hemi}`;
  }

  // --- 2. POLYGON & SEGMENT GEOMETRY ---
  function pointInPolygon(pt, poly) {
    // pt: [lon, lat], poly: [[lon, lat], ...]
    const x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function lineSegmentsIntersect(p1, p2, p3, p4) {
    function ccw(a, b, c) {
      return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
    }
    return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
  }

  function legIntersectsPolygon(p1, p2, poly) {
    if (pointInPolygon(p1, poly) || pointInPolygon(p2, poly)) return true;
    for (let i = 0; i < poly.length - 1; i++) {
      if (lineSegmentsIntersect(p1, p2, poly[i], poly[i + 1])) return true;
    }
    return false;
  }

  function pointToSegmentDistanceNM(pLat, pLon, aLat, aLon, bLat, bLon) {
    // Spherical approximation in NM
    const dAB = rhumblineDistance(aLat, aLon, bLat, bLon);
    if (dAB < 1e-4) return rhumblineDistance(pLat, pLon, aLat, aLon);

    const dAP = rhumblineDistance(aLat, aLon, pLat, pLon);
    const dBP = rhumblineDistance(bLat, bLon, pLat, pLon);

    const brgAB = rhumblineBearing(aLat, aLon, bLat, bLon);
    const brgAP = rhumblineBearing(aLat, aLon, pLat, pLon);
    const angleA = Math.abs(toRad(brgAP - brgAB));

    if (Math.cos(angleA) < 0) return dAP; // Projection falls before A

    const brgBA = (brgAB + 180) % 360;
    const brgBP = rhumblineBearing(bLat, bLon, pLat, pLon);
    const angleB = Math.abs(toRad(brgBP - brgBA));

    if (Math.cos(angleB) < 0) return dBP; // Projection falls after B

    // Perpendicular distance = dAP * sin(angleA)
    const perp = dAP * Math.abs(Math.sin(angleA));
    return Math.min(perp, Math.min(dAP, dBP));
  }

  // --- 3. SAFETY AUDIT ENGINE ---
  function auditRouteAgainstChinaSystems(route, routingData) {
    if (!route || !route.waypoints || route.waypoints.length === 0 || !routingData) {
      return {
        isValid: false,
        totalDistance: 0,
        violations: [],
        warningsCount: 0,
        legAudits: [],
        matchedPublicRoutes: []
      };
    }

    const wpts = route.waypoints;
    const violations = [];
    const legAudits = [];
    let hasNoSailViolation = false;
    let hasTssViolation = false;
    let hasPrecautionaryTransit = false;

    const warnZones = (routingData.navigation_warning_zones && routingData.navigation_warning_zones.zones) || [];
    const outerRoutes = (routingData.national_coastal_public_routes && routingData.national_coastal_public_routes.outer_public_routes) || [];
    const innerRoutes = (routingData.national_coastal_public_routes && routingData.national_coastal_public_routes.inner_public_routes) || [];
    const allPublicRoutes = [...outerRoutes, ...innerRoutes];
    const sections = routingData.sections || [];

    // A. Audit Each Waypoint
    wpts.forEach((w, idx) => {
      const pt = [w.lon, w.lat];

      // Check Warning Zones
      warnZones.forEach(z => {
        if (z.coordinates && pointInPolygon(pt, z.coordinates)) {
          hasNoSailViolation = true;
          violations.push({
            severity: 'CRITICAL',
            title_en: `Waypoint ${w.name || 'WP' + (idx+1)} inside ${z.name_en}`,
            title_zh: `转向点 ${w.name || 'WP' + (idx+1)} 位于 ${z.name_zh} 内`,
            desc_en: `Waypoint is situated inside the strictly prohibited no-sail warning zone (${z.description || 'Navigation prohibited'}).`,
            desc_zh: `该转向点位于严禁驶入的航行警告禁航区内。`,
            wptIndex: idx,
            zoneId: z.id
          });
        }
      });

      // Check Precautionary Areas
      sections.forEach(sec => {
        (sec.precautionary_areas || []).forEach(pa => {
          if (pa.shape_type === 'circle' && pa.center && pa.center.coordinates) {
            const dist = rhumblineDistance(w.lat, w.lon, pa.center.coordinates[1], pa.center.coordinates[0]);
            if (dist <= (pa.radius_nm || 2.0)) {
              hasPrecautionaryTransit = true;
              violations.push({
                severity: 'ADVISORY',
                title_en: `${w.name || 'WP' + (idx+1)} inside Precautionary Area: ${pa.name_en || pa.name_zh}`,
                title_zh: `${w.name || 'WP' + (idx+1)} 位于警戒区内: ${pa.name_zh}`,
                desc_en: `Vessels navigating in precautionary areas shall exercise extreme caution, maintain VHF continuous watch, and follow VTS reporting.`,
                desc_zh: `在警戒区内航行的船舶须保持高度戒备，保持甚高频持续守听并依规向VTS报告。`,
                wptIndex: idx
              });
            }
          } else if (pa.coordinates && pa.coordinates.length >= 3) {
            if (pointInPolygon(pt, pa.coordinates)) {
              hasPrecautionaryTransit = true;
              violations.push({
                severity: 'ADVISORY',
                title_en: `${w.name || 'WP' + (idx+1)} inside Precautionary Area: ${pa.name_en || pa.name_zh}`,
                title_zh: `${w.name || 'WP' + (idx+1)} 位于警戒区内: ${pa.name_zh}`,
                desc_en: `Exercise extreme caution and maintain continuous VHF listening watch.`,
                desc_zh: `在警戒区内请保持极度谨慎并保持甚高频值守。`,
                wptIndex: idx
              });
            }
          }
        });
      });
    });

    // B. Audit Each Leg
    for (let i = 0; i < wpts.length - 1; i++) {
      const w1 = wpts[i];
      const w2 = wpts[i + 1];
      const p1 = [w1.lon, w1.lat];
      const p2 = [w2.lon, w2.lat];
      const legCourse = w1.course !== undefined ? w1.course : rhumblineBearing(w1.lat, w1.lon, w2.lat, w2.lon);
      const legDist = w1.dist !== undefined ? w1.dist : rhumblineDistance(w1.lat, w1.lon, w2.lat, w2.lon);

      let legSeverity = 'SAFE';
      let legNotice_en = 'Clear / Safe transit';
      let legNotice_zh = '正常通航 / 无禁航冲突';
      let legZoneViolations = [];

      // Check Warning Zones intersection
      warnZones.forEach(z => {
        if (z.coordinates && legIntersectsPolygon(p1, p2, z.coordinates)) {
          hasNoSailViolation = true;
          legSeverity = 'CRITICAL';
          legNotice_en = `PENETRATES NO-SAIL ZONE: ${z.name_en}`;
          legNotice_zh = `穿越严禁驶入航行警告区: ${z.name_zh}`;
          legZoneViolations.push(z.name_en);

          violations.push({
            severity: 'CRITICAL',
            title_en: `Leg ${i+1} (${w1.name} → ${w2.name}) Crosses ${z.name_en}!`,
            title_zh: `航段 ${i+1} (${w1.name} → ${w2.name}) 穿越 ${z.name_zh}!`,
            desc_en: `Navigation Warning Notice: Vessels CAN NOT sail into this area! Immediate route rerouting required.`,
            desc_zh: `航行警告：严禁任何船舶驶入该区域！请立即调整航线避开。`,
            legIndex: i,
            zoneId: z.id
          });
        }
      });

      // Check TSS Separation Zones intersection
      sections.forEach(sec => {
        (sec.traffic_separation_schemes || []).forEach(tss => {
          (tss.separation_zones || []).forEach(sz => {
            if (sz.coordinates && sz.coordinates.length >= 3 && legIntersectsPolygon(p1, p2, sz.coordinates)) {
              hasTssViolation = true;
              if (legSeverity !== 'CRITICAL') {
                legSeverity = 'CAUTION';
                legNotice_en = `Intersects TSS Separation Zone: ${tss.name_en}`;
                legNotice_zh = `穿越分道通航分隔带: ${tss.name_zh}`;
              }
              violations.push({
                severity: 'CAUTION',
                title_en: `Leg ${i+1} (${w1.name} → ${w2.name}) penetrates TSS Separation Zone: ${tss.name_en}`,
                title_zh: `航段 ${i+1} (${w1.name} → ${w2.name}) 穿越分道通航分隔带: ${tss.name_zh}`,
                desc_en: `Under COLREG Rule 10 & China MSA Regulations: Vessels must avoid crossing separation lines or zones except in emergency.`,
                desc_zh: `依据国际海上避碰规则第10条及中国海事局规定，除紧急情况或避免紧迫危险外，不得进入分隔带。`,
                legIndex: i
              });
            }
          });
        });
      });

      // Find Closest China Coastal Public Route for this leg
      let bestMatchedRoute = null;
      let minDistanceToPublic = Infinity;
      let closestPublicLegCourse = null;
      let alignmentStatus = 'Normal';

      const midLat = (w1.lat + w2.lat) / 2;
      const midLon = (w1.lon + w2.lon) / 2;

      allPublicRoutes.forEach(pr => {
        const pw = pr.waypoints || [];
        for (let j = 0; j < pw.length - 1; j++) {
          const a = pw[j].coordinates;
          const b = pw[j + 1].coordinates;
          const d = pointToSegmentDistanceNM(midLat, midLon, a[1], a[0], b[1], b[0]);
          if (d < minDistanceToPublic) {
            minDistanceToPublic = d;
            bestMatchedRoute = pr;
            closestPublicLegCourse = pw[j].course_deg || rhumblineBearing(a[1], a[0], b[1], b[0]);
          }
        }
      });

      if (bestMatchedRoute && minDistanceToPublic <= 25.0) {
        // Calculate alignment angle difference
        if (closestPublicLegCourse !== null) {
          let diff = Math.abs(legCourse - closestPublicLegCourse);
          if (diff > 180) diff = 360 - diff;
          if (diff <= 35) {
            alignmentStatus = 'Aligned';
          } else if (diff >= 145) {
            alignmentStatus = 'Reciprocal';
          } else {
            alignmentStatus = 'Crossing';
          }
        }
      }

      legAudits.push({
        legIndex: i,
        fromWpt: w1.name || `WP${i+1}`,
        toWpt: w2.name || `WP${i+2}`,
        course: legCourse,
        distance: legDist,
        severity: legSeverity,
        notice_en: legNotice_en,
        notice_zh: legNotice_zh,
        closestPublicRoute: bestMatchedRoute ? (bestMatchedRoute.name_en || bestMatchedRoute.name_zh) : 'Open Sea',
        closestPublicRoute_zh: bestMatchedRoute ? bestMatchedRoute.name_zh : '开阔水域',
        distanceToPublicNM: minDistanceToPublic < 100 ? minDistanceToPublic : null,
        alignment: alignmentStatus
      });
    }

    // C. Aggregate Overall Matched Public Routes
    const routeMatchTally = {};
    legAudits.forEach(la => {
      if (la.closestPublicRoute && la.closestPublicRoute !== 'Open Sea') {
        routeMatchTally[la.closestPublicRoute] = (routeMatchTally[la.closestPublicRoute] || 0) + 1;
      }
    });

    const sortedMatches = Object.entries(routeMatchTally).sort((a, b) => b[1] - a[1]);
    const primaryMatchedRoute = sortedMatches.length > 0 ? sortedMatches[0][0] : 'None';

    const totalDistance = wpts.length > 0 ? (wpts[wpts.length - 1].accDist || 0) : 0;

    return {
      isValid: true,
      routeName: route.routeName || 'IMPORTED_ROUTE',
      totalWaypoints: wpts.length,
      totalDistance: totalDistance,
      hasNoSailViolation: hasNoSailViolation,
      hasTssViolation: hasTssViolation,
      hasPrecautionaryTransit: hasPrecautionaryTransit,
      overallStatus: hasNoSailViolation ? 'CRITICAL' : (hasTssViolation ? 'CAUTION' : 'COMPLIANT'),
      violations: violations,
      legAudits: legAudits,
      primaryMatchedRoute: primaryMatchedRoute
    };
  }

  // --- 4. DEMO COASTAL ROUTE GENERATOR ---
  function getDemoRoute() {
    // Realistic passage from Tianjin Bohai Bay down through Laotieshan, Chengshanjiao to Yangtze River Estuary
    return {
      routeName: "TIANJIN_TO_SHANGHAI_COASTAL",
      waypoints: [
        { id: "WP01", name: "TIANJIN_DEP", lat: 38.865, lon: 118.420, radius: 0.8, speed: 12.0 },
        { id: "WP02", name: "BOHAI_CENTRAL", lat: 38.650, lon: 119.800, radius: 0.8, speed: 13.5 },
        { id: "WP03", name: "LAOTIESHAN_W", lat: 38.560, lon: 120.900, radius: 0.8, speed: 13.5 },
        { id: "WP04", name: "LAOTIESHAN_TSS", lat: 38.520, lon: 121.350, radius: 0.8, speed: 13.5 },
        { id: "WP05", name: "CHENGSHANJIAO_N", lat: 37.600, lon: 122.750, radius: 1.0, speed: 14.0 },
        { id: "WP06", name: "CHENGSHANJIAO_S", lat: 36.850, lon: 123.100, radius: 1.0, speed: 14.0 },
        { id: "WP07", name: "YELLOW_SEA_PUB", lat: 34.200, lon: 123.250, radius: 1.0, speed: 14.0 },
        { id: "WP08", name: "CHANGJIANGKOU_N", lat: 32.100, lon: 122.950, radius: 1.0, speed: 13.0 },
        { id: "WP09", name: "SHANGHAI_PILOT", lat: 31.150, lon: 122.650, radius: 0.5, speed: 10.0 }
      ]
    };
  }

  // --- 5. REPORT GENERATOR ---
  function generateReportText(auditResult, speedKnots) {
    if (!auditResult || !auditResult.isValid) return 'No comparison data available.';
    speedKnots = parseFloat(speedKnots) || 12.0;
    const hours = auditResult.totalDistance / speedKnots;
    const days = Math.floor(hours / 24);
    const remHours = Math.round(hours % 24);

    let text = `========================================================================\n`;
    text += `⚓ CHINA SHIP ROUTING & PASSAGE SAFETY COMPARISON REPORT\n`;
    text += `========================================================================\n`;
    text += `Route Name       : ${auditResult.routeName}\n`;
    text += `Total Distance   : ${auditResult.totalDistance.toFixed(2)} NM\n`;
    text += `Waypoints Count  : ${auditResult.totalWaypoints} WPTs\n`;
    text += `Cruising Speed   : ${speedKnots.toFixed(1)} kts\n`;
    text += `Estimated Transit: ${days} days ${remHours} hrs (${hours.toFixed(1)} hrs)\n`;
    text += `Primary Fairway  : ${auditResult.primaryMatchedRoute}\n`;
    text += `Overall Status   : ${auditResult.overallStatus} ${auditResult.hasNoSailViolation ? '🚨 CRITICAL RESTRICTION DETECTED' : (auditResult.hasTssViolation ? '⚠️ CAUTION ADVISED' : '✅ COMPLIANT')}\n`;
    text += `------------------------------------------------------------------------\n\n`;

    if (auditResult.violations.length > 0) {
      text += `🚨 SAFETY ALERTS & NOTICES (${auditResult.violations.length}):\n`;
      auditResult.violations.forEach((v, idx) => {
        text += ` [${idx + 1}] [${v.severity}] ${v.title_en}\n`;
        text += `     ${v.desc_en}\n`;
      });
      text += `\n------------------------------------------------------------------------\n\n`;
    } else {
      text += `✅ SAFETY AUDIT: No warning zone or separation zone violations detected.\n\n`;
    }

    text += `LEG-BY-LEG COMPARISON & ALIGNMENT DETAILS:\n`;
    text += `------------------------------------------------------------------------\n`;
    text += `#   From -> To          Course  Dist(NM)  Closest Public Route        Status\n`;
    text += `------------------------------------------------------------------------\n`;
    auditResult.legAudits.forEach(la => {
      const legLabel = `${la.fromWpt} -> ${la.toWpt}`.padEnd(20, ' ');
      const crsStr = `${la.course.toFixed(1)}°`.padStart(6, ' ');
      const dstStr = `${la.distance.toFixed(1)}`.padStart(8, ' ');
      const pubStr = `${la.closestPublicRoute.slice(0, 26)}`.padEnd(28, ' ');
      text += `${String(la.legIndex + 1).padEnd(3, ' ')} ${legLabel} ${crsStr}  ${dstStr}  ${pubStr} ${la.severity}\n`;
    });
    text += `========================================================================\n`;
    text += `Generated by China Coastal Ship Routeing GIS System (PRC MSA Compliant)\n`;
    return text;
  }

  // --- EXPORT TO GLOBAL ---
  const RouteComparator = {
    rhumblineDistance,
    rhumblineBearing,
    formatDMS,
    pointInPolygon,
    lineSegmentsIntersect,
    legIntersectsPolygon,
    pointToSegmentDistanceNM,
    auditRouteAgainstChinaSystems,
    getDemoRoute,
    generateReportText
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RouteComparator;
  } else {
    global.RouteComparator = RouteComparator;
  }

})(typeof window !== 'undefined' ? window : this);
