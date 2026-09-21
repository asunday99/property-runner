import re
with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()

# Find render functions
funcs = re.findall(r'function\s+render[A-Za-z0-9_]+\s*\(.*?\)\s*{', html)
print("Render functions in dashboard:", funcs)
