with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

idx = demo.find('<div id="modal"')
end_idx = demo.find('</div>\n    </div>\n    </div>', idx)
print(demo[idx:end_idx+30])
