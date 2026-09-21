import re
with open("index.html", "r", encoding="utf-8") as f:
    runner = f.read()
match = re.search(r'<div id="view-marathon".*?>.*?</div>\s*</div>', runner, re.DOTALL)
extracted = match.group(0) if match else ""
print("Regex extracted length:", len(extracted))
print("Ends with:", extracted[-50:])
