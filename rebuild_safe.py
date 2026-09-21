with open("index.html", "r", encoding="utf-8") as f:
    base = f.read()

# Locate the exact original switchTab function using a reliable slice
start_idx = base.find("function switchTab(mode) {")
end_idx = base.find("async function initKakaoMap() {")

if start_idx != -1 and end_idx != -1:
    old_switch = base[start_idx:end_idx].strip()
else:
    print("Could not find switchTab boundaries")
    exit(1)

with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

import re

# 1. CSS
css = re.search(r'<style>(.*?)</style>', demo, re.DOTALL).group(1)
css = re.sub(r'body\s*{[^}]+}', '', css)
css = re.sub(r'@import url.*?;\n?', '', css)
css = css.replace('.tab-content.active { display: block; }', '.demo-tab-content.active { display: block; }')
css = css.replace('.tab-content { display: none; }', '.demo-tab-content { display: none; }')
css_injected = f"\n/* --- DEMO CSS --- */\n{css}\n/* ---------------- */\n"
base = base.replace("</style>", css_injected + "</style>")

if "chart.js" not in base:
    base = base.replace("<title>", '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <title>')

# 2. Tabs
tabs_container = """        <div class="tabs-container">
            <button id="btn-dashboard" class="tab-btn tab-inactive" onclick="switchTab('dashboard')">📊 대시보드</button>
            <button id="btn-marathon" class="tab-btn tab-active" onclick="switchTab('marathon')">🏃 러너 뷰</button>
            <button id="btn-map" class="tab-btn tab-inactive" onclick="switchTab('map')">🗺 지도 뷰</button>
        </div>"""
base = re.sub(r'<div class="tabs-container">.*?</div>', tabs_container, base, flags=re.DOTALL)

# 3. HTML
body_inner = re.search(r'<body[^>]*>(.*?)</body>', demo, re.DOTALL).group(1)
scripts = re.findall(r'<script.*?</script>', body_inner, re.DOTALL)
for s in scripts:
    body_inner = body_inner.replace(s, "")
body_inner = body_inner.replace('class="tab-content', 'class="demo-tab-content')
body_inner = body_inner.replace("switchTab(", "demoSwitchTab(")

dashboard_view = f"""        <div id="view-dashboard" style="display:none; width: 100%; height: 100%; overflow-y: auto; background-color: #0b1120;">
{body_inner}
        </div>"""
base = base.replace('<div id="view-map"></div>', '<div id="view-map"></div>\n' + dashboard_view)

# 4. JS
js0 = scripts[0].replace('<script>', '').replace('</script>', '')
js1 = scripts[1].replace('<script>', '').replace('</script>', '')
js1 = js1.replace('function switchTab(', 'function demoSwitchTab(')
js1 = js1.replace('.tab-content', '.demo-tab-content')
js1 = js1.replace('window.onload = function() {', 'function initDemoDashboard() {')
js1 = js1.replace('const rawData =', 'const demoRawData =')
js1 = js1.replace('rawData.', 'demoRawData.')

# 5. Safe SwitchTab Replacement
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
                    initDemoDashboard();
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

js_injected = f"\n/* --- DEMO DATA --- */\n{js0}\n/* --- DEMO LOGIC --- */\n{js1}\n"
base = base.replace("</script>\n</body>", js_injected + "</script>\n</body>")

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(base)
print("Rebuilt flawlessly.")
