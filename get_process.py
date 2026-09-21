with open('dashboard.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
match = re.search(r'function processGASData\(gasData\).*?(?=function )', html, re.DOTALL)
if match:
    with open('process_logic.js', 'w', encoding='utf-8') as sf:
        sf.write(match.group(0))
