import re

with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

with open("index.html", "r", encoding="utf-8") as f:
    runner = f.read()

# 1. CSS
runner_css = re.search(r'<style>(.*?)</style>', runner, re.DOTALL).group(1)
runner_css = re.sub(r'body\s*{[^}]+}', '', runner_css) # strip body
runner_css += "\n#tab-map img { max-width: none !important; }\n"

# 2. JS
runner_scripts = re.findall(r'<script>(.*?)</script>', runner, re.DOTALL)
runner_js = runner_scripts[-1]
# find function switchTab(mode) and remove it using braces parsing
idx = runner_js.find('function switchTab(mode)')
if idx != -1:
    open_braces = 0
    end_idx = -1
    started = False
    for i in range(idx, len(runner_js)):
        if runner_js[i] == '{':
            open_braces += 1
            started = True
        elif runner_js[i] == '}':
            open_braces -= 1
            if started and open_braces == 0:
                end_idx = i + 1
                break
    runner_js = runner_js[:idx] + runner_js[end_idx:]

runner_js = runner_js.replace("document.getElementById('view-marathon')", "document.getElementById('tab-marathon')")
runner_js = runner_js.replace("document.getElementById('view-map')", "document.getElementById('tab-map')")

# 3. HTML Marathon
runner_html_marathon = re.search(r'<div id="view-marathon".*?>.*?</div>\s*</div>', runner, re.DOTALL).group(0)
runner_html_marathon = runner_html_marathon.replace('id="view-marathon"', 'id="tab-marathon" class="tab-content" style="height: 80vh;"')

# 4. Modify Demo Tabs
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

# 5. Insert Runner HTML
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

# 6. Add Libraries
demo = demo.replace('<title>', """
    <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
    <script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=e7a68e0d6ba1812975c613ec1e65dbb2&libraries=services"></script>
    <title>""")

# 7. Modify Demo switchTab using Brace parsing
switch_idx = demo.find('function switchTab(tabId, btnElement)')
if switch_idx != -1:
    open_braces = 0
    end_idx = -1
    started = False
    for i in range(switch_idx, len(demo)):
        if demo[i] == '{':
            open_braces += 1
            started = True
        elif demo[i] == '}':
            open_braces -= 1
            if started and open_braces == 0:
                end_idx = i + 1
                break
    
    old_switch = demo[switch_idx:end_idx]
    
    new_switch = """function switchTab(tabId, btnElement) {
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
    
    demo = demo.replace(old_switch, new_switch)

demo = demo.replace('</style>', f"\n/* --- RUNNER CSS --- */\n{runner_css}\n</style>")
demo = demo.replace('</body>', f"\n<script>\n/* --- RUNNER LOGIC --- */\n{runner_js}\n</script>\n</body>")

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(demo)
print("Rebuilt flawlessly.")
