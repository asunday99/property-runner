import re

with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

with open("index.html", "r", encoding="utf-8") as f:
    runner = f.read()

def extract_div(html, div_id):
    idx = html.find(f'<div id="{div_id}"')
    if idx == -1: return ""
    open_divs = 0
    end_idx = -1
    for i in range(idx, len(html)):
        if html[i:i+4] == '<div': open_divs += 1
        elif html[i:i+5] == '</div':
            open_divs -= 1
            if open_divs == 0:
                end_idx = i + 6
                break
    return html[idx:end_idx]

# 1. CSS
runner_css = re.search(r'<style>(.*?)</style>', runner, re.DOTALL).group(1)
runner_css = re.sub(r'body\s*{[^}]+}', '', runner_css) # strip body
runner_css += "\n#tab-map img { max-width: none !important; }\n"

# 2. JS
runner_scripts = re.findall(r'<script>(.*?)</script>', runner, re.DOTALL)
runner_js = runner_scripts[-1]

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

# 3. HTML Marathon and Map
runner_html_marathon = extract_div(runner, "view-marathon")
runner_html_marathon = runner_html_marathon.replace('id="view-marathon"', 'id="tab-marathon" class="tab-content" style="height: 80vh; overflow-y: auto; overflow-x: hidden;"')

runner_html_map = extract_div(runner, "view-map")
runner_html_map = runner_html_map.replace('id="view-map"', 'id="tab-map" class="tab-content" style="height: 80vh; width: 100%;"')
# We also want to make sure it is display:none initially since tab-content is. It already should be.

# 4. Modify Demo Tabs
idx1 = demo.find('<button class="nav-btn" onclick="switchTab(\'rentroll\', this)">')
if idx1 != -1:
    idx2 = demo.find('</div>', idx1)
    if idx2 != -1:
        new_buttons = """
            <button class="nav-btn" onclick="switchTab('marathon', this)">🏃 러너 뷰</button>
            <button class="nav-btn" onclick="switchTab('map', this)">🗺 지도 뷰</button>
"""
        demo = demo[:idx2] + new_buttons + demo[idx2:]

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
        {runner_html_map}
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

with open("runner_demo.html", "w", encoding="utf-8") as f:
    f.write(demo)

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(demo)
print("True flawless build complete.")
