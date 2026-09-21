with open('dashboard.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
m = re.search(r'<!-- 2. INVESTOR TAB -->.*?<!-- 3. RENTROLL TAB -->', html, re.DOTALL)
if m:
    with open('investor_html.txt', 'w', encoding='utf-8') as sf:
        sf.write(m.group(0))
