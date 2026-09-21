with open("demo_dash.html", "r", encoding="utf-16") as f:
    html = f.read()
import re
scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
if scripts:
    print(scripts[-1][:500])
