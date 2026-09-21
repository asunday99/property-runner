with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

idx = html.find('<div id="view-marathon"')
end_idx = html.find('<div id="view-map"')
print(html[idx:idx+150])
print("...")
print(html[end_idx-150:end_idx+50])
