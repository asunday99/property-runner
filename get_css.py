import re
with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()
css = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
if css:
    print(css.group(1)[:500])
