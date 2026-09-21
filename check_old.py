try:
    with open("old_dash.html", "r", encoding="utf-16") as f:
        html = f.read()
        print(f"old_dash.html: length {len(html)}, has Chart: {'Chart.js' in html or 'chart' in html}")
except Exception as e:
    print(f"Error: {e}")
