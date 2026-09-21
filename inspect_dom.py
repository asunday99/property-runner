with open('index_beta.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines[:150]):
    if 'id=' in line or 'class=' in line or '<header' in line or '<nav' in line:
        print(f'{i}: {line.strip()}')
