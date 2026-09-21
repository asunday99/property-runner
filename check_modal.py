with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

print("Modal exists:", 'id="modal"' in demo)
modal_idx = demo.find('id="modal"')
tab_idx = demo.find('id="tab-dashboard"')

print(f"Modal idx: {modal_idx}")
print(f"Tab-dashboard idx: {tab_idx}")
