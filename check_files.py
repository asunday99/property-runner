import os
for file in ["dashboard.html", "old_dash.html", "test_dash.html"]:
    if not os.path.exists(file): continue
    with open(file, "r", encoding="utf-8") as f:
        html = f.read()
    if "매입부동산" in html or "매물" in html:
        print(f"{file} contains 매입부동산/매물")
