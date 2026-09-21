with open("index_beta.html", "r", encoding="utf-8") as f:
    html = f.read()
import re
scripts = re.findall(r'<script.*?</script>', html, re.DOTALL)
print(f"Total script blocks: {len(scripts)}")
for i, s in enumerate(scripts):
    print(f"Script {i} length: {len(s)}")
    
with open("test_beta.js", "w", encoding="utf-8") as f:
    f.write(scripts[-1].replace('<script>', '').replace('</script>', ''))
