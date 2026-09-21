with open("index.html", "r", encoding="utf-8") as f:
    base = f.read()

with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

import re

# Extract parts from demo
css = re.search(r'<style>(.*?)</style>', demo, re.DOTALL).group(1)
body_html = re.search(r'<div class="p-8 max-w-7xl mx-auto">(.*?)</div>\s*<script>', demo, re.DOTALL).group(1)
js = re.search(r'<script>(.*?)</script>', demo, re.DOTALL).group(1)

# 1. Clean CSS
# Remove global body styles from demo css
css = re.sub(r'body\s*{[^}]+}', '', css)
css = re.sub(r'@import url.*?;\n?', '', css)
# Wrap CSS rules inside #view-dashboard to scope them if needed, or just append
css_injected = f"\n/* --- DASHBOARD CSS --- */\n{css}\n/* --------------------- */\n"

base = base.replace("</style>", css_injected + "</style>")

# 2. Add Chart.js
if "chart.js" not in base:
    base = base.replace("<title>", '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n    <title>')

# 3. Add Tab Button and View Container
tabs_container = """        <div class="tabs-container">
            <button id="btn-dashboard" class="tab-btn tab-inactive" onclick="switchTab('dashboard')">📊 대시보드</button>
            <button id="btn-marathon" class="tab-btn tab-active" onclick="switchTab('marathon')">🏃 러너 뷰</button>
            <button id="btn-map" class="tab-btn tab-inactive" onclick="switchTab('map')">🗺 지도 뷰</button>
        </div>"""
base = re.sub(r'<div class="tabs-container">.*?</div>', tabs_container, base, flags=re.DOTALL)

dashboard_view = f"""        <div id="view-dashboard" style="display:none; width: 100%; height: 100%; overflow-y: auto; background-color: #0b1120;">
            <div class="p-8 max-w-7xl mx-auto">
{body_html}
            </div>
        </div>"""
base = base.replace('<div id="view-map"></div>', '<div id="view-map"></div>\n' + dashboard_view)

# 4. Add JavaScript
# Rename window.onload to initDashboardMode to prevent conflict, and scope variables
js_cleaned = js.replace("window.onload = function() {", "function initDashboardMode() {")
# Remove rawData from demo js because it will be parsed from globalData or we just embed the rawData directly
# WAIT! The user wants the demo "exactly as it was" (with dummy data / embedded data working perfectly).
# I will keep the `const rawData = ...` exactly as it is in the demo script, but rename it so it doesn't conflict!
js_cleaned = js_cleaned.replace("const rawData =", "const demoRawData =")
js_cleaned = js_cleaned.replace("rawData.", "demoRawData.")

# Fix switchTab logic for the new dashboard button in index
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
                    initDashboardMode();
                    window.dashInitialized = true;
                }
            }
        }"""
base = re.sub(r'function switchTab\(mode\).*?\} else if \(mode === \'properties\'\) \{.*?\n\s*\}\n\s*\}', switch_tab_fix, base, flags=re.DOTALL)
# Wait, index.html doesn't have 'properties'! Let's just match the old switchTab
base = re.sub(r'function switchTab\(mode\).*?\}\n\s*\}', switch_tab_fix, base, flags=re.DOTALL)

# Add the dashboard JS at the very end of the script
js_injected = f"\n/* --- DASHBOARD JS --- */\n{js_cleaned}\n/* -------------------- */\n"
base = base.replace("</script>\n</body>", js_injected + "</script>\n</body>")

# Add DOMContentLoaded flicker fix for the dashboard
dom_fix = """window.addEventListener('DOMContentLoaded', () => {
            const savedTab = localStorage.getItem('propertyRunnerTab') || 'marathon';
            if (savedTab !== 'marathon') {
                switchTab(savedTab);
            }
            fetchAndParseData();
        });"""
base = re.sub(r'window\.addEventListener\(\'DOMContentLoaded\', fetchAndParseData\);', dom_fix, base)

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(base)
print("Merge complete")
