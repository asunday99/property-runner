with open("index_beta.html", "r", encoding="utf-8") as f:
    html = f.read()
import re
scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print("Scripts count:", len(scripts))
