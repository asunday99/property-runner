import os, glob, json
import pandas as pd

downloads_dir = r'C:\Users\GOMIHOUSE\Downloads'
files = [f for f in glob.glob(os.path.join(downloads_dir, '*.xlsx')) if not os.path.basename(f).startswith('~$')]
latest = max(files, key=os.path.getctime)

df_prop = pd.read_excel(latest, sheet_name='매입부동산', header=1)
df_rent = pd.read_excel(latest, sheet_name='RentRoll', header=1)

props = []
for _, row in df_prop.iterrows():
    owner = str(row.get('소유주', '')).strip()
    if owner == 'nan' or not owner: continue
    props.append({
        'id': str(row.get('자산ID', '')),
        'owner': owner,
        'type': str(row.get('유형', '')),
        'value': float(pd.to_numeric(row.get('현재시세/매각금액', 0), errors='coerce') or 0),
        'invest': float(pd.to_numeric(row.get('실투자금', 0), errors='coerce') or 0),
        'future': float(pd.to_numeric(row.get('미래가치', 0), errors='coerce') or 0),
        'name': str(row.get('주소', ''))
    })

rents = []
for _, row in df_rent.iterrows():
    dday = pd.to_numeric(row.get('D-Day', 0), errors='coerce')
    if pd.isna(dday) or dday > 180 or dday < -365: continue
    rents.append({
        'id': str(row.get('자산ID', '')),
        'bldg': str(row.get('건물명', '')),
        'room': str(row.get('호수', '')),
        'tenant': str(row.get('임차인명', '')),
        'deposit': float(pd.to_numeric(row.get('보증금', 0), errors='coerce') or 0),
        'rent': float(pd.to_numeric(row.get('월세', 0), errors='coerce') or 0),
        'dday': int(dday)
    })

prop_owner_map = {p['id']: p['owner'] for p in props}
for r in rents:
    r['owner'] = prop_owner_map.get(r['id'], '알수없음')

out = {
    'properties': props,
    'warnings': sorted(rents, key=lambda x: x['dday']),
    'owners': sorted(list(set([p['owner'] for p in props])))
}

with open('raw_data.json', 'w', encoding='utf-8') as f:
    f.write(json.dumps(out, ensure_ascii=False))
