import re
with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()
print(re.findall(r'<div id="([^"]+)"', html)[:20])
