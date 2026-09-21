with open("index.html", "r", encoding="utf-8") as f:
    runner = f.read()
import re
scripts = re.findall(r'<script.*?>\s*(.*?)</script>', runner, re.DOTALL)
print("Scripts count:", len(scripts))
for i, s in enumerate(scripts):
    print(f"Script {i} length:", len(s))
    if 'CSV_URL' in s:
        print(f"CSV_URL found in script {i}")
