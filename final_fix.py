import re

with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

new_js = r'''
        const GAS_URL = "https://script.google.com/macros/s/AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz/exec";
        window.globalData = null;

        async function initDataEngine() {
            try {
                const response = await fetch(GAS_URL + "?t=" + new Date().getTime());
                const rawData = await response.json();
                
                const keys = Object.keys(rawData);
                let propKey = keys.find(k => k.replace(/\s/g,'').includes('매입부동산')) || '매입부동산';
                const propSheet = rawData[propKey] || [];
                
                window.globalData = { props: propSheet, raw: rawData };
                
                const parsedProps = propSheet.map(row => {
                    let rKeys = Object.keys(row);
                    let nameKey = rKeys.find(k => k.replace(/\s/g,'') === '주소') || '주소';
                    let ownerKey = rKeys.find(k => k.replace(/\s/g,'') === '소유주') || '소유주';
                    let valKey = rKeys.find(k => k.includes('현재시세') || k.includes('매각금액')) || '현재시세/매각금액';
                    let locKey = rKeys.find(k => k.replace(/\s/g,'') === '지역') || '지역';
                    
                    return {
                        name: row[nameKey] || '이름 없음',
                        owner: row[ownerKey] || '미상',
                        value: row[valKey] || 0,
                        loc: row[locKey] || ''
                    };
                });

                const propHTML = `
                    <div style="max-width:800px; margin:0 auto;">
                        <h2 style="font-size:24px; margin-bottom:20px; font-weight:bold;">🏢 매입부동산 상세</h2>
                        <div style="background:#1f2937; border-radius:12px; overflow:hidden;">
                            ${parsedProps.length > 0 ? parsedProps.map(p => `
                                <div style="padding:16px; border-bottom:1px solid #374151; display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-weight:bold; color:white; font-size:16px;">${p.name}</div>
                                        <div style="color:#9ca3af; font-size:12px; margin-top:4px;">소유주: ${p.owner}</div>
                                    </div>
                                    <div style="text-align:right;">
                                        <div style="color:#10b981; font-weight:bold;">${p.value ? '시세/매각가: ' + p.value.toLocaleString() + '원' : '-'}</div>
                                        <div style="color:#60a5fa; font-size:12px; margin-top:4px;">${p.loc}</div>
                                    </div>
                                </div>
                            `).join('') : "<div style='padding:20px; color:#9ca3af;'>데이터가 없습니다.</div>"}
                        </div>
                    </div>
                `;

                if(document.getElementById('view-properties')) document.getElementById('view-properties').innerHTML = propHTML;
                
                const dashHTML = `
                    <div style="max-width:800px; margin:0 auto; text-align:center; padding-top:40px;">
                        <h2 style="font-size:20px; color:#8ab4f8; font-weight:bold; margin-bottom:12px;">✅ 매입부동산 연동 완료!</h2>
                        <p style="color:#9ca3af;">[매입부동산] 탭을 눌러 리스트가 정상적으로 나오는지 확인해 주세요.</p>
                    </div>
                `;
                if(document.getElementById('view-dashboard')) document.getElementById('view-dashboard').innerHTML = dashHTML;

            } catch (e) {
                console.error(e);
            }
        }
'''

pattern = r'const GAS_URL = "https.*?\n\s*\}\s*catch.*?\}\s*\}'
html = re.sub(pattern, new_js, html, flags=re.DOTALL)

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.write(html)
