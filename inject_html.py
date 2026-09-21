import json, re

with open('merge_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace view-dashboard
html = re.sub(r'<div id="view-dashboard".*?</div>', data['inv'], html, count=1, flags=re.DOTALL)

# Replace view-rentroll
html = re.sub(r'<div id="view-rentroll".*?</div>', data['rent'], html, count=1, flags=re.DOTALL)

# Insert modal before closing body
html = html.replace('</body>', data['modal'] + '\n</body>')

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Injected HTML components.")
