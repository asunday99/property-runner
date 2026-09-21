import re

with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

if 'chart.js' not in html.lower():
    html = html.replace('</head>', '    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n</head>')
    with open('index_beta.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Added Chart.js")
else:
    print("Chart.js already present")
