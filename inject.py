import re

with open('index_beta_modified2.html', 'r', encoding='utf-8') as f:
    html = f.read()

js_update = '''
                // Render Dashboard
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

                document.getElementById('view-dashboard').innerHTML = dashHTML;
                document.getElementById('view-properties').innerHTML = propHTML;
                document.getElementById('view-rentroll').innerHTML = '<h2 style="font-size:24px; margin-bottom:10px;">📁 임대관리</h2><p>✅ 엑셀 데이터 연동 중...</p>';
                document.getElementById('view-debt').innerHTML = '<h2 style="font-size:24px; margin-bottom:10px;">💳 부채관리</h2><p>✅ 엑셀 데이터 연동 중...</p>';
'''

pattern = r"// Update loading texts.*?(?=} catch)"
html = re.sub(pattern, js_update, html, flags=re.DOTALL)

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.write(html)
