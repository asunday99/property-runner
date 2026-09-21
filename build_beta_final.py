import re

with open("index.html", "r", encoding="utf-8") as f:
    base = f.read()

with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

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

# 3. HTML extraction
idx = demo.find('<div id="tab-dashboard"')
if idx == -1:
    print("Cannot find tab-dashboard")
    exit(1)

open_divs = 0
end_idx = -1
for i in range(idx, len(demo)):
    if demo[i:i+4] == '<div': open_divs += 1
    elif demo[i:i+5] == '</div':
        open_divs -= 1
        if open_divs == 0:
            end_idx = i + 6
            break

dashboard_html = demo[idx:end_idx]
dashboard_html = dashboard_html.replace('class="tab-content active space-y-6"', 'class="space-y-6"')

dashboard_view = f"""        <div id="view-dashboard" style="display:none; width: 100%; height: 100%; overflow-y: auto; background-color: #0b1120;">
            <div class="p-8 max-w-7xl mx-auto">
{dashboard_html}
            </div>
        </div>"""
base = base.replace('<div id="view-map"></div>', '<div id="view-map"></div>\n' + dashboard_view)

# 4. Extract Javascript
# Find rawData
raw_data_match = re.search(r'const rawData = \{.*?\n\s*\}\n\s*\]\n\s*\};?', demo, re.DOTALL)
if not raw_data_match:
    # fallback to just searching for the whole block
    raw_data_match = re.search(r'const rawData = \{.*?\}\];\}?', demo, re.DOTALL) # Might not work if formatted

# Let's just grab the two large scripts based on length
scripts = re.findall(r'<script.*?>\s*(.*?)</script>', demo, re.DOTALL)
large_scripts = [s for s in scripts if len(s) > 1000]

js0 = large_scripts[0]
js1 = large_scripts[1]

def extract_func(name, js_text):
    match = re.search(rf'function\s+{name}\s*\(.*?\)\s*\{{', js_text)
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
init_filters_code = extract_func('initFilters', js1)
update_dashboard_code = extract_func('updateDashboard', js1)

# Modify updateDashboard to remove dependencies on other tabs
update_dashboard_code = re.sub(r'updateInvestorTab\(\);?', '', update_dashboard_code)
update_dashboard_code = re.sub(r'updateRentRollTab\(\);?', '', update_dashboard_code)

global_vars = """
        let growthChart = null;
        let ltvChart = null;
        let roiChart = null;
        let currentFilter = '전체';
"""

# Let's write our own initDashboard to simply call the filters and update
init_dashboard_code = """
        function initDashboard() {
            initFilters();
            updateDashboard();
        }
"""

# 5. Fix switchTab
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

js_injected = f"\n/* --- DEMO DATA --- */\n{js0}\n/* --- DEMO LOGIC --- */\n{global_vars}\n{format_money_code}\n{init_filters_code}\n{update_dashboard_code}\n{init_dashboard_code}\n"
base = base.replace("</script>\n</body>", js_injected + "</script>\n</body>")

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(base)
print("Built successfully.")
