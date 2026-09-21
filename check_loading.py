with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

print("showLoading in index:", html.find("showLoading"))
