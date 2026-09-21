with open("index_beta.html", "r", encoding="utf-8") as f:
    html = f.read()

import re
m1 = re.search(r'function switchTab\(mode\).*?\}', html, re.DOTALL)
if m1: print(m1.group(0))

m2 = re.search(r'const savedTab = localStorage\.getItem.*?switchTab.*?\}', html, re.DOTALL)
if m2: print(m2.group(0))
