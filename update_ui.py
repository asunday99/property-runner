import re

with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Define the new initDataEngine
new_data_engine = """
        async function initDataEngine() {
            if (propertiesInitialized) return;
            const propView = document.getElementById('view-properties');
            propView.innerHTML = `<div style="text-align:center; padding-top:60px; color:#9ca3af;"><div style="font-size:40px; margin-bottom:16px;">🔄</div>데이터를 분석 중입니다...</div>`;
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
                    // 간이 세금 엔진 (법인 40%, 개인 45% 추정)
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

                window.filteredProps = parsedProps;
                
                window.renderProperties = function() {
                    const searchEl = document.getElementById('prop-search');
                    const query = searchEl ? searchEl.value.toLowerCase() : '';
                    
                    const filtered = window.filteredProps.filter(p =>
                        p.name.toLowerCase().includes(query) ||
                        p.owner.toLowerCase().includes(query) ||
                        p.loc.toLowerCase().includes(query)
                    );

                    let totalB = 0, totalC = 0, totalN = 0;
                    filtered.forEach(p => { totalB += p.buyPrice; totalC += p.value; totalN += p.taxInfo.netProfit; });

                    const fmt = (num) => num ? num.toLocaleString() + '원' : '-';
                    const fmtEok = (num) => (num / 100000000).toFixed(1) + '억';

                    const html = `
                        <div style="max-width:1200px; margin:0 auto; padding-bottom:40px;">
                            <!-- Header & Search -->
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
                                <h2 style="font-size:24px; font-weight:bold; color:#fff; margin:0; font-family:'Pretendard', sans-serif;">🏢 매입부동산 포트폴리오</h2>
                                <input id="prop-search" type="text" placeholder="소유주, 지역, 건물명 검색..."
                                       onkeyup="window.renderProperties()"
                                       style="padding:10px 16px; border-radius:8px; border:1px solid #374151; background:#111827; color:#fff; width:100%; max-width:320px; outline:none; font-size:14px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.5);"
                                       value="${query}">
                            </div>

                            <!-- Summary Dashboard -->
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:32px;">
                                <div style="background:linear-gradient(145deg, #1f2937 0%, #111827 100%); border:1px solid #374151; padding:24px; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.3);">
                                    <div style="color:#9ca3af; font-size:13px; margin-bottom:8px; font-weight:600;">총 매입가 (필터됨)</div>
                                    <div style="color:#fff; font-size:24px; font-weight:800; font-variant-numeric: tabular-nums;">${fmt(totalB)}</div>
                                </div>
                                <div style="background:linear-gradient(145deg, #1f2937 0%, #111827 100%); border:1px solid #374151; padding:24px; border-radius:16px; box-shadow:0 4px 6px rgba(0,0,0,0.3);">
                                    <div style="color:#9ca3af; font-size:13px; margin-bottom:8px; font-weight:600;">현재 총 시세</div>
                                    <div style="color:#60a5fa; font-size:24px; font-weight:800; font-variant-numeric: tabular-nums;">${fmt(totalC)}</div>
                                </div>
                                <div style="background:linear-gradient(145deg, #064e3b 0%, #022c22 100%); border:1px solid #059669; padding:24px; border-radius:16px; position:relative; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.3);">
                                    <div style="position:absolute; right:-10px; top:-10px; opacity:0.1; font-size:80px;">📈</div>
                                    <div style="color:#a7f3d0; font-size:13px; margin-bottom:8px; font-weight:600;">총 세후 순수익 (예상)</div>
                                    <div style="color:#34d399; font-size:24px; font-weight:800; font-variant-numeric: tabular-nums;">+${fmtEok(totalN)} <span style="font-size:14px; opacity:0.8;">(${(totalB > 0 ? (totalN/totalB*100).toFixed(1) : 0)}%)</span></div>
                                </div>
                            </div>

                            <!-- Cards Grid -->
                            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:20px;">
                                ${filtered.length > 0 ? filtered.map(p => {
                                    const isExitTarget = p.taxInfo.roi >= 30;
                                    const cardStyle = isExitTarget 
                                        ? 'border:1px solid #d97706; box-shadow: 0 4px 15px rgba(217, 119, 6, 0.15); background:linear-gradient(180deg, #1f2937 0%, #291d10 100%);' 
                                        : 'border:1px solid #374151; background:#1f2937; box-shadow: 0 4px 6px rgba(0,0,0,0.2);';
                                    
                                    return `
                                    <div style="border-radius:16px; padding:24px; ${cardStyle} position:relative; transition: transform 0.2s;">
                                        ${isExitTarget ? `<div style="position:absolute; top:-12px; right:16px; background:linear-gradient(90deg, #f59e0b, #d97706); color:#fff; font-size:11px; font-weight:900; padding:4px 12px; border-radius:12px; box-shadow:0 2px 4px rgba(0,0,0,0.3); border:1px solid #fbbf24;">🔥 EXIT 추천 (ROI 30%+)</div>` : ''}
                                        
                                        <!-- Header -->
                                        <div style="display:flex; justify-content:space-between; margin-bottom:16px; align-items:flex-start;">
                                            <div style="flex-grow:1; padding-right:12px;">
                                                <span style="font-size:11px; background:#374151; color:#e5e7eb; padding:3px 8px; border-radius:6px; margin-bottom:8px; display:inline-block; font-weight:600;">${p.loc || '지역미상'}</span>
                                                <div style="font-size:18px; font-weight:800; color:#fff; word-break:keep-all; line-height:1.3;">${p.name}</div>
                                            </div>
                                            <div style="text-align:right; flex-shrink:0;">
                                                <div style="font-size:14px; font-weight:800; color:#f3f4f6; background:#4b5563; padding:2px 8px; border-radius:4px;">${p.owner}</div>
                                                <div style="font-size:11px; color:#9ca3af; margin-top:4px; font-weight:600;">${p.taxInfo.type} 적용</div>
                                            </div>
                                        </div>
                                        
                                        <!-- Body: Financials -->
                                        <div style="background:#111827; border-radius:10px; padding:16px; margin-bottom:16px; border:1px solid #1f2937;">
                                            <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:13px; align-items:center;">
                                                <span style="color:#9ca3af; font-weight:500;">최초 취득가</span>
                                                <span style="color:#d1d5db; font-weight:600; font-variant-numeric: tabular-nums;">${fmt(p.buyPrice)}</span>
                                            </div>
                                            <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:800; align-items:center;">
                                                <span style="color:#9ca3af;">현재 시세/매각가</span>
                                                <span style="color:#60a5fa; font-variant-numeric: tabular-nums;">${fmt(p.value)}</span>
                                            </div>
                                        </div>
                                        
                                        <!-- Footer: ROI -->
                                        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #4b5563; padding-top:16px;">
                                            <span style="font-size:13px; color:#9ca3af; font-weight:600;">세후 양도차익</span>
                                            ${p.taxInfo.gain > 0 ? 
                                                `<div style="text-align:right;">
                                                    <div style="color:#10b981; font-size:20px; font-weight:900; letter-spacing:-0.5px;">+${fmtEok(p.taxInfo.netProfit)}</div>
                                                    <div style="color:#34d399; font-size:12px; font-weight:600; margin-top:2px;">수익률 ${p.taxInfo.roi.toFixed(1)}%</div>
                                                </div>` 
                                                : `<div style="color:#9ca3af; font-size:14px; font-weight:bold;">-</div>`
                                            }
                                        </div>
                                    </div>
                                    `;
                                }).join('') : `<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#9ca3af; background:linear-gradient(180deg, #1f2937 0%, #111827 100%); border-radius:16px; border:1px dashed #374151; font-size:16px; font-weight:500;">조건에 맞는 매물이 없습니다.</div>`}
                            </div>
                        </div>
                    `;
                    document.getElementById('view-properties').innerHTML = html;
                    
                    // Maintain focus on search bar after re-render
                    const input = document.getElementById('prop-search');
                    if (input && query) {
                        input.focus();
                        const len = input.value.length;
                        input.setSelectionRange(len, len);
                    }
                };
                
                window.renderProperties();
                propertiesInitialized = true;
            } catch (e) {
                console.error(e);
                propView.innerHTML = `<div style="text-align:center; padding-top:60px; color:#ef4444;"><div style="font-size:40px; margin-bottom:16px;">⚠️</div>데이터 연동 중 오류가 발생했습니다.</div>`;
            }
        }
"""

# We need to replace the exact block of `async function initDataEngine() { ... }`
start_idx = html.find('async function initDataEngine() {')
if start_idx == -1:
    print("Could not find initDataEngine")
else:
    # Find the closing brace of initDataEngine
    end_idx = -1
    stack = 0
    in_str = False
    str_char = ''
    # start from start_idx
    for i in range(start_idx, len(html)):
        c = html[i]
        if in_str:
            if c == str_char and html[i-1] != '\\':
                in_str = False
        else:
            if c in ("'", '"', '`'):
                in_str = True
                str_char = c
            elif c == '{':
                stack += 1
            elif c == '}':
                stack -= 1
                if stack == 0:
                    end_idx = i
                    break
    
    if end_idx != -1:
        new_html = html[:start_idx] + new_data_engine.strip() + html[end_idx+1:]
        with open('index_beta.html', 'w', encoding='utf-8') as f:
            f.write(new_html)
        print("Updated successfully")
    else:
        print("Could not parse bounds")
