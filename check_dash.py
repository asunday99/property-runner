import os
for file in ["dashboard.html", "old_dash.html", "test_dash.html"]:
    if not os.path.exists(file): continue
    try:
        with open(file, "r", encoding="utf-8") as f:
            html = f.read()
            print(f"{file}: length {len(html)}, has Chart: {'Chart.js' in html or 'chart' in html}")
    except Exception as e:
        print(f"Error reading {file}: {e}")
