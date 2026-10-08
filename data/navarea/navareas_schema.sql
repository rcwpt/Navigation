-- =========================================================================
-- NAVAREA (World-Wide Navigational Warning Service - WWNWS) Database Schema
-- Standard: IMO Resolution A.706(17) / IHO S-53 / WMO-No. 558
-- Compatible with PostgreSQL (PostGIS) & MySQL 8.0+ Spatial
-- =========================================================================

-- 1. POSTGRESQL + POSTGIS SCHEMA
-- -------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS navareas CASCADE;

CREATE TABLE navareas (
    id SERIAL PRIMARY KEY,
    navarea_code VARCHAR(20) UNIQUE NOT NULL,      -- e.g. 'NAVAREA I'
    navarea_number INT NOT NULL,                  -- e.g. 1
    name VARCHAR(255) NOT NULL,
    coordinator_country VARCHAR(100) NOT NULL,
    coordinator_authority VARCHAR(255),
    ocean_region TEXT,
    color VARCHAR(10),
    description TEXT,
    broadcast_system TEXT,
    boundaries_text TEXT,
    geom GEOMETRY(Geometry, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_navareas_geom ON navareas USING GIST (geom);
CREATE INDEX idx_navareas_number ON navareas (navarea_number);

-- POPULATE DATA (Sample via ST_GeomFromGeoJSON)

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA I',
    1,
    'NAVAREA I (North Atlantic, North Sea & Baltic)',
    'United Kingdom',
    'United Kingdom Hydrographic Office (UKHO)',
    'Northeast Atlantic Ocean, North Sea, Baltic Sea',
    '#38bdf8',
    'Perairan Samudra Atlantik Utara di sebelah timur 35°W, dari 48°27''N hingga 75°00''N termasuk Laut Utara, Selat Inggris bagian timur, dan seluruh sub-area Laut Baltik.',
    'Enhanced Group Call (EGC SafetyNET/SafetyCast), NAVTEX 518 kHz',
    'Dari 48°27''N di pantai barat Prancis ke 48°27''N 35°00''W, utara ke 66°30''N 35°00''W, 75°00''N 17°30''W, 75°00''N 05°00''W, selatan ke 65°00''N 05°00''W, timur ke pantai Norwegia di 65°00''N 11°40''E.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[-4.7667, 48.45], [-35.0, 48.45], [-35.0, 66.5], [-17.5, 75.0], [-5.0, 75.0], [-5.0, 65.0], [11.6667, 65.0], [18.0, 59.3], [30.2, 59.9], [24.0, 57.0], [12.5, 55.6], [9.0, 54.0], [1.4, 51.1], [-4.7667, 48.45]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA II',
    2,
    'NAVAREA II (East Atlantic & West Africa)',
    'France',
    'Service Hydrographique et Océanographique de la Marine (SHOM)',
    'East Central Atlantic Ocean, Bay of Biscay, West African waters',
    '#818cf8',
    'Perairan Atlantik timur 35°00''W dari 48°27''N ke 07°00''N, dan timur 20°00''W dari 07°00''N ke 06°00''S, mencakup Teluk Biscay, pesisir Afrika Barat, dan pintu masuk barat Selat Gibraltar.',
    'SafetyNET, Iridium SafetyCast, NAVTEX',
    'Dari 48°27''N pantai Prancis ke 48°27''N 35°00''W, selatan ke 07°00''N 35°00''W, timur ke 07°00''N 20°00''W, selatan ke 06°00''S 20°00''W, timur ke pantai Afrika di 06°00''S 12°15''E, lalu mengikuti garis pantai Afrika dan Eropa barat ke titik awal.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[-4.7667, 48.45], [-35.0, 48.45], [-35.0, 7.0], [-20.0, 7.0], [-20.0, -6.0], [12.25, -6.0], [9.0, 0.5], [2.5, 6.2], [-8.0, 4.5], [-17.5, 14.7], [-17.0, 21.0], [-10.0, 29.5], [-5.6, 36.0], [-9.5, 38.8], [-9.3, 43.0], [-1.7, 43.4], [-4.7667, 48.45]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA III',
    3,
    'NAVAREA III (Mediterranean & Black Seas)',
    'Spain',
    'Instituto Hidrográfico de la Marina (IHM)',
    'Mediterranean Sea, Sea of Marmara, Black Sea, Sea of Azov',
    '#f472b6',
    'Seluruh perairan Laut Mediterania dan Laut Hitam di sebelah timur meridian batas Selat Gibraltar (05°36''W).',
    'SafetyNET, SafetyCast, NAVTEX (berbagai stasiun pesisir Mediterania & Black Sea)',
    'Dibatasi di barat oleh meridian 05°36''W di Selat Gibraltar, mencakup seluruh cekungan Mediterania, Laut Adriatik, Laut Aegea, Laut Marmara, Laut Hitam, dan Laut Azov.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[-5.6, 36.0], [-5.6, 35.8], [-2.0, 35.2], [3.0, 36.8], [10.5, 37.0], [11.5, 33.0], [15.0, 32.0], [24.0, 32.2], [34.0, 31.3], [35.8, 32.8], [36.0, 36.8], [30.0, 36.5], [27.0, 40.5], [29.0, 41.2], [35.0, 42.0], [41.6, 41.6], [39.0, 45.0], [37.0, 47.0], [35.0, 45.5], [31.0, 46.5], [29.0, 45.0], [27.5, 42.5], [23.5, 38.0], [20.0, 39.5], [14.0, 45.0], [12.5, 42.0], [9.0, 44.0], [3.0, 43.3], [0.0, 39.0], [-5.6, 36.0]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA IV',
    4,
    'NAVAREA IV (Western North Atlantic & Caribbean)',
    'United States',
    'National Geospatial-Intelligence Agency (NGA)',
    'Northwest Atlantic Ocean, Gulf of Mexico, Caribbean Sea, Hudson Bay',
    '#fb923c',
    'Bagian barat Samudra Atlantik Utara dari pesisir benua Amerika Utara ke timur hingga meridian 35°00''W, antara lintang 07°00''N dan 67°00''N, termasuk Teluk Meksiko, Laut Karibia, dan Teluk Hudson.',
    'Inmarsat-C SafetyNET, Iridium SafetyCast, USCG NAVTEX',
    'Dari perbatasan Guyana Prancis/Brasil (04°30''N 51°40''W) ke 07°00''N 35°00''W, utara ke 67°00''N 35°00''W, barat ke pantai Greenland dan Kanada di 67°00''N, lalu menyusuri pantai timur Amerika hingga Karibia dan pesisir utara Amerika Selatan.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[-51.65, 4.5], [-35.0, 7.0], [-35.0, 67.0], [-52.0, 67.0], [-65.0, 67.0], [-78.0, 62.0], [-95.0, 63.0], [-82.0, 52.0], [-64.0, 45.0], [-70.0, 42.0], [-75.0, 35.0], [-80.0, 25.0], [-97.0, 26.0], [-95.0, 19.0], [-88.0, 21.5], [-83.0, 10.0], [-77.0, 8.5], [-60.0, 10.5], [-51.65, 4.5]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA V',
    5,
    'NAVAREA V (Western South Atlantic / Brazil)',
    'Brazil',
    'Diretoria de Hidrografia e Navegação (DHN)',
    'Southwest Atlantic Ocean',
    '#a3e635',
    'Perairan Atlantik barat 20°00''W dari 07°00''N ke selatan hingga 35°50''S, menyempit di batas pesisir Guyana Prancis/Brasil (04°30''N) dan batas Uruguay/Brasil (33°45''S).',
    'SafetyNET, SafetyCast, Brazilian Navy Coast Radio / NAVTEX',
    'Dari perbatasan pantai Guyana Prancis/Brasil ke 07°00''N 20°00''W, selatan sepanjang 20°00''W ke 35°50''S, barat ke perbatasan Uruguay/Brasil di 33°45''S 53°23''W, lalu mengikuti garis pantai Brasil ke titik awal.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[-51.65, 4.5], [-20.0, 7.0], [-20.0, -35.8333], [-53.38, -33.75], [-48.5, -27.5], [-43.2, -23.0], [-38.5, -13.0], [-35.0, -5.5], [-44.0, -2.5], [-51.65, 4.5]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA VI',
    6,
    'NAVAREA VI (Southwest Atlantic & Southern Ocean)',
    'Argentina',
    'Servicio de Hidrografía Naval (SHN)',
    'Southwest Atlantic Ocean, Southern Ocean, Drake Passage',
    '#4ade80',
    'Samudra Atlantik Selatan dan Samudra Selatan di sebelah selatan lintang 35°50''S, antara meridian 20°00''W hingga meridian Tanjung Horn (67°16''W), memanjang ke selatan hingga Antarktika.',
    'SafetyNET, SafetyCast, Argentine NAVTEX Stations',
    'Dari 33°45''S 53°23''W di batas Uruguay/Brasil ke 35°50''S 20°00''W, selatan sepanjang meridian 20°00''W ke Antarktika (90°00''S), barat sepanjang 90°00''S ke meridian Cape Horn 67°16''W, utara ke Tanjung Horn dan pesisir Argentina.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[-53.38, -33.75], [-20.0, -35.8333], [-20.0, -85.0], [-67.267, -85.0], [-67.267, -55.98], [-66.0, -54.5], [-68.0, -50.0], [-65.0, -43.0], [-57.0, -38.0], [-56.0, -35.0], [-53.38, -33.75]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA VII',
    7,
    'NAVAREA VII (Southeast Atlantic & Southwest Indian Ocean)',
    'South Africa',
    'South African Navy Hydrographic Office (SANHO)',
    'Southeast Atlantic Ocean, Southwest Indian Ocean, Southern Ocean',
    '#2dd4bf',
    'Samudra Atlantik Selatan sebelah selatan 06°00''S dari 20°00''W ke pantai Afrika, selatan Tanjung Harapan; lalu Samudra Hindia Selatan sebelah selatan 10°30''S dari pantai Afrika ke 55°00''E, lalu selatan 30°00''S ke 80°00''E.',
    'SafetyNET, SafetyCast, Cape Town Radio NAVTEX',
    'Dari pantai barat Afrika di 06°00''S 12°15''E barat ke 06°00''S 20°00''W, selatan sepanjang 20°00''W ke Antarktika (90°00''S), timur ke 80°00''E, utara ke 30°00''S 80°00''E, barat ke 30°00''S 55°00''E, utara ke 10°30''S 55°00''E, barat ke pantai Afrika di 10°30''S 40°30''E.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[12.25, -6.0], [-20.0, -6.0], [-20.0, -85.0], [80.0, -85.0], [80.0, -30.0], [55.0, -30.0], [55.0, -10.5], [40.5, -10.5], [35.0, -24.0], [28.0, -32.5], [18.5, -34.8], [15.0, -25.0], [12.0, -15.0], [12.25, -6.0]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA VIII',
    8,
    'NAVAREA VIII (Central & Northern Indian Ocean)',
    'India',
    'National Hydrographic Office (NHO India)',
    'Central & Northern Indian Ocean, Arabian Sea (East), Bay of Bengal',
    '#38bdf8',
    'Wilayah Samudra Hindia Utara dan Tengah yang dibatasi oleh garis dari perbatasan India-Pakistan (23°45''N 68°00''E) ke 12°00''N 63°00''E, ke Tanjung Guardafui; pantai Afrika Timur dari khatulistiwa ke 10°30''S, timur ke 55°00''E, selatan ke 30°00''S, timur ke 95°00''E, utara ke 06°00''N, dan ke perbatasan Myanmar/Thailand di 10°00''N 98°30''E.',
    'SafetyNET, SafetyCast, Indian NAVTEX Stations (Mumbai, Chennai, etc.)',
    'Dari 23°45''N 68°00''E ke 12°00''N 63°00''E, ke Cape Guardafui (11°50''N 51°16''E), menyusuri pantai Somalia/Kenya/Tanzania ke 10°30''S 40°30''E, ke 10°30''S 55°00''E, 30°00''S 55°00''E, 30°00''S 95°00''E, 06°00''N 95°00''E, ke 10°00''N 98°30''E, lalu pesisir Teluk Benggala dan India.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[68.0, 23.75], [63.0, 12.0], [51.27, 11.83], [49.0, 11.0], [42.5, 0.0], [40.5, -10.5], [55.0, -10.5], [55.0, -30.0], [95.0, -30.0], [95.0, 6.0], [98.5, 10.0], [95.0, 15.0], [89.0, 21.5], [80.0, 13.0], [77.5, 8.1], [72.8, 19.0], [68.0, 23.75]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA IX',
    9,
    'NAVAREA IX (Red Sea, Persian Gulf & NW Arabian Sea)',
    'Pakistan',
    'Pakistan Navy Hydrographic Department (PNH)',
    'Red Sea, Gulf of Suez, Gulf of Aqaba, Gulf of Aden, Arabian Sea (West), Persian Gulf',
    '#c084fc',
    'Mencakup Laut Merah, Teluk Suez, Teluk Aqaba, Teluk Aden, Teluk Oman, Teluk Persia, dan perairan Laut Arab sebelah utara batas NAVAREA VIII.',
    'SafetyNET, SafetyCast, Karachi Radio NAVTEX',
    'Dibatasi di selatan oleh garis dari Tanjung Guardafui (11°50''N 51°16''E) ke 12°00''N 63°00''E, lalu ke perbatasan India/Pakistan di 23°45''N 68°00''E, mencakup seluruh perairan tertutup di sebelah utaranya.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[51.27, 11.83], [63.0, 12.0], [68.0, 23.75], [64.0, 25.3], [57.0, 26.0], [50.0, 29.5], [48.0, 30.0], [52.0, 25.0], [59.5, 22.5], [54.0, 16.5], [45.0, 12.5], [43.3, 12.6], [38.0, 22.0], [32.5, 29.9], [35.0, 28.0], [40.0, 20.0], [43.5, 12.5], [51.27, 11.83]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA X',
    10,
    'NAVAREA X (Southern Indian Ocean & Australia)',
    'Australia',
    'Australian Maritime Safety Authority (AMSA)',
    'South Indian Ocean, Timor Sea, Coral Sea, Tasman Sea (West), Southern Ocean',
    '#06b6d4',
    'Samudra Hindia Selatan timur 80°00''E dan selatan 30°00''S ke 95°00''E, utara ke 12°00''S, timur ke 127°00''E; Laut Timor, Pasifik Barat Daya selatan 10°00''S ke 141°00''E, utara ke khatulistiwa (141°00''E), timur ke 170°00''E, selatan ke 29°00''S, lalu ke 45°00''S 160°00''E, dan sepanjang 160°00''E ke Antarktika.',
    'SafetyNET, SafetyCast, Inmarsat / HF Marine Broadcasts',
    'Dari 30°00''S 80°00''E ke 30°00''S 95°00''E, ke 12°00''S 95°00''E, ke 12°00''S 127°00''E, ke 10°00''S 127°00''E, ke 10°00''S 141°00''E, ke 00°00'' 141°00''E, ke 00°00'' 170°00''E, ke 29°00''S 170°00''E, ke 45°00''S 160°00''E, lalu selatan sepanjang 160°00''E ke Antarktika (90°00''S), barat ke 80°00''E, utara ke 30°00''S 80°00''E.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[80.0, -30.0], [95.0, -30.0], [95.0, -12.0], [127.0, -12.0], [127.0, -10.0], [141.0, -10.0], [141.0, 0.0], [170.0, 0.0], [170.0, -29.0], [160.0, -45.0], [160.0, -85.0], [80.0, -85.0], [80.0, -30.0]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA XI',
    11,
    'NAVAREA XI (NW Pacific, East Asia & Indonesia)',
    'Japan',
    'Japan Coast Guard (JCG)',
    'Northwest Pacific Ocean, South China Sea, East China Sea, Philippine Sea, Indonesian Seas, Sea of Japan',
    '#10b981',
    'Perairan Pasifik Barat Laut dan Asia Timur: berbatasan di selatan dengan NAVAREA X (di khatulistiwa dari 141°E ke 180°, dan batas kepulauan Indonesia di 10°S/12°S); barat berbatasan dengan NAVAREA VIII (95°00''E); utara hingga perbatasan Korut/Rusia di 42°30''N 130°00''E, ke 42°17.6''N 135°00''E, ke 45°00''N 138°20''E, lalu sepanjang 45°00''N ke 180°. Mencakup seluruh kepulauan Indonesia, Filipina, Malaysia, Singapura, Thailand, Vietnam, Cina, Taiwan, Korea, dan Jepang.',
    'SafetyNET, SafetyCast, JCG NAVTEX & Dispenal / Bakamla Indonesia',
    'Dari 10°00''N 98°30''E ke 06°00''N 95°00''E, selatan ke 12°00''S 95°00''E, timur ke 12°00''S 127°00''E, utara ke 10°00''S 127°00''E, timur ke 10°00''S 141°00''E, utara ke khatulistiwa di 141°00''E, timur sepanjang khatulistiwa ke 180°00'', utara sepanjang 180°00'' ke 45°00''N, barat sepanjang 45°00''N ke 138°20''E, ke 42°17.6''N 135°00''E, ke 42°30''N 130°00''E di perbatasan Korut/Rusia.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[98.5, 10.0], [95.0, 6.0], [95.0, -12.0], [127.0, -12.0], [127.0, -10.0], [141.0, -10.0], [141.0, 0.0], [180.0, 0.0], [180.0, 45.0], [138.33, 45.0], [135.0, 42.29], [130.68, 42.42], [124.0, 39.5], [118.0, 38.5], [121.0, 31.0], [110.0, 20.0], [105.0, 10.0], [100.0, 13.5], [98.5, 10.0]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA XII',
    12,
    'NAVAREA XII (Eastern North Pacific & Central Pacific)',
    'United States',
    'National Geospatial-Intelligence Agency (NGA)',
    'Eastern North Pacific Ocean, Gulf of Alaska, Hawaiian Waters, Central Pacific',
    '#facc15',
    'Bagian timur Samudra Pasifik, sebelah barat pesisir benua Amerika dan timur meridian 120°00''W, dari 03°24''S ke khatulistiwa, lalu ke meridian 180°00'', utara ke 50°00''N, lalu ke 53°00''N 172°00''E, menyusuri batas maritim AS-Rusia hingga 67°00''N di Selat Bering.',
    'Inmarsat-C SafetyNET, Iridium SafetyCast, USCG Pacific NAVTEX',
    'Dari 03°24''S di pantai Amerika Selatan ke 03°24''S 120°00''W, utara ke khatulistiwa di 120°00''W, barat sepanjang khatulistiwa ke 180°00'', utara ke 50°00''N 180°00'', barat laut ke 53°00''N 172°00''E, ke perbatasan maritim AS-Rusia di Selat Bering hingga 67°00''N 168°58''W, lalu menyusuri pantai Alaska dan Amerika ke titik awal.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "MultiPolygon", "coordinates": [[[[-180.0, 0.0], [-120.0, 0.0], [-120.0, -3.4], [-79.9, -3.4], [-78.0, 1.0], [-84.0, 9.0], [-95.0, 16.0], [-105.0, 20.0], [-117.0, 32.5], [-124.0, 48.0], [-135.0, 58.0], [-160.0, 56.0], [-168.967, 65.5], [-168.967, 67.0], [-180.0, 67.0], [-180.0, 0.0]]], [[[172.0, 53.0], [180.0, 50.0], [180.0, 65.5], [172.0, 53.0]]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA XIII',
    13,
    'NAVAREA XIII (Northwest Pacific & Russian Far East)',
    'Russian Federation',
    'Department of Navigation and Oceanography (DNO)',
    'Northwest Pacific Ocean, Sea of Okhotsk, Western Bering Sea',
    '#e879f9',
    'Perairan laut di sebelah utara NAVAREA XI dan sebelah barat NAVAREA XII: dari perbatasan Korut/Rusia di 42°17.6''N 135°00''E ke 45°00''N 138°20''E, timur sepanjang 45°00''N ke 180°00'', utara sepanjang Garis Tanggal Internasional (IDL) ke 67°00''N, lalu barat ke pantai daratan Rusia.',
    'SafetyNET, SafetyCast, Russian Coast Radio / NAVTEX',
    'Dari perbatasan Korut/Rusia sepanjang paralel 42°17.6''N ke 135°00''E, ke 45°00''N 138°20''E, sepanjang paralel 45°00''N ke 180°00'', utara mengikuti garis batas perairan maritim hingga 67°00''N di Selat Bering, lalu barat ke pantai Rusia.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[130.68, 42.42], [135.0, 42.29], [138.33, 45.0], [180.0, 45.0], [180.0, 50.0], [172.0, 53.0], [168.967, 65.5], [170.0, 67.0], [160.0, 60.0], [143.0, 55.0], [135.0, 48.0], [130.68, 42.42]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA XIV',
    14,
    'NAVAREA XIV (South Central Pacific)',
    'New Zealand',
    'Maritime New Zealand (MNZ)',
    'South Pacific Ocean, Southern Ocean (Ross Sea / New Zealand sector)',
    '#38bdf8',
    'Samudra Pasifik Selatan dan Samudra Selatan di sebelah selatan khatulistiwa, dibatasi oleh NAVAREA X di sebelah barat (170°E / 160°E), khatulistiwa di sebelah utara (170°E hingga 120°W), dan meridian 120°00''W di sebelah timur membentang hingga Antarktika.',
    'SafetyNET, SafetyCast, Taupo Maritime Radio',
    'Dari khatulistiwa di 170°00''E timur ke 120°00''W, selatan sepanjang 120°00''W ke Antarktika (90°00''S), barat sepanjang 90°00''S ke 160°00''E, utara ke 45°00''S 160°00''E, timur laut ke 29°00''S 170°00''E, lalu utara sepanjang 170°00''E ke khatulistiwa.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "MultiPolygon", "coordinates": [[[[170.0, 0.0], [180.0, 0.0], [180.0, -85.0], [160.0, -85.0], [160.0, -45.0], [170.0, -29.0], [170.0, 0.0]]], [[[-180.0, 0.0], [-120.0, 0.0], [-120.0, -85.0], [-180.0, -85.0], [-180.0, 0.0]]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA XV',
    15,
    'NAVAREA XV (Southeast Pacific / Chile)',
    'Chile',
    'Servicio Hidrográfico y Oceanográfico de la Armada (SHOA)',
    'Southeast Pacific Ocean, Southern Ocean, Chilean Sea',
    '#a78bfa',
    'Samudra Pasifik Tenggara dan Samudra Selatan sebelah selatan 18°21''S mengikuti garis pantai Chili hingga meridian Tanjung Horn di 67°16''W, dan dibatasi di barat oleh meridian 120°00''W hingga Antarktika.',
    'SafetyNET, SafetyCast, SHOA NAVTEX Stations (Valparaíso, Magallanes, etc.)',
    'Dari perbatasan pantai Peru/Chili di 18°21''S 70°24''W barat ke 18°21''S 120°00''W, selatan sepanjang 120°00''W ke Antarktika (90°00''S), timur ke meridian Tanjung Horn 67°16''W, utara ke Tanjung Horn dan menyusuri pantai barat Chili ke titik awal.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[-70.4, -18.35], [-120.0, -18.35], [-120.0, -85.0], [-67.267, -85.0], [-67.267, -55.98], [-74.0, -50.0], [-75.0, -42.0], [-72.0, -35.0], [-70.4, -18.35]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA XVI',
    16,
    'NAVAREA XVI (East Central South Pacific / Peru)',
    'Peru',
    'Dirección de Hidrografía y Navegación (DHN Peru)',
    'East-Central South Pacific Ocean, Peruvian Sea',
    '#f87171',
    'Samudra Pasifik Selatan antara lintang 03°24''S di utara dan 18°21''S di selatan, dibatasi oleh garis pantai Peru di sebelah timur dan meridian 120°00''W di sebelah barat.',
    'SafetyNET, SafetyCast, Callao Coast Radio NAVTEX',
    'Dari perbatasan pantai Ekuador/Peru di 03°24''S 80°24''W barat ke 03°24''S 120°00''W, selatan sepanjang 120°00''W ke 18°21''S 120°00''W, timur ke perbatasan pantai Peru/Chili di 18°21''S 70°24''W, lalu mengikuti garis pantai Peru ke utara.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[-80.4, -3.4], [-120.0, -3.4], [-120.0, -18.35], [-70.4, -18.35], [-73.0, -16.0], [-77.0, -12.0], [-80.4, -6.0], [-80.4, -3.4]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA XVII',
    17,
    'NAVAREA XVII (Arctic Northwest / Canada-US)',
    'Canada',
    'Canadian Coast Guard (CCG)',
    'Arctic Ocean (Western Sector), Beaufort Sea, Chukchi Sea (East)',
    '#67e8f9',
    'Samudra Arktik sektor barat laut: dibatasi oleh koordinat 67°00''N 168°58''W, utara ke Kutub Utara (90°00''N 168°58''W), ke 90°00''N 120°00''W, lalu selatan sepanjang meridian 120°00''W ke pantai Kanada, dan barat menyusuri pesisir utara Alaska ke Selat Bering.',
    'Iridium SafetyCast, CCG Marine Communications and Traffic Services (MCTS)',
    'Dari 67°00''N 168°58''W utara ke 90°00''N 168°58''W, ke 90°00''N 120°00''W, selatan sepanjang meridian 120°00''W ke pantai Kanada di sekitar 69°N, lalu barat menyusuri pantai ke titik awal di Selat Bering.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[-168.967, 67.0], [-168.967, 89.0], [-120.0, 89.0], [-120.0, 69.0], [-135.0, 69.5], [-150.0, 71.0], [-165.0, 71.3], [-168.967, 67.0]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA XVIII',
    18,
    'NAVAREA XVIII (Arctic North / Canada-Greenland)',
    'Canada',
    'Canadian Coast Guard (CCG)',
    'Arctic Ocean (Central-Eastern Canadian Sector), Baffin Bay, Davis Strait',
    '#93c5fd',
    'Samudra Arktik sektor tengah-timur Kanada: dari garis pantai Kanada di meridian 120°00''W utara ke Kutub Utara (90°00''N 120°00''W), ke 90°00''N 35°00''W, selatan sepanjang 35°00''W ke 67°00''N di Greenland, lalu barat ke pantai Kanada di 67°00''N.',
    'Iridium SafetyCast, CCG MCTS Iqaluit',
    'Dari pantai Kanada di meridian 120°00''W utara ke Kutub Utara (90°00''N 120°00''W), ke 90°00''N 35°00''W, selatan sepanjang 35°00''W ke 67°00''N, barat ke garis pantai Kanada.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[-120.0, 69.0], [-120.0, 89.0], [-35.0, 89.0], [-35.0, 67.0], [-52.0, 67.0], [-65.0, 67.0], [-85.0, 70.0], [-105.0, 69.0], [-120.0, 69.0]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA XIX',
    19,
    'NAVAREA XIX (Arctic Northeast / Norway)',
    'Norway',
    'Norwegian Coastal Administration (Kystverket / NCA)',
    'Norwegian Sea, Greenland Sea, Barents Sea (West), Svalbard Waters',
    '#a5b4fc',
    'Samudra Arktik sektor timur laut: dari pantai Norwegia di 65°00''N ke 65°00''N 05°00''W, 75°00''N 05°00''W, barat ke pantai Greenland di 75°00''N 17°30''W. Dari perbatasan darat Norwegia/Rusia ke koordinat batas maritim 71°00''N 30°00''E, lalu utara sepanjang 30°00''E ke Kutub Utara (90°00''N), ke 90°00''N 35°00''W, dan selatan ke Greenland di sepanjang 35°00''W.',
    'Iridium SafetyCast, Vardø Radio NAVTEX',
    'Dari 65°00''N pantai Norwegia ke 65°00''N 05°00''W, 75°00''N 05°00''W, ke 75°00''N 17°30''W di Greenland; dari perbatasan maritim Norwegia-Rusia di 71°00''N 30°00''E utara sepanjang 30°00''E ke 90°00''N 30°00''E, ke 90°00''N 35°00''W, selatan sepanjang 35°00''W ke pantai Greenland.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[11.6667, 65.0], [-5.0, 65.0], [-5.0, 75.0], [-17.5, 75.0], [-35.0, 66.5], [-35.0, 89.0], [30.0, 89.0], [30.0, 71.0], [31.7, 70.37], [31.1, 69.98], [30.82, 69.8], [25.0, 71.0], [18.0, 69.0], [11.6667, 65.0]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA XX',
    20,
    'NAVAREA XX (Arctic / Barents East & Kara Sea)',
    'Russian Federation',
    'Department of Navigation and Oceanography (DNO)',
    'Arctic Ocean (Barents Sea East, Kara Sea, Laptev Sea West)',
    '#c4b5fd',
    'Samudra Arktik sektor Rusia Barat: dari batas perairan maritim Norwegia-Rusia di 71°00''N 30°00''E utara sepanjang meridian 30°00''E ke Kutub Utara (90°00''N), lalu sepanjang 90°00''N ke 125°00''E, dan selatan sepanjang meridian 125°00''E ke garis pantai daratan Rusia.',
    'Iridium SafetyCast, Murmansk / Dikson NAVTEX',
    'Dari titik perbatasan maritim Norwegia/Rusia di 71°00''N 30°00''E utara sepanjang 30°00''E ke 90°00''N, timur sepanjang 90°00''N ke 125°00''E, selatan sepanjang meridian 125°00''E ke pantai daratan Rusia, lalu menyusuri pantai ke barat.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Polygon", "coordinates": [[[30.82, 69.8], [31.1, 69.98], [31.7, 70.37], [30.0, 71.0], [30.0, 89.0], [125.0, 89.0], [125.0, 73.0], [105.0, 77.0], [80.0, 73.0], [60.0, 70.0], [45.0, 68.0], [30.82, 69.8]]]}'), 4326)
);

INSERT INTO navareas (navarea_code, navarea_number, name, coordinator_country, coordinator_authority, ocean_region, color, description, broadcast_system, boundaries_text, geom)
VALUES (
    'NAVAREA XXI',
    21,
    'NAVAREA XXI (Arctic / East Siberian & Chukchi Seas)',
    'Russian Federation',
    'Department of Navigation and Oceanography (DNO)',
    'Arctic Ocean (Laptev Sea East, East Siberian Sea, Chukchi Sea West)',
    '#f472b6',
    'Samudra Arktik sektor Rusia Timur: dari garis pantai daratan Rusia di meridian 125°00''E utara sepanjang 125°00''E ke Kutub Utara (90°00''N), lalu ke 90°00''N 168°58''W, selatan sepanjang 168°58''W ke 67°00''N di Selat Bering, lalu barat sepanjang paralel 67°00''N ke pantai Rusia.',
    'Iridium SafetyCast, Pevek / Tiksi Coast Radio NAVTEX',
    'Dari pantai Rusia di 125°00''E utara ke 90°00''N 125°00''E, ke 90°00''N 168°58''W, selatan sepanjang 168°58''W ke 67°00''N, barat sepanjang 67°00''N ke pantai daratan Rusia.',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type": "MultiPolygon", "coordinates": [[[[125.0, 73.0], [125.0, 89.0], [180.0, 89.0], [180.0, 67.0], [160.0, 70.0], [140.0, 72.0], [125.0, 73.0]]], [[[-180.0, 89.0], [-168.967, 89.0], [-168.967, 67.0], [-180.0, 67.0], [-180.0, 89.0]]]]}'), 4326)
);

-- -------------------------------------------------------------------------
-- USEFUL SPATIAL QUERY EXAMPLES (PostGIS)
-- -------------------------------------------------------------------------

-- 1. Identify which NAVAREA a vessel is currently in based on GPS coordinates:
-- Example coordinates: Selat Malaka / Malacca Strait (Lat: 3.25 N, Lon: 100.5 E)
SELECT 
    navarea_code, 
    name, 
    coordinator_country, 
    coordinator_authority, 
    broadcast_system
FROM navareas
WHERE ST_Contains(geom, ST_SetSRID(ST_Point(100.5, 3.25), 4326));

-- 2. Find nearby NAVAREAs within a buffer distance (e.g., 50 nautical miles = ~92600m):
SELECT 
    navarea_code, 
    coordinator_country,
    ST_Distance(geom::geography, ST_SetSRID(ST_Point(100.5, 3.25), 4326)::geography) / 1852.0 AS distance_nm
FROM navareas
ORDER BY distance_nm ASC
LIMIT 3;
