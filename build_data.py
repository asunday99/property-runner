import os
import glob
import pandas as pd
import json

downloads_dir = r'C:\Users\GOMIHOUSE\Downloads'
files = [f for f in glob.glob(os.path.join(downloads_dir, '*.xlsx')) if not os.path.basename(f).startswith('~$')]
latest = max(files, key=os.path.getctime)

try:
    df_prop = pd.read_excel(latest, sheet_name='매입부동산', header=1)
    df_rent = pd.read_excel(latest, sheet_name='RentRoll', header=1)
    
    # 1. Properties Analysis
    # Clean numeric columns
    for col in ['현재시세/매각금액', '실투자금', '미래가치', '월임대수익\\n(부가세포함)']:
        if col in df_prop.columns:
            df_prop[col] = pd.to_numeric(df_prop[col], errors='coerce').fillna(0)
            
    total_value = float(df_prop['현재시세/매각금액'].sum())
    total_invest = float(df_prop['실투자금'].sum())
    total_future = float(df_prop['미래가치'].sum())
    
    # Asset Types
    asset_types = df_prop.groupby('유형')['현재시세/매각금액'].sum().to_dict()
    # Normalize percentages
    type_pct = {k: (v/total_value * 100) if total_value > 0 else 0 for k, v in asset_types.items() if v > 0}
    
    # 2. RentRoll Analysis
    df_rent['D-Day'] = pd.to_numeric(df_rent['D-Day'], errors='coerce')
    warnings_df = df_rent[(df_rent['D-Day'] <= 180) & (df_rent['D-Day'] >= -365)].copy()
    warnings_df = warnings_df.sort_values('D-Day', ascending=True)
    
    warnings = []
    for _, row in warnings_df.iterrows():
        bldg = str(row.get('건물명', ''))
        room = str(row.get('호수', ''))
        dday = int(row['D-Day'])
        warnings.append({
            'name': f'{bldg} {room}호',
            'dday': dday
        })
        
    # Output structure
    out = {
        'metrics': {
            'total_value': total_value,
            'total_invest': total_invest,
            'total_future': total_future
        },
        'asset_allocation': type_pct,
        'warnings': warnings
    }
    
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(f'window.dashboardData = {json.dumps(out, ensure_ascii=False, indent=2)};\n')
    print('Data extraction successful.')
    
except Exception as e:
    print(f'Error: {e}')
