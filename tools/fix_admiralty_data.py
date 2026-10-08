#!/usr/bin/env python3
"""
Fix Admiralty data:
1. Fix Sailing Directions: rename codes (remove B suffix, fix descriptions)
2. Fix ALRS: merge sub-parts into single NP features (NP281, NP282, ... NP286)
3. Output updated JSON files
"""

import json
import re
import os

DESKTOP_DIR = r"C:\Users\C WIJAYA\Desktop\Admiralty_MapData"
REPO_DIR    = r"C:\Users\C WIJAYA\.gemini\antigravity\scratch\navigation-repo"

# ─── Canonical NP list from user ───────────────────────────────────────────
CANONICAL_NP = [
    "NP1","NP2","NP3","NP4","NP5","NP6","NP7","NP7A","NP8","NP9",
    "NP10","NP11","NP12","NP13","NP14","NP15","NP18","NP19","NP20",
    "NP21","NP22","NP23","NP24","NP25","NP26","NP27","NP28","NP30",
    "NP31","NP32A","NP32B","NP33","NP34","NP35","NP36","NP37","NP38",
    "NP39","NP40","NP41","NP42A","NP42B","NP43","NP44","NP45","NP46",
    "NP47","NP48","NP49","NP50","NP51","NP52","NP54","NP55","NP56",
    "NP57A","NP57B","NP58A","NP58B","NP59","NP60","NP61","NP62","NP63",
    "NP64","NP65","NP66","NP67","NP68","NP69","NP69A","NP70","NP71",
    "NP72","NP73","NP74"
]
canonical_set = set(CANONICAL_NP)

# ─── Clean description strings (remove control chars / garbage) ─────────────
def clean_str(s):
    if not s:
        return s
    # Remove non-printable ASCII control chars except normal whitespace
    s = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', s)
    s = s.strip()
    return s

# ─── Clean all string properties in a feature ──────────────────────────────
def clean_feature_props(props):
    for k, v in props.items():
        if isinstance(v, str):
            props[k] = clean_str(v)
    return props

# ─── Description mapping for known pilot books ─────────────────────────────
KNOWN_SD_DESCRIPTIONS = {
    "NP1":  "Africa, Vol 1",
    "NP2":  "Africa, Vol 2",
    "NP3":  "Africa, Vol 3",
    "NP4":  "South-East Alaska",
    "NP5":  "South America, Vol 1",
    "NP6":  "South America, Vol 2",
    "NP7":  "South America, Vol 3",
    "NP7A": "South America, Vol 4",
    "NP8":  "Pacific Central America & USA",
    "NP9":  "The Antarctic",
    "NP10": "Arctic, Vol 1",
    "NP11": "Arctic, Vol 2",
    "NP12": "Arctic, Vol 3",
    "NP13": "Australia, Vol 1",
    "NP14": "Australia, Vol 2",
    "NP15": "Australia, Vol 3",
    "NP18": "Baltic, Vol 1",
    "NP19": "Baltic, Vol 2",
    "NP20": "Baltic, Vol 3",
    "NP21": "Bay of Bengal",
    "NP22": "Bay of Biscay",
    "NP23": "Bering Sea and Strait",
    "NP24": "Black Sea and Sea of Azov",
    "NP25": "British Columbia, Vol 1",
    "NP26": "British Columbia, Vol 2",
    "NP27": "Channel",
    "NP28": "Dover Strait",
    "NP30": "China Sea, Vol 1",
    "NP31": "China Sea, Vol 2",
    "NP32A":"East China Sea",
    "NP32B":"Yellow Sea",
    "NP33": "Philippine Islands",
    "NP34": "Indonesia, Vol 2",
    "NP35": "Indonesia, Vol 3",
    "NP36": "Indonesia, Vol 1",
    "NP37": "West Coast of England & Wales",
    "NP38": "West Coast of India",
    "NP39": "South Indian Ocean",
    "NP40": "Irish Coast",
    "NP41": "Japan, Vol 1",
    "NP42A":"Japan, Vol 2",
    "NP42B":"Japan, Vol 3",
    "NP43": "Korea, Siberia & Sea of Okhotsk",
    "NP44": "Malacca Strait & Sumatera",
    "NP45": "Mediterranean, Vol 1",
    "NP46": "Mediterranean, Vol 2",
    "NP47": "Mediterranean, Vol 3",
    "NP48": "Mediterranean, Vol 4",
    "NP49": "Mediterranean, Vol 5",
    "NP50": "Newfoundland and Labrador",
    "NP51": "New Zealand",
    "NP52": "North Coast of Scotland",
    "NP54": "North Sea (West)",
    "NP55": "North Sea (East)",
    "NP56": "Norway, Vol 1",
    "NP57A":"Norway, Vol 2A",
    "NP57B":"Norway, Vol 2B",
    "NP58A":"Norway, Vol 3A",
    "NP58B":"Norway, Vol 3B",
    "NP59": "Nova Scotia and Bay of Fundy",
    "NP60": "Pacific Islands, Vol 1",
    "NP61": "Pacific Islands, Vol 2",
    "NP62": "Pacific Islands, Vol 3",
    "NP63": "Persian Gulf",
    "NP64": "Red Sea and Gulf of Aden",
    "NP65": "St. Lawrence",
    "NP66": "West and North-West Coast of Scotland",
    "NP67": "West Spain and Portugal",
    "NP68": "East Coast United States, Vol 1",
    "NP69": "East Coast United States, Vol 2",
    "NP69A":"Central America & Gulf of Mexico",
    "NP70": "West Indies, Vol 1",
    "NP71": "West Indies, Vol 2",
    "NP72": "South Barents Sea & Beloye More",
    "NP73": "Malacca and Sumatera",
    "NP74": "Arctic Ocean",
}

# ─── Map old code → canonical code ─────────────────────────────────────────
def normalize_sd_code(old_code):
    # Already canonical
    if old_code in canonical_set:
        return old_code
    # Remove trailing 'B' suffix (NP10B -> NP10, NP13B -> NP13 etc)
    m = re.match(r'^(NP\d+[AB]?)B$', old_code)
    if m:
        candidate = m.group(1)
        if candidate in canonical_set:
            return candidate
    # NP66A/NP66B → NP66
    if old_code in ('NP66A', 'NP66B'):
        return 'NP66'
    # NP69B → NP69
    if old_code == 'NP69B':
        return 'NP69'
    # NP42C → NP42B (closest in user list)
    if old_code == 'NP42C':
        return 'NP42B'
    return old_code  # keep as-is if no mapping

# ─── Fix Sailing Directions JSON ────────────────────────────────────────────
def fix_sailing_directions():
    path = os.path.join(DESKTOP_DIR, 'admiralty_sailing_directions.json')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    seen_codes = set()
    new_features = []
    for feat in data['features']:
        props = feat.get('properties', {})
        old_code = props.get('code', '')
        new_code = normalize_sd_code(old_code)
        
        # Skip codes not in canonical list (e.g. NP42C already mapped to NP42B)
        # But we still keep features whose new_code is canonical
        
        # Skip duplicate feature for same code (keep first occurrence)
        # Actually we want to keep all polygon features for each code;
        # just update the code/name/title/description
        
        props['code'] = new_code
        props['name'] = new_code
        
        # Fix description
        desc = KNOWN_SD_DESCRIPTIONS.get(new_code, clean_str(props.get('description', '')))
        props['description'] = desc
        props['title'] = f"{new_code} - Pilot: {desc}"
        
        # Update id to remove trailing B
        if 'id' in props:
            props['id'] = re.sub(r'_[Bb]_', '_', props['id'])
        
        # Clean all strings
        clean_feature_props(props)
        feat['properties'] = props
        new_features.append(feat)
    
    data['features'] = new_features
    
    # Save
    out_path = os.path.join(DESKTOP_DIR, 'admiralty_sailing_directions.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f"SD fixed: {len(new_features)} features -> {out_path}")
    return data

# ─── ALRS description mapping ───────────────────────────────────────────────
ALRS_DESCRIPTIONS = {
    "NP281": "Maritime Radio Stations",
    "NP282": "Radio Navigational Aids (Atlantic & Indian Oceans)",
    "NP283": "Radio Weather Services",
    "NP284": "Meteorological Observation Stations",
    "NP285": "Global Maritime Distress and Safety System (GMDSS)",
    "NP286": "Pilot Services, VTS & Port Operations",
}

# ─── Fix ALRS JSON: merge parts into single NP features ────────────────────
def fix_alrs():
    path = os.path.join(DESKTOP_DIR, 'admiralty_radio_signals_alrs.json')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Group features by root NP code (NP281, NP282, ... NP286)
    groups = {}
    for feat in data['features']:
        props = feat.get('properties', {})
        code = props.get('code', '')
        # Extract root: NP281(1) -> NP281
        m = re.match(r'^(NP\d+)', code)
        root = m.group(1) if m else code
        if root not in groups:
            groups[root] = []
        groups[root].append(feat)

    new_features = []
    for root_code in sorted(groups.keys()):
        feats = groups[root_code]
        desc = ALRS_DESCRIPTIONS.get(root_code, f"Radio Signals {root_code}")
        
        # If only one polygon part, use it directly
        # If multiple parts, create one MultiPolygon feature
        polygons_coords = []
        for feat in feats:
            geom = feat.get('geometry', {})
            geom_type = geom.get('type', '')
            coords = geom.get('coordinates', [])
            if geom_type == 'Polygon':
                polygons_coords.append(coords)
            elif geom_type == 'MultiPolygon':
                polygons_coords.extend(coords)
        
        # Get bbox from first feature
        first_props = feats[0].get('properties', {})
        all_lons = []
        all_lats = []
        for feat in feats:
            bb = feat.get('properties', {}).get('bbox')
            if bb and len(bb) == 4:
                all_lons += [bb[0], bb[2]]
                all_lats += [bb[1], bb[3]]
        
        merged_bbox = [min(all_lons), min(all_lats), max(all_lons), max(all_lats)] if all_lons else first_props.get('bbox')
        
        if len(polygons_coords) == 1:
            geometry = {"type": "Polygon", "coordinates": polygons_coords[0]}
        else:
            geometry = {"type": "MultiPolygon", "coordinates": polygons_coords}
        
        new_feat = {
            "type": "Feature",
            "properties": {
                "id": f"ALRS_{root_code}",
                "name": root_code,
                "code": root_code,
                "title": f"{root_code} - {desc}",
                "description": desc,
                "category": "Admiralty List of Radio Signals (ALRS)",
                "group": "Admiralty Publications",
                "bbox": merged_bbox
            },
            "geometry": geometry
        }
        new_features.append(new_feat)
    
    data['features'] = new_features
    
    out_path = os.path.join(DESKTOP_DIR, 'admiralty_radio_signals_alrs.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f"ALRS fixed: {len(new_features)} features -> {out_path}")
    return data

# ─── Update admiralty_data.js (replace SD + ALRS sections inline) ──────────
def update_admiralty_data_js(sd_data, alrs_data):
    js_path = os.path.join(DESKTOP_DIR, 'admiralty_data.js')
    print(f"Reading {js_path} ...")
    with open(js_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract the JSON from window.ADMIRALTY_DATA = { ... }
    # The file starts with: window.ADMIRALTY_DATA={"type":"FeatureCollection","features":[...]}
    m = re.match(r'^window\.ADMIRALTY_DATA\s*=\s*', content)
    if not m:
        print("ERROR: Could not find window.ADMIRALTY_DATA= in file")
        return

    json_str = content[m.end():]
    # Remove trailing semicolon if any
    json_str = json_str.rstrip().rstrip(';')
    
    print("Parsing admiralty_data.js JSON...")
    try:
        fc = json.loads(json_str)
    except Exception as e:
        print(f"Parse error: {e}")
        return
    
    features = fc.get('features', [])
    print(f"Total features in admiralty_data.js: {len(features)}")
    
    # Remove existing SD and ALRS features
    SD_CAT  = "Sailing Directions (Admiralty Pilots)"
    ALRS_CAT = "Admiralty List of Radio Signals (ALRS)"
    
    kept = [f for f in features 
            if f.get('properties', {}).get('category') not in (SD_CAT, ALRS_CAT)]
    print(f"Features after removing SD+ALRS: {len(kept)}")
    
    # Add fixed SD features
    sd_feats  = sd_data.get('features', [])
    alrs_feats = alrs_data.get('features', [])
    
    all_features = kept + sd_feats + alrs_feats
    fc['features'] = all_features
    print(f"Total features after merge: {len(all_features)}")
    
    new_json = json.dumps(fc, ensure_ascii=False, separators=(',', ':'))
    new_content = f"window.ADMIRALTY_DATA={new_json};"
    
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"admiralty_data.js updated -> {js_path}")
    
    # Also copy to repo
    repo_js = os.path.join(REPO_DIR, 'admiralty_data.js')
    with open(repo_js, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"admiralty_data.js copied -> {repo_js}")

if __name__ == '__main__':
    print("=== Step 1: Fix Sailing Directions ===")
    sd_data = fix_sailing_directions()
    
    print("\n=== Step 2: Fix ALRS ===")
    alrs_data = fix_alrs()
    
    print("\n=== Step 3: Update admiralty_data.js ===")
    update_admiralty_data_js(sd_data, alrs_data)
    
    # Copy fixed JSONs to repo too
    import shutil
    for fname in ['admiralty_sailing_directions.json', 'admiralty_radio_signals_alrs.json']:
        src = os.path.join(DESKTOP_DIR, fname)
        dst = os.path.join(REPO_DIR, fname)
        shutil.copy2(src, dst)
        print(f"Copied {fname} to repo")
    
    print("\nDone.")
