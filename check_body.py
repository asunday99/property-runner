with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()
import re
# find all scripts
scripts = re.findall(r'<script.*?</script>', demo, re.DOTALL)
last_script = scripts[-1] if scripts else ""
# body inner html without the last script
body_inner = re.search(r'<body[^>]*>(.*?)</body>', demo, re.DOTALL).group(1)
body_inner = body_inner.replace(last_script, "")

print(body_inner[:200])
print(body_inner[-200:])
