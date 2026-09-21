with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

idx = html.find('CSV_URL')
print(html[idx-50:idx+200])
