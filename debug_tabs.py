import json

with open('full_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

tab_keys = [k for k in data.keys() if k.startswith('33.') or k.startswith('32.')]

with open('debug_out.txt', 'w', encoding='utf-8') as out:
    for k in tab_keys:
        out.write(f'\n--- TAB: {k} ---\n')
        for i, row in enumerate(data[k][:6]):
            out.write(f'Row {i}: {json.dumps(row, ensure_ascii=False)}\n')
