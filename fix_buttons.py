with open("runner_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

# Find the tab container block
idx1 = demo.find('<button class="nav-btn" onclick="switchTab(\'rentroll\', this)">')
if idx1 != -1:
    idx2 = demo.find('</div>', idx1)
    if idx2 != -1:
        new_buttons = """
            <button class="nav-btn" onclick="switchTab('marathon', this)">🏃 러너 뷰</button>
            <button class="nav-btn" onclick="switchTab('map', this)">🗺 지도 뷰</button>
"""
        demo = demo[:idx2] + new_buttons + demo[idx2:]
        
with open("runner_demo.html", "w", encoding="utf-8") as f:
    f.write(demo)
print("Added buttons")
