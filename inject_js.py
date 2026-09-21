import re

with open('index_beta_modified.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add switchTab logic and toggleMapMode logic
js_additions = '''
        // --- Added for Phase 1 ---
        let currentTab = 'marathon';
        let isMapMode = false;

        function switchTab(tabId) {
            currentTab = tabId;
            // Hide all views
            document.getElementById('view-marathon').style.display = 'none';
            document.getElementById('view-map').style.display = 'none';
            document.getElementById('view-dashboard').style.display = 'none';
            document.getElementById('view-properties').style.display = 'none';
            document.getElementById('view-rentroll').style.display = 'none';
            document.getElementById('view-debt').style.display = 'none';

            // Reset tab styles
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('tab-active');
                btn.classList.add('tab-inactive');
            });

            // Show selected view and activate tab (if main tab)
            const activeBtn = document.getElementById('btn-' + tabId);
            if (activeBtn) {
                activeBtn.classList.add('tab-active');
                activeBtn.classList.remove('tab-inactive');
            }

            if (tabId === 'marathon') {
                document.getElementById(isMapMode ? 'view-map' : 'view-marathon').style.display = 'block';
                document.getElementById('toggle-map-btn').style.display = 'inline-block';
            } else {
                document.getElementById('view-' + tabId).style.display = 'block';
                document.getElementById('toggle-map-btn').style.display = 'none';
            }

            // Close drawer if open
            if (document.getElementById('drawer-sidebar').classList.contains('open')) {
                toggleDrawer();
            }
        }

        function toggleMapMode() {
            isMapMode = !isMapMode;
            const btn = document.getElementById('toggle-map-btn');
            if (isMapMode) {
                btn.innerHTML = '🏃 러너 뷰';
                btn.style.background = '#c665d9';
                document.getElementById('view-marathon').style.display = 'none';
                document.getElementById('view-map').style.display = 'block';
            } else {
                btn.innerHTML = '🗺️ 지도 뷰';
                btn.style.background = '#2563eb';
                document.getElementById('view-map').style.display = 'none';
                document.getElementById('view-marathon').style.display = 'block';
            }
        }
        
        // Data Engine (GAS Fetch) Prototype
        const GAS_URL = "https://script.google.com/macros/s/AKfycby5P264B3eU49w8U8z1z15VvI68s9HhFz_sR3q2m68b5C35ZJqD8T3L0_9c5N5Y9pA/exec";
        window.globalData = null;

        async function initDataEngine() {
            try {
                // Fetch basic data for dashboard
                const response = await fetch(GAS_URL + "?t=" + new Date().getTime());
                const rawJson = await response.json();
                window.globalData = rawJson;
                
                // Update loading texts
                document.getElementById('view-dashboard').innerHTML = '<h2 style="font-size:24px; margin-bottom:10px;">📊 대시보드</h2><p>✅ 구글 시트 연동 성공! 데이터 개수: ' + (rawJson["매입부동산"] ? rawJson["매입부동산"].length : 0) + '건</p>';
                document.getElementById('view-properties').innerHTML = '<h2 style="font-size:24px; margin-bottom:10px;">🏢 매입부동산</h2><p>✅ 구글 시트 연동 성공!</p>';
                document.getElementById('view-rentroll').innerHTML = '<h2 style="font-size:24px; margin-bottom:10px;">📁 임대관리 (RentRoll)</h2><p>✅ 구글 시트 연동 성공!</p>';
                document.getElementById('view-debt').innerHTML = '<h2 style="font-size:24px; margin-bottom:10px;">💳 부채관리</h2><p>✅ 구글 시트 연동 성공!</p>';
                
            } catch (error) {
                console.error("Data Engine Error:", error);
            }
        }
        // --- End Phase 1 Additions ---
'''

# Find a good place to inject the JS (e.g. at the end of the <script> block or before window.onload)
html = html.replace('function switchTab(tab) {', 'function switchTab_old(tab) {')
html = html.replace('window.onload = function() {', js_additions + '\n        window.onload = function() {\n            initDataEngine();\n')

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.write(html)
