with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

idx = html.find('<div id="view-marathon"')
open_divs = 0
end_idx = -1
for i in range(idx, len(html)):
    if html[i:i+4] == '<div': open_divs += 1
    elif html[i:i+5] == '</div':
        open_divs -= 1
        if open_divs == 0:
            end_idx = i + 6
            break
print("Length of extracted view-marathon:", end_idx - idx)
if 'id="runners-area"' in html[idx:end_idx]:
    print("Contains runners-area")
else:
    print("DOES NOT contain runners-area")
