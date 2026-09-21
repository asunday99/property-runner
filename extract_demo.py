with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

import re

# 1. Extract CSS
css = re.search(r'<style>(.*?)</style>', demo, re.DOTALL).group(1)

# 2. Extract Body Content (excluding scripts)
body_match = re.search(r'<body[^>]*>(.*?)<script', demo, re.DOTALL)
body_html = body_match.group(1).strip()

# 3. Extract JS
js = re.search(r'<script>(.*?)</script>', demo, re.DOTALL).group(1)

with open("demo_extracted.py", "w", encoding="utf-8") as f:
    f.write("Extracted successfully")
