import os
import sys
import struct
import json
import zipfile
import shutil

sys.stdout.reconfigure(encoding='utf-8')

DESKTOP_DIR = r"C:\Users\C WIJAYA\Desktop\Admiralty_MapData"
REPO_DIR = r"C:\Users\C WIJAYA\.gemini\antigravity\scratch\navigation-repo"
CAT_PATH = r"C:\Program Files (x86)\ADMIRALTY_Digital_Catalogue\catalogue\ENC Units.cat"

def to_deg(raw_int):
    deg = (raw_int * 180.0) / 2147483648.0
    if deg > 180.0:
        deg -= 360.0
    elif deg < -180.0:
        deg += 360.0
    return round(deg, 6)

BAND_FILES = [
    (1, "admiralty_enc_band1_overview", "ENC_BAND1_DATA"),
    (2, "admiralty_enc_band2_general", "ENC_BAND2_DATA"),
    (3, "admiralty_enc_band3_coastal", "ENC_BAND3_DATA"),
    (4, "admiralty_enc_band4_approach", "ENC_BAND4_DATA"),
    (5, "admiralty_enc_band5_harbour", "ENC_BAND5_DATA"),
    (6, "admiralty_enc_band6_berthing", "ENC_BAND6_DATA"),
]

def rebuild_bands():
    print(f"Opening catalogue: {CAT_PATH}...")
    zf = zipfile.ZipFile(CAT_PATH)
    
    all_bands_features = []
    bands_dict = {}
    
    for band_num, base_name, js_var in BAND_FILES:
        cb_name = f"ENC Units_{band_num}.7CB"
        print(f"\nProcessing Band {band_num} from {cb_name}...")
        data = zf.read(cb_name)
        vec_offset = struct.unpack('<I', data[0x90:0x94])[0]
        rec_count = struct.unpack('<I', data[0xAC:0xB0])[0]
        
        json_path = os.path.join(DESKTOP_DIR, f"{base_name}.json")
        with open(json_path, 'r', encoding='utf-8') as jf:
            geojson = json.load(jf)
            
        features = geojson['features']
        assert len(features) == rec_count, f"Feature count mismatch: {len(features)} vs {rec_count}"
        
        non_box_count = 0
        
        for idx in range(rec_count):
            off = vec_offset + idx * 60
            vals = struct.unpack('<15I', data[off:off+60])
            geom_ptr = vals[14] & 0x00ffffff
            words = struct.unpack('<16I', data[geom_ptr:geom_ptr+64])
            total_pts = words[11] & 0xffff
            start = words[5] + 4
            
            pts = []
            for j in range(total_pts):
                p_off = start + j * 8
                rlon, rlat = struct.unpack('<2i', data[p_off:p_off+8])
                lon = to_deg(rlon)
                lat = to_deg(rlat)
                pts.append([lon, lat])
                
            if len(pts) >= 3 and pts[0] != pts[-1]:
                pts.append(pts[0])
                
            if len(pts) != 5:
                non_box_count += 1
                
            min_lon = min(p[0] for p in pts)
            max_lon = max(p[0] for p in pts)
            min_lat = min(p[1] for p in pts)
            max_lat = max(p[1] for p in pts)
            bbox = [round(min_lon, 6), round(min_lat, 6), round(max_lon, 6), round(max_lat, 6)]
            
            feat = features[idx]
            feat['geometry'] = {
                'type': 'Polygon',
                'coordinates': [pts]
            }
            feat['properties']['bbox'] = bbox
            
        geojson['features'] = features
        bands_dict[f"band{band_num}"] = geojson
        all_bands_features.extend(features)
        
        print(f"  Band {band_num}: {rec_count} cells updated with true polygons ({non_box_count} non-rectangular/triangular/irregular)")
        
        # Save JSON
        with open(json_path, 'w', encoding='utf-8') as out_f:
            json.dump(geojson, out_f, ensure_ascii=False, separators=(',', ':'))
            
        # Save JS
        js_path = os.path.join(DESKTOP_DIR, f"{base_name}.js")
        with open(js_path, 'w', encoding='utf-8') as out_js:
            out_js.write(f"window.{js_var}=" + json.dumps(geojson, ensure_ascii=False, separators=(',', ':')) + ";\n")
            
        print(f"  Saved {base_name}.json ({os.path.getsize(json_path)/1024/1024:.2f} MB)")
        print(f"  Saved {base_name}.js ({os.path.getsize(js_path)/1024/1024:.2f} MB)")
        
    zf.close()
    
    # 2. Save admiralty_enc_all_bands.json
    all_bands_json_path = os.path.join(DESKTOP_DIR, "admiralty_enc_all_bands.json")
    all_bands_fc = {
        "type": "FeatureCollection",
        "metadata": {
            "title": "ADMIRALTY Vector Chart Service (AVCS) Complete ENC Dataset - All 6 Bands",
            "total_cells": len(all_bands_features)
        },
        "features": all_bands_features
    }
    with open(all_bands_json_path, 'w', encoding='utf-8') as f:
        json.dump(all_bands_fc, f, ensure_ascii=False, separators=(',', ':'))
    print(f"\nSaved admiralty_enc_all_bands.json ({os.path.getsize(all_bands_json_path)/1024/1024:.2f} MB)")
    
    # 3. Update admiralty_data.js and admiralty_digital_catalogue_unified.json
    # Must preserve publications (SD, ALRS, ALL, ADLL, ATT, Ports) and folios
    print("\nUpdating admiralty_data.js...")
    master_js_path = os.path.join(DESKTOP_DIR, "admiralty_data.js")
    with open(master_js_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    import re
    m = re.match(r'^window\.ADMIRALTY_DATA\s*=\s*(.*?);?\s*$', text, re.DOTALL)
    existing_master = json.loads(m.group(1))
    
    ENC_CATS = {
        'ENC Band 1 - Overview',
        'ENC Band 2 - General',
        'ENC Band 3 - Coastal',
        'ENC Band 4 - Approach',
        'ENC Band 5 - Harbour',
        'ENC Band 6 - Berthing'
    }
    
    # Keep non-ENC features (Folios, SDs, ALRS, ALL, ADLL, ATT, Ports)
    preserved_features = [f for f in existing_master['features'] if f.get('properties', {}).get('category') not in ENC_CATS]
    print(f"Preserved publications & folios: {len(preserved_features)} features")
    
    # In admiralty_data.js, we bundle bands 1, 2, and 3
    b1_features = bands_dict["band1"]["features"]
    b2_features = bands_dict["band2"]["features"]
    b3_features = bands_dict["band3"]["features"]
    
    new_master_features = preserved_features + b1_features + b2_features + b3_features
    print(f"Total features in updated admiralty_data.js: {len(new_master_features)}")
    
    existing_master['features'] = new_master_features
    
    with open(master_js_path, 'w', encoding='utf-8') as f:
        f.write("window.ADMIRALTY_DATA=" + json.dumps(existing_master, ensure_ascii=False, separators=(',', ':')) + ";\n")
    print(f"Saved {master_js_path} ({os.path.getsize(master_js_path)/1024/1024:.2f} MB)")
    
    # Update admiralty_digital_catalogue_unified.json
    unified_json_path = os.path.join(DESKTOP_DIR, "admiralty_digital_catalogue_unified.json")
    unified_all_features = preserved_features + all_bands_features
    with open(unified_json_path, 'w', encoding='utf-8') as f:
        json.dump({
            "type": "FeatureCollection",
            "metadata": {
                "title": "ADMIRALTY Digital Catalogue Master Unified Complete Dataset (All 6 Bands, Publications & Waypoints)",
                "total_features": len(unified_all_features)
            },
            "features": unified_all_features
        }, f, ensure_ascii=False, separators=(',', ':'))
    print(f"Saved {unified_json_path} ({os.path.getsize(unified_json_path)/1024/1024:.2f} MB)")
    
    # 4. Copy all updated files to git repo
    print("\nCopying updated files to navigation repository...")
    files_to_copy = [
        "admiralty_enc_band1_overview.json", "admiralty_enc_band1_overview.js",
        "admiralty_enc_band2_general.json", "admiralty_enc_band2_general.js",
        "admiralty_enc_band3_coastal.json", "admiralty_enc_band3_coastal.js",
        "admiralty_enc_band4_approach.json", "admiralty_enc_band4_approach.js",
        "admiralty_enc_band5_harbour.json", "admiralty_enc_band5_harbour.js",
        "admiralty_enc_band6_berthing.json", "admiralty_enc_band6_berthing.js",
        "admiralty_enc_all_bands.json",
        "admiralty_data.js",
        "admiralty_digital_catalogue_unified.json"
    ]
    
    for fn in files_to_copy:
        src = os.path.join(DESKTOP_DIR, fn)
        dst = os.path.join(REPO_DIR, fn)
        shutil.copy2(src, dst)
        print(f"  Copied {fn} -> repo ({os.path.getsize(dst)/1024/1024:.2f} MB)")
        
    print("\nAll files successfully rebuilt and synchronized!")

if __name__ == '__main__':
    rebuild_bands()
