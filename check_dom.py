with open('index_beta.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'id="view-marathon"' in line or 'id="view-dashboard"' in line or 'id="view-properties"' in line:
        print(f"Line {i}: {line.strip()}")
