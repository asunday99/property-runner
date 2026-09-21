with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Inject CSS
css_injection = """
        .drawer-divider { width: 100%; height: 1px; background-color: #292929; margin-bottom: 30px; }
        
        /* Accordion CSS for Properties Page */
        .accordion-content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; }
        .accordion-item.active .accordion-content { max-height: 500px; }
        .filter-btn { padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 500; border: 1px solid #374151; color: #9ca3af; background: #1f2937; cursor: pointer; transition: all 0.2s; }
        .filter-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; }
"""
html = html.replace('.drawer-divider { width: 100%; height: 1px; background-color: #292929; margin-bottom: 30px; }', css_injection)

# 2. Update initDataEngine
old_engine_marker = "async function initDataEngine() {"
new_engine = """async function initDataEngine() {
            if (propertiesInitialized) return;
            const propView = document.getElementById('view-properties');
            propView.innerHTML = `<div style="text-align:center; padding-top:40px; color:#9ca3af;">데이터를 불러오는 중입니다... (약 20~50초 소요될 수 있습니다)</div>`;
            try {
                const response = await fetch(GAS_URL + "?t=" + new Date().getTime());
                const rawData = await response.json();
                
                const keys = Object.keys(rawData);
                let propKey = keys.find(k => k.replace(/\\s/g,'').includes('매입부동산')) || '매입부동산';
                const propSheet = rawData[propKey] || [];
                
                window.globalData = { props: propSheet, raw: rawData };
                
                function formatMoney(num) {
                    if (!num || isNaN(num)) return '-';
                    return new Intl.NumberFormat('ko-KR').format(Math.round(num)) + '원';
                }

                // 엑셀 원본 구조에 맞춘 데이터 파싱
                const parsedProps = propSheet.map(row => {
                    let rKeys = Object.keys(row);
                    const getVal = (keywords) => {
                        for (let k of rKeys) {
                            for (let kw of keywords) {
                                if (k.replace(/\\s/g,'').includes(kw)) return row[k];
                            }
                        }
                        return '';
                    };

                    let owner = getVal(['소유주']);
                    let manager = getVal(['관리주체']);
                    let status = getVal(['상태']);
                    let type = getVal(['유형']);
                    let buyDate = getVal(['취득일']);
                    let buyPriceStr = getVal(['취득가(세금포함)', '취득가']).toString().replace(/,/g, '').replace(/[^0-9.-]+/g,"");
                    let currentPriceStr = getVal(['현재시세', '매각금액']).toString().replace(/,/g, '').replace(/[^0-9.-]+/g,"");
                    let investStr = getVal(['실투자금']).toString().replace(/,/g, '').replace(/[^0-9.-]+/g,"");
                    let address = getVal(['주소', '소재지']);
                    let strategy = getVal(['매도/보유', '전략']);
                    let devStage = getVal(['개발진행단계', '진행단계']);

                    let buyPrice = parseFloat(buyPriceStr) || 0;
                    let currentPrice = parseFloat(currentPriceStr) || 0;
                    let invest = parseFloat(investStr) || 0;

                    // 세금 계산 모듈 (세후수익률)
                    let gain = 0; let netProfit = 0; let roi = 0;
                    if (buyPrice > 0 && currentPrice > buyPrice) {
                        gain = currentPrice - buyPrice;
                        let isCorp = manager.includes('법인');
                        let taxRate = isCorp ? 0.40 : 0.45; // 러프한 모델
                        let tax = gain * taxRate;
                        netProfit = gain - tax;
                        roi = (netProfit / buyPrice) * 100;
                    }

                    return {
                        owner: owner || '미상',
                        manager: manager || '-',
                        status: status || '-',
                        type: type || '-',
                        buyDate: buyDate || '-',
                        buyPrice: buyPrice,
                        currentPrice: currentPrice,
                        invest: invest,
                        address: address || '이름 없음',
                        strategy: strategy || '-',
                        devStage: devStage || '-',
                        gain: gain,
                        netProfit: netProfit,
                        roi: roi
                    };
                });

                // 필터링 기능 및 UI 렌더링
                const owners = [...new Set(parsedProps.map(p => p.owner).filter(o => o !== '미상'))];
                if (!owners.includes('전체')) owners.unshift('전체');

                const renderUI = (selectedOwner) => {
                    let filtered = parsedProps;
                    if (selectedOwner !== '전체') {
                        filtered = parsedProps.filter(p => p.owner === selectedOwner);
                    }

                    const filterHTML = `
                        <div class="flex flex-wrap gap-2 mb-6 border-b border-slate-700 pb-4">
                            ${owners.map(o => `
                                <button class="filter-btn ${o === selectedOwner ? 'active' : ''}" onclick="window.renderPropUI('${o}')">${o}</button>
                            `).join('')}
                        </div>
                    `;

                    let listHTML = filtered.map(p => {
                        let bg = p.status.includes('운용') ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50' : 'bg-slate-700 text-slate-300';
                        return `
                            <div class="accordion-item bg-slate-800 border border-slate-700 rounded-lg overflow-hidden mb-3">
                                <div class="p-4 cursor-pointer hover:bg-slate-700/50 flex justify-between items-center" onclick="this.parentElement.classList.toggle('active')">
                                    <div>
                                        <span class="text-xs px-2 py-0.5 rounded mr-2 border ${bg}">${p.status}</span>
                                        <span class="font-bold text-slate-200">${p.address}</span>
                                    </div>
                                    <div class="text-right flex flex-col items-end">
                                        <span class="text-emerald-400 font-bold text-sm">${formatMoney(p.currentPrice)}</span>
                                        ${p.gain > 0 ? `<span class="text-xs text-red-400 mt-1 bg-red-900/30 px-2 py-0.5 rounded border border-red-900/50">예상차익: +${(p.gain/100000000).toFixed(1)}억 (세후수익률: ${p.roi.toFixed(1)}%)</span>` : ''}
                                    </div>
                                </div>
                                <div class="accordion-content bg-slate-900/50 border-t border-slate-700">
                                    <div class="p-4 space-y-3 text-sm">
                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <span class="text-slate-500 block mb-1">관리주체 / 소유주</span>
                                                <span class="text-slate-200">${p.manager} / ${p.owner}</span>
                                            </div>
                                            <div>
                                                <span class="text-slate-500 block mb-1">자산유형</span>
                                                <span class="text-slate-200">${p.type}</span>
                                            </div>
                                            <div>
                                                <span class="text-slate-500 block mb-1">취득일 / 취득가</span>
                                                <span class="text-slate-200">${p.buyDate} / ${formatMoney(p.buyPrice)}</span>
                                            </div>
                                            <div>
                                                <span class="text-slate-500 block mb-1">실투자금</span>
                                                <span class="text-slate-200">${formatMoney(p.invest)}</span>
                                            </div>
                                        </div>
                                        <div class="border-t border-slate-700/50 pt-3">
                                            <span class="text-slate-500 block mb-1">매도/보유 전략 (엑시트 가이드라인)</span>
                                            <p class="text-blue-300 font-medium">${p.strategy}</p>
                                        </div>
                                        <div class="border-t border-slate-700/50 pt-3">
                                            <span class="text-slate-500 block mb-1">개발 진행단계</span>
                                            <p class="text-slate-300">${p.devStage}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');

                    if (filtered.length === 0) listHTML = `<div style="padding:20px; color:#9ca3af; text-align:center;">데이터가 없습니다.</div>`;

                    propView.innerHTML = `
                        <div style="max-width:900px; margin:0 auto; padding-bottom: 50px;">
                            <h2 style="font-size:24px; margin-bottom:10px; font-weight:bold; color:white;">🏢 매입부동산 상세 (통합 뷰)</h2>
                            <p style="color:#9ca3af; font-size:14px; margin-bottom:20px;">대표님의 원본 엑셀 시트 구조를 그대로 반영하여, '관리주체(법인/개인)'를 기준으로 세금을 연산하고 엑시트 전략을 표시합니다.</p>
                            ${filterHTML}
                            <div id="prop-list-container">
                                ${listHTML}
                            </div>
                        </div>
                    `;
                };

                window.renderPropUI = renderUI;
                renderUI('전체');

                propertiesInitialized = true;
            } catch (e) {
                console.error(e);
                propView.innerHTML = `<div style="text-align:center; padding-top:40px; color:#ef4444;">데이터 연동 중 오류가 발생했습니다.</div>`;
            }
        }"""
        
import re
# Regex to match the old initDataEngine function entirely
m = re.search(r'async function initDataEngine\(\)\s*\{.*?\n        }', html, re.DOTALL)
if m:
    html = html.replace(m.group(0), new_engine)

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index_beta.html successfully.")
