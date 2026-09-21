with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

idx = demo.find('<div id="modal"')
open_divs = 0
end_idx = -1
for i in range(idx, len(demo)):
    if demo[i:i+4] == '<div': open_divs += 1
    elif demo[i:i+5] == '</div':
        open_divs -= 1
        if open_divs == 0:
            end_idx = i + 6
            break
print(demo[idx:end_idx][:300])
