with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()
import re
print(re.search(r'function processGASData\(gasData\)\s*\{.*?\}', html, re.DOTALL).group(0)[:500])
