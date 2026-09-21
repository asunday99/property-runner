with open('index_beta.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Modify tabs
for i, line in enumerate(lines):
    if '<div class="tabs-container">' in line:
        tabs_idx = i
        break

new_tabs = [
    '      <div class="tabs-container">\n',
    '          <button id="btn-properties" class="tab-btn tab-inactive" onclick="switchTab(\'properties\')">🏢 매입부동산</button>\n',
    '          <button id="btn-marathon" class="tab-btn tab-active" onclick="switchTab(\'marathon\')">🏃 러너 뷰</button>\n',
    '          <button id="btn-map" class="tab-btn tab-inactive" onclick="switchTab(\'map\')">🗺 지도 뷰</button>\n',
    '      </div>\n'
]
lines[tabs_idx:tabs_idx+4] = new_tabs

# Re-evaluate indices because we added 1 line
# 2. Add view-properties div
for i, line in enumerate(lines):
    if '<div id="view-map"></div>' in line:
        map_idx = i
        break

new_map_div = [
    '        <div id="view-map"></div>\n',
    '        <div id="view-properties" style="display:none; color:white; padding:20px; overflow-y:auto; flex-grow:1;"></div>\n'
]
lines[map_idx:map_idx+1] = new_map_div

# 3. Replace switchTab
for i, line in enumerate(lines):
    if 'function switchTab(mode)' in line:
        switch_idx = i
        break

# Find the end of switchTab (we know it's around 25 lines)
switch_end_idx = switch_idx
stack = 0
found_start = False
for i in range(switch_idx, len(lines)):
    line = lines[i]
    if '{' in line:
        stack += line.count('{')
        found_start = True
    if '}' in line:
        stack -= line.count('}')
    
    if found_start and stack == 0:
        switch_end_idx = i
        break

new_switchTab = """        function switchTab(mode) {
            localStorage.setItem('propertyRunnerTab', mode);
            document.getElementById('view-marathon').style.display = (mode === 'marathon') ? 'block' : 'none';
            document.getElementById('view-map').style.display = (mode === 'map') ? 'block' : 'none';
            if (document.getElementById('view-properties')) {
                document.getElementById('view-properties').style.display = (mode === 'properties') ? 'block' : 'none';
            }
            
            const btnMarathon = document.getElementById('btn-marathon');
            const btnMap = document.getElementById('btn-map');
            const btnProp = document.getElementById('btn-properties');
            
            if(btnMarathon) btnMarathon.className = (mode === 'marathon') ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
            if(btnMap) btnMap.className = (mode === 'map') ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
            if(btnProp) btnProp.className = (mode === 'properties') ? 'tab-btn tab-active' : 'tab-btn tab-inactive';

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
            } else if (mode === 'properties') {
                if (typeof initDataEngine === 'function') {
                    initDataEngine();
                }
            }
        }
"""
lines[switch_idx:switch_end_idx+1] = [new_switchTab]

# 4. Inject initDataEngine at the end
for i in range(len(lines)-1, -1, -1):
    if '</script>' in lines[i]:
        script_close_idx = i
        break

data_engine = """
        const GAS_URL = "https://script.google.com/macros/s/AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz/exec";
        window.globalData = null;
        let propertiesInitialized = false;

        async function initDataEngine() {
            if (propertiesInitialized) return;
            const propView = document.getElementById('view-properties');
            propView.innerHTML = `<div style="text-align:center; padding-top:40px; color:#9ca3af;">데이터를 불러오는 중입니다...</div>`;
            try {
                const response = await fetch(GAS_URL + "?t=" + new Date().getTime());
                const rawData = await response.json();
                
                const keys = Object.keys(rawData);
                let propKey = keys.find(k => k.replace(/\\s/g,'').includes('매입부동산')) || '매입부동산';
                const propSheet = rawData[propKey] || [];
                
                window.globalData = { props: propSheet, raw: rawData };
                
                function calculateTaxAndROI(buyPrice, currentPrice, owner) {
                    if (!buyPrice || !currentPrice || buyPrice >= currentPrice) return { gain: 0, netProfit: 0, roi: 0, tax: 0, type: '알수없음' };
                    let gain = currentPrice - buyPrice;
                    let isCorp = owner.includes('법인') || owner.includes('주식회사') || owner.includes('(주)');
                    let tax = isCorp ? gain * 0.40 : gain * 0.45;
                    let netProfit = gain - tax;
                    return { gain, netProfit, roi: (netProfit / buyPrice) * 100, tax, type: isCorp ? '법인' : '개인' };
                }

                const parsedProps = propSheet.map(row => {
                    let rKeys = Object.keys(row);
                    let nameKey = rKeys.find(k => k.replace(/\\s/g,'') === '주소') || '주소';
                    let ownerKey = rKeys.find(k => k.replace(/\\s/g,'') === '소유주') || '소유주';
                    let valKey = rKeys.find(k => k.includes('현재시세') || k.includes('매각금액')) || '현재시세/매각금액';
                    let locKey = rKeys.find(k => k.replace(/\\s/g,'') === '지역') || '지역';
                    let buyKey = rKeys.find(k => k.includes('취득가')) || '취득가';
                    
                    let buyPriceStr = (row[buyKey] || '0').toString().replace(/,/g, '').replace(/[^0-9.-]+/g,"");
                    let buyPrice = parseFloat(buyPriceStr) || 0;
                    let valStr = (row[valKey] || '0').toString().replace(/,/g, '').replace(/[^0-9.-]+/g,"");
                    let currentPrice = parseFloat(valStr) || 0;
                    let taxInfo = calculateTaxAndROI(buyPrice, currentPrice, row[ownerKey] || '');
                    
                    return {
                        name: row[nameKey] || '이름 없음',
                        owner: row[ownerKey] || '미상',
                        value: currentPrice,
                        buyPrice: buyPrice,
                        loc: row[locKey] || '',
                        taxInfo: taxInfo
                    };
                });

                const propHTML = `
                    <div style="max-width:800px; margin:0 auto;">
                        <h2 style="font-size:24px; margin-bottom:20px; font-weight:bold;">🏢 매입부동산 상세 (세금 계산 엔진)</h2>
                        <div style="background:#1f2937; border-radius:12px; overflow:hidden;">
                            ${parsedProps.length > 0 ? parsedProps.map(p => `
                                <div style="padding:16px; border-bottom:1px solid #374151; display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-weight:bold; color:white; font-size:16px;">${p.name}</div>
                                        <div style="color:#9ca3af; font-size:12px; margin-top:4px;">소유주: ${p.owner}</div>
                                    </div>
                                    <div style="text-align:right;">
                                        <div style="color:#10b981; font-weight:bold;">${p.value ? '시세/매각가: ' + p.value.toLocaleString() + '원' : '-'}</div>
                                        ${p.taxInfo.gain > 0 ? `<div style="color:#f87171; font-size:12px; margin-top:4px; border: 1px solid #7f1d1d; padding:2px 6px; border-radius:4px; display:inline-block; background:#450a0a;">예상차익: +${(p.taxInfo.gain / 100000000).toFixed(1)}억 (세후수익률: ${p.taxInfo.roi.toFixed(1)}%)</div>` : ''}
                                        <div style="color:#60a5fa; font-size:12px; margin-top:4px;">${p.loc}</div>
                                    </div>
                                </div>
                            `).join('') : "<div style='padding:20px; color:#9ca3af;'>데이터가 없습니다.</div>"}
                        </div>
                    </div>
                `;

                propView.innerHTML = propHTML;
                propertiesInitialized = true;
            } catch (e) {
                console.error(e);
                propView.innerHTML = `<div style="text-align:center; padding-top:40px; color:#ef4444;">데이터 연동 중 오류가 발생했습니다.</div>`;
            }
        }
"""
lines.insert(script_close_idx, data_engine)

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Insertion completed cleanly.")
