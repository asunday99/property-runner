with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

idx = html.find('function renderMarathon')
print(html[idx:idx+400])
