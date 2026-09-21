import os, glob, json, math
import pandas as pd

downloads_dir = r'C:\Users\GOMIHOUSE\Downloads'
files = [f for f in glob.glob(os.path.join(downloads_dir, '*.xlsx')) if not os.path.basename(f).startswith('~$')]
latest = max(files, key=os.path.getctime)

df_prop = pd.read_excel(latest, sheet_name='매입부동산', header=1)
df_rent = pd.read_excel(latest, sheet_name='RentRoll', header=1)
try:
    df_debt = pd.read_excel(latest, sheet_name='부채관리', header=1)
except:
    df_debt = pd.DataFrame()
try:
    df_flow = pd.read_excel(latest, sheet_name='자산흐름 및 관리', header=None)
except:
    df_flow = pd.DataFrame()

def safe_str(val):
    if pd.isna(val): return ""
    return str(val).strip()

def safe_float(val):
    try:
        res = float(pd.to_numeric(val, errors='coerce'))
        return res if not math.isnan(res) else 0.0
    except:
        return 0.0

all_props = []
for _, row in df_prop.iterrows():
    owner = safe_str(row.get('소유주', ''))
    if not owner or owner == 'nan': continue
    memo_parts = []
    if safe_str(row.get('비고')): memo_parts.append(safe_str(row.get('비고')))
    if safe_str(row.get('아파트 분양 받을 명의자 (8명)')): memo_parts.append("분양: " + safe_str(row.get('아파트 분양 받을 명의자 (8명)')))
    all_props.append({
        'id': safe_str(row.get('자산ID')),
        'owner': owner,
        'type': safe_str(row.get('유형')),
        'value': safe_float(row.get('현재시세/매각금액')),
        'invest': safe_float(row.get('실투자금')),
        'future': safe_float(row.get('미래가치')),
        'name': safe_str(row.get('주소')),
        'buy_date': safe_str(row.get('취득일')),
        'buy_price': safe_float(row.get('취득가\n(세금포함)')),
        'status': safe_str(row.get('상태')),
        'dev_stage': safe_str(row.get('개발 진행단계')),
        'exit_strategy': safe_str(row.get('매도/보유 전략')),
        'tax_note': safe_str(row.get('비과세적용')),
        'memo': " / ".join(memo_parts)
    })
active_props = [p for p in all_props if '매각완료' not in p['status']]
sold_props = [p for p in all_props if '매각완료' in p['status']]
for p in sold_props:
    profit = p['value'] - p['invest']
    p['roi'] = (profit / p['invest'] * 100) if p['invest'] > 0 else 0
dev_alerts = []
for p in active_props:
    if '조합' in p['dev_stage'] or '관리처분' in p['dev_stage'] or '조합' in p['exit_strategy'] or '관리처분' in p['exit_strategy']:
        dev_alerts.append(p)
rents = []
for _, row in df_rent.iterrows():
    bldg = safe_str(row.get('건물명'))
    if not bldg or bldg == 'nan': continue
    dday = safe_float(row.get('D-Day'))
    rents.append({
        'id': safe_str(row.get('자산ID')),
        'bldg': bldg,
        'room': safe_str(row.get('호수')),
        'tenant': safe_str(row.get('임차인명')),
        'deposit': safe_float(row.get('보증금')),
        'rent': safe_float(row.get('월세')),
        'dday': int(dday) if dday != 0 else 9999,
        'end_date': safe_str(row.get('계약종료일'))
    })
prop_owner_map = {p['id']: p['owner'] for p in all_props}
for r in rents:
    r['owner'] = prop_owner_map.get(r['id'], '기타')
debts = []
if not df_debt.empty and '차주' in df_debt.columns:
    for _, row in df_debt.iterrows():
        borrower = safe_str(row.get('차주'))
        if not borrower or borrower == 'nan': continue
        debts.append({
            'borrower': borrower,
            'principal': safe_float(row.get('차용금')),
            'monthly_interest': safe_float(row.get('월이자비용'))
        })
flows = []
if not df_flow.empty:
    for col_idx in range(len(df_flow.columns)):
        col_data = df_flow.iloc[:, col_idx].dropna().astype(str).tolist()
        for i, cell in enumerate(col_data):
            if '흐름' in cell:
                items = col_data[i+1:i+6]
                clean_items = [x for x in items if len(x) > 2 and '금액' not in x and '날짜' not in x]
                if clean_items:
                    flows.append({'title': cell, 'items': clean_items})

out_data = {
    'properties': active_props,
    'sold_properties': sold_props,
    'dev_alerts': dev_alerts,
    'flows': flows,
    'rents': rents,
    'debts': debts,
    'owners': sorted(list(set([p['owner'] for p in all_props])))
}
json_str = json.dumps(out_data, ensure_ascii=True)
