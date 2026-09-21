with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()
import re
scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
with open("dashboard_js.txt", "w", encoding="utf-8") as f:
    if scripts:
        f.write(scripts[-1])
