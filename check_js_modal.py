with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

import re
scripts = re.findall(r'<script.*?>\s*(.*?)</script>', demo, re.DOTALL)
js = scripts[3] if len(scripts) > 3 else scripts[-1]

print("Mentions of modal:", "modal" in js)
for line in js.split("\n"):
    if "modal" in line:
        print(line.strip())
