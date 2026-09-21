import re

with open("index.html", "r", encoding="utf-8") as f:
    base = f.read()

# 1. Add Tab Button to Beta
tabs_container = """        <div class="tabs-container">
            <button id="btn-dashboard" class="tab-btn tab-inactive" onclick="switchTab('dashboard')">📊 대시보드</button>
            <button id="btn-marathon" class="tab-btn tab-active" onclick="switchTab('marathon')">🏃 러너 뷰</button>
            <button id="btn-map" class="tab-btn tab-inactive" onclick="switchTab('map')">🗺 지도 뷰</button>
        </div>"""
base = re.sub(r'<div class="tabs-container">.*?</div>', tabs_container, base, flags=re.DOTALL)

# 2. Add iframe view
dashboard_view = f"""
        <div id="view-dashboard" style="display:none; width: 100%; height: 100vh;">
            <iframe src="dashboard_only.html" style="width:100%; height:100%; border:none;"></iframe>
        </div>"""
base = base.replace('<div id="view-map"></div>', '<div id="view-map"></div>\n' + dashboard_view)

# 3. Fix switchTab in base
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
            }
        }
"""
base = base.replace(old_switch, switch_tab_fix)

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(base)
print("Iframe beta created.")
