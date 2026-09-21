import re

with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

new_js = """
        let isMapMode = false;
        
        function switchTab(mode) {
            localStorage.setItem('propertyRunnerTab', mode);
            // Hide all views
            ['view-marathon', 'view-map', 'view-dashboard', 'view-properties', 'view-rentroll', 'view-debt'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.style.display = 'none';
            });
            
            // Handle Tab UI styles
            ['btn-marathon', 'btn-dashboard', 'btn-properties'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.className = 'tab-btn tab-inactive';
            });
            
            if(document.getElementById('btn-' + mode)) {
                document.getElementById('btn-' + mode).className = 'tab-btn tab-active';
            }

            // Show selected view
            if (mode === 'marathon') {
                document.getElementById(isMapMode ? 'view-map' : 'view-marathon').style.display = 'block';
                if(document.getElementById('toggle-map-btn')) document.getElementById('toggle-map-btn').style.display = 'inline-block';
            } else {
                if(document.getElementById('view-' + mode)) document.getElementById('view-' + mode).style.display = 'block';
                if(document.getElementById('toggle-map-btn')) document.getElementById('toggle-map-btn').style.display = 'none';
                
                // Initialize map if it hasn't been initialized and we switched to it (or map mode)
                // Actually Map is now inside marathon, but just in case
            }
            
            // Init map if mode is map
            if (mode === 'map' || (mode === 'marathon' && isMapMode)) {
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
        
        function toggleMapMode() {
            isMapMode = !isMapMode;
            const btn = document.getElementById('toggle-map-btn');
            if (isMapMode) {
                if(btn) { btn.innerHTML = '🏃 러너 뷰'; btn.style.background = '#c665d9'; }
                document.getElementById('view-marathon').style.display = 'none';
                document.getElementById('view-map').style.display = 'block';
                switchTab('marathon'); // to trigger map init logic
            } else {
                if(btn) { btn.innerHTML = '🗺️ 지도 뷰'; btn.style.background = '#2563eb'; }
                document.getElementById('view-map').style.display = 'none';
                document.getElementById('view-marathon').style.display = 'block';
            }
        }

        const GAS_URL = "https://script.google.com/macros/s/AKfycby5P264B3eU49w8U8z1z15VvI68s9HhFz_sR3q2m68b5C35ZJqD8T3L0_9c5N5Y9pA/exec";
        window.globalData = null;

        async function initDataEngine() {
            try {
                const response = await fetch(GAS_URL + "?t=" + new Date().getTime());
                const rawJson = await response.json();
                window.globalData = rawJson;
                
                const dashHTML = `
                    <div style="max-width:800px; margin:0 auto;">
                        <h2 style="font-size:24px; margin-bottom:20px; font-weight:bold;">📊 총괄 대시보드</h2>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
                            <div style="background:#1f2937; padding:20px; border-radius:12px;">
                                <div style="color:#9ca3af; font-size:14px;">총 보유 물건</div>
                                <div style="color:white; font-size:32px; font-weight:bold; margin-top:8px;">${rawJson["매입부동산"] ? rawJson["매입부동산"].length : 0}건</div>
                            </div>
                            <div style="background:#1f2937; padding:20px; border-radius:12px;">
                                <div style="color:#9ca3af; font-size:14px;">임대 계약</div>
                                <div style="color:#10b981; font-size:32px; font-weight:bold; margin-top:8px;">${rawJson["RentRoll"] ? rawJson["RentRoll"].length : 0}건</div>
                            </div>
                        </div>
                        <div style="background:#1f2937; padding:20px; border-radius:12px; margin-bottom:24px;">
                            <h3 style="color:#8ab4f8; font-weight:bold; margin-bottom:12px;">최근 매입 현황</h3>
                            <ul style="color:#d1d5db; font-size:14px; line-height:1.6; list-style:none; padding:0;">
                                ${rawJson["매입부동산"] ? rawJson["매입부동산"].slice(0,3).map(p => `<li>✅ ${p["물건명"]} (${p["소유주"]})</li>`).join('') : "데이터가 없습니다."}
                            </ul>
                        </div>
                    </div>
                `;
                
                const propHTML = `
                    <div style="max-width:800px; margin:0 auto;">
                        <h2 style="font-size:24px; margin-bottom:20px; font-weight:bold;">🏢 매입부동산 상세</h2>
                        <div style="background:#1f2937; border-radius:12px; overflow:hidden;">
                            ${rawJson["매입부동산"] ? rawJson["매입부동산"].map(p => `
                                <div style="padding:16px; border-bottom:1px solid #374151; display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-weight:bold; color:white; font-size:16px;">${p["물건명"]}</div>
                                        <div style="color:#9ca3af; font-size:12px; margin-top:4px;">소유주: ${p["소유주"] || '-'}</div>
                                    </div>
                                    <div style="text-align:right;">
                                        <div style="color:#10b981; font-weight:bold;">${p["현재시세"] ? '시세: ' + p["현재시세"].toLocaleString() : '-'}</div>
                                        <div style="color:#60a5fa; font-size:12px; margin-top:4px;">${p["지역"]}</div>
                                    </div>
                                </div>
                            `).join('') : "<div style='padding:20px; color:#9ca3af;'>데이터가 없습니다.</div>"}
                        </div>
                    </div>
                `;

                if(document.getElementById('view-dashboard')) document.getElementById('view-dashboard').innerHTML = dashHTML;
                if(document.getElementById('view-properties')) document.getElementById('view-properties').innerHTML = propHTML;
                if(document.getElementById('view-rentroll')) document.getElementById('view-rentroll').innerHTML = '<h2 style="font-size:24px; margin-bottom:10px;">📁 임대관리</h2><p>✅ 엑셀 데이터 연동 중...</p>';
                if(document.getElementById('view-debt')) document.getElementById('view-debt').innerHTML = '<h2 style="font-size:24px; margin-bottom:10px;">💳 부채관리</h2><p>✅ 엑셀 데이터 연동 중...</p>';
            } catch (e) {
                console.error(e);
            }
        }
"""

# Replace switchTab block
html = re.sub(r'function switchTab\(mode\).*?\}\s*\}', new_js, html, flags=re.DOTALL)

# Find fetchAndParseData and inject initDataEngine
html = html.replace('function fetchAndParseData() {', 'function fetchAndParseData() {\n            initDataEngine();')

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.write(html)
