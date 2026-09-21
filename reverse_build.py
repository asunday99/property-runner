import re

with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

with open("index.html", "r", encoding="utf-8") as f:
    runner = f.read()

# 1. Extract Runner CSS
runner_css = re.search(r'<style>(.*?)</style>', runner, re.DOTALL).group(1)
runner_css = runner_css.replace('body {', '/* body {') # Disable global body styling from runner
runner_css = runner_css.replace('background-color: #000000;', '*/') 
# Protect Kakao map from Tailwind
runner_css += "\n#tab-map img { max-width: none; }\n"

# 2. Extract Runner JS
runner_scripts = re.findall(r'<script>(.*?)</script>', runner, re.DOTALL)
runner_js = runner_scripts[-1] if runner_scripts else ""
# Remove the old switchTab from runner_js
runner_js = re.sub(r'function switchTab\(mode\)\s*\{.*?\n\s*\}\n\s*\}', '', runner_js, flags=re.DOTALL)

# 3. Extract Runner HTML
runner_html_marathon = re.search(r'<div id="view-marathon".*?>.*?</div>\s*</div>', runner, re.DOTALL).group(0)
# Make it fit the demo's tab content class
runner_html_marathon = runner_html_marathon.replace('id="view-marathon"', 'id="tab-marathon" class="tab-content" style="height: 80vh;"')

# 4. Modify Demo's Tabs to include Runner and Map
nav_match = re.search(r'<nav class="flex space-x-6 mb-8 border-b border-slate-700">.*?</nav>', demo, re.DOTALL)
if nav_match:
    old_nav = nav_match.group(0)
    new_nav = old_nav.replace('</nav>', """
            <button class="nav-btn flex items-center px-4 py-3" onclick="switchTab('marathon', this)">
                <span class="mr-2">🏃</span> 러너 뷰
            </button>
            <button class="nav-btn flex items-center px-4 py-3" onclick="switchTab('map', this)">
                <span class="mr-2">🗺</span> 지도 뷰
            </button>
        </nav>""")
    demo = demo.replace(old_nav, new_nav)

# 5. Insert Runner HTML into Demo body
# Find where tab-rentroll ends
rentroll_idx = demo.find('<div id="tab-rentroll"')
end_rentroll_idx = -1
if rentroll_idx != -1:
    open_divs = 0
    for i in range(rentroll_idx, len(demo)):
        if demo[i:i+4] == '<div': open_divs += 1
        elif demo[i:i+5] == '</div':
            open_divs -= 1
            if open_divs == 0:
                end_rentroll_idx = i + 6
                break

runner_tabs = f"""
        <!-- Runner App Tabs -->
        {runner_html_marathon}
        <div id="tab-map" class="tab-content" style="height: 80vh; width: 100%;"></div>
"""
if end_rentroll_idx != -1:
    demo = demo[:end_rentroll_idx] + runner_tabs + demo[end_rentroll_idx:]

# 6. Include PapaParse and Kakao Maps in Demo head
demo = demo.replace('<title>', """
    <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
    <script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=e7a68e0d6ba1812975c613ec1e65dbb2&libraries=services"></script>
    <title>""")

# 7. Merge JS and update switchTab logic in Demo
# In demo's switchTab:
demo_switch = """function switchTab(tabId, btnElement) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tabId).classList.add('active');
            
            document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
            btnElement.classList.add('active');
            
            if (tabId === 'dashboard') initDashboard();
            if (tabId === 'investor' && !window.invInit) initInvestorTab();
            if (tabId === 'rentroll' && !window.rentInit) initRentRollTab();
            
            if (tabId === 'map') {
                if (!window.mapInitialized) {
                    initKakaoMap();
                    window.mapInitialized = true;
                }
                setTimeout(() => {
                    if (typeof kakaoMap !== 'undefined' && kakaoMap) {
                        kakaoMap.relayout();
                        kakaoMap.setCenter(new kakao.maps.LatLng(37.5255, 126.9954));
                    }
                }, 100);
            }
        }"""
demo = re.sub(r'function switchTab\(tabId, btnElement\) \{.*?\n\s*\}\n\s*\}', demo_switch, demo, flags=re.DOTALL)

# Add runner CSS
demo = demo.replace('</style>', f"\n/* --- RUNNER CSS --- */\n{runner_css}\n</style>")

# Add runner JS
# Fix references to view-marathon and view-map inside runner JS
runner_js = runner_js.replace("document.getElementById('view-marathon')", "document.getElementById('tab-marathon')")
runner_js = runner_js.replace("document.getElementById('view-map')", "document.getElementById('tab-map')")
# Remove runner's DOMContentLoaded to prevent it from auto-fetching if we want, or keep it so data is ready when user clicks Marathon tab.
# We will keep it so it fetches in background.

demo = demo.replace('</body>', f"\n<script>\n/* --- RUNNER LOGIC --- */\n{runner_js}\n</script>\n</body>")

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(demo)
print("Reverse build complete.")
