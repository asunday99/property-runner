with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

print("loading id:", html.find('id="loading"'))
print("map id:", html.find('id="map"'))
print("toast id:", html.find('id="toast"'))
