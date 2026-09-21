import re
with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()
m = re.search(r'<div id="tab-investor".*?</div>\s*</div>\s*</div>', html, re.DOTALL)
if m:
    print(m.group(0)[:500])
