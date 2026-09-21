with open("index.html", "r", encoding="utf-8") as f:
    base = f.read()

with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

import re

# 1. Chart.js injection
if "chart.js" not in base:
    base = base.replace("<title>", '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <title>')

# 2. Add Tab Button to Beta
tabs_container = """        <div class="tabs-container">
            <button id="btn-dashboard" class="tab-btn tab-inactive" onclick="switchTab('dashboard')">📊 대시보드</button>
            <button id="btn-marathon" class="tab-btn tab-active" onclick="switchTab('marathon')">🏃 러너 뷰</button>
            <button id="btn-map" class="tab-btn tab-inactive" onclick="switchTab('map')">🗺 지도 뷰</button>
        </div>"""
base = re.sub(r'<div class="tabs-container">.*?</div>', tabs_container, base, flags=re.DOTALL)

# 3. Extract ONLY the Dashboard HTML
dashboard_html = re.search(r'<div id="tab-dashboard".*?<!-- 2\. 투자자별 자산 탭 -->', demo, re.DOTALL).group(0)
dashboard_html = dashboard_html.replace('<!-- 2. 투자자별 자산 탭 -->', '')
# Remove the inner tabs navigation if it's there. Actually `tab-dashboard` doesn't contain the inner tabs nav, they are above it!
# Wait, let's verify if `tab-dashboard` has everything we need.

dashboard_view = f"""        <div id="view-dashboard" style="display:none; width: 100%; height: 100%; overflow-y: auto; background-color: #0b1120;">
            <div class="p-8 max-w-7xl mx-auto">
{dashboard_html}
            </div>
        </div>"""
base = base.replace('<div id="view-map"></div>', '<div id="view-map"></div>\n' + dashboard_view)

# 4. Extract Javascript
# We need rawData, formatMoney, initDashboard (renamed), and the global chart vars.
scripts = re.findall(r'<script.*?</script>', demo, re.DOTALL)
js0 = scripts[0].replace('<script>', '').replace('</script>', '') # rawData
js1 = scripts[1].replace('<script>', '').replace('</script>', '') # logic

# We will just take the necessary parts of js1.
# Let's extract specific functions using python
def extract_func(name, js_text):
    match = re.search(rf'function {name}\(.*?\)\s*\{{', js_text)
    if not match: return ""
    start = match.start()
    open_braces = 0
    in_string = False
    str_char = ''
    for i in range(start, len(js_text)):
        char = js_text[i]
        if in_string:
            if char == str_char and js_text[i-1] != '\\': in_string = False
        else:
            if char in ["'", '"', '`']:
                in_string = True
                str_char = char
            elif char == '{': open_braces += 1
            elif char == '}':
                open_braces -= 1
                if open_braces == 0:
                    return js_text[start:i+1]
    return ""

format_money_code = extract_func('formatMoney', js1)
init_dashboard_code = extract_func('initDashboard', js1)

# We also need global chart vars
global_vars = """
        let growthChart = null;
        let ltvChart = null;
        let roiChart = null;
"""

# The initDashboard function references 'rawData'. We don't need updateDashboard because initDashboard does everything we need for the initial render.
# Wait, in the demo, `updateDashboard` filters data, and `initDashboard` calls `updateDashboard`.
# Let's just include `updateDashboard` too.
update_dashboard_code = extract_func('updateDashboard', js1)
# Remove the calls to investor and rentroll inside updateDashboard
update_dashboard_code = re.sub(r'updateInvestorTab\(\);', '', update_dashboard_code)
update_dashboard_code = re.sub(r'updateRentRollTab\(\);', '', update_dashboard_code)
# It also references `currentFilter`.
global_vars += "\n        let currentFilter = '전체';\n"

# 5. Fix switchTab in base
switch_idx = base.find("function switchTab(mode) {")
end_switch = base.find("async function initKakaoMap() {")
old_switch = base[switch_idx:end_switch].strip()

switch_tab_fix = """function switchTab(mode) {
            localStorage.setItem('propertyRunnerTab', mode);
            document.getElementById('view-marathon').style.display = (mode === 'marathon') ? 'block' : 'none';
            document.getElementById('view-map').style.display = (mode === 'map') ? 'block' : 'none';
            if(document.getElementById('view-dashboard')) document.getElementById('view-dashboard').style.display = (mode === 'dashboard') ? 'block' : 'none';
            
            const btnMarathon = document.getElementById('btn-marathon');
            const btnMap = document.getElementById('btn-map');
            const btnDash = document.getElementById('btn-dashboard');
            
            if(btnMarathon) btnMarathon.className = (mode === 'marathon') ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
            if(btnMap) btnMap.className = (mode === 'map') ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
            if(btnDash) btnDash.className = (mode === 'dashboard') ? 'tab-btn tab-active' : 'tab-btn tab-inactive';

            if (mode === 'map') {
                if (!mapInitialized) {
                    initKakaoMap();
                    mapInitialized = true;
                }
                setTimeout(() => {
                    if (typeof kakaoMap !== 'undefined' && kakaoMap) {
                        kakaoMap.relayout();
                        kakaoMap.setCenter(new kakao.maps.LatLng(37.5255, 126.9954));
                    }
                }, 100);
            } else if (mode === 'dashboard') {
                if (!window.dashInitialized) {
                    initDashboard();
                    window.dashInitialized = true;
                }
            }
        }
"""
base = base.replace(old_switch, switch_tab_fix)

# Flicker fix
dom_fix = """window.addEventListener('DOMContentLoaded', () => {
            const savedTab = localStorage.getItem('propertyRunnerTab') || 'marathon';
            if (savedTab !== 'marathon') {
                switchTab(savedTab);
            }
            fetchAndParseData();
        });"""
base = re.sub(r'window\.addEventListener\(\'DOMContentLoaded\', fetchAndParseData\);', dom_fix, base)

js_injected = f"\n/* --- DEMO DATA --- */\n{js0}\n/* --- DEMO LOGIC --- */\n{global_vars}\n{format_money_code}\n{update_dashboard_code}\n{init_dashboard_code}\n"
base = base.replace("</script>\n</body>", js_injected + "</script>\n</body>")

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(base)
print("Built beta correctly")
