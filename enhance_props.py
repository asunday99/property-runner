import json, re

with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Enhance parsedProps logic
m_old_map = re.search(r'const parsedProps = propSheet.map\(row => \{.*?return \{.*?\};\s*\}\);', html, re.DOTALL)
if m_old_map:
    old_map = m_old_map.group(0)
    new_map = r'''
                window.globalExitRules = { minROI: 30 }; // Phase 3 prep

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
                    let nameKey = rKeys.find(k => k.replace(/\s/g,'') === '주소') || '주소';
                    let ownerKey = rKeys.find(k => k.replace(/\s/g,'') === '소유주') || '소유주';
                    let valKey = rKeys.find(k => k.includes('현재시세') || k.includes('매각금액')) || '현재시세/매각금액';
                    let locKey = rKeys.find(k => k.replace(/\s/g,'') === '지역') || '지역';
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
'''
    html = html.replace(old_map, new_map)

# Enhance HTML Generation
m_old_html = re.search(r'<div style="text-align:right;">.*?<div style="color:#60a5fa; font-size:12px; margin-top:4px;">\$\{p\.loc\}</div>\s*</div>', html, re.DOTALL)
if m_old_html:
    old_html_gen = m_old_html.group(0)
    new_html_gen = r'''<div style="text-align:right;">
                                        <div style="color:#10b981; font-weight:bold;">${p.value ? '시세/매각가: ' + p.value.toLocaleString() + '원' : '-'}</div>
                                        ${p.taxInfo && p.taxInfo.gain > 0 ? `<div style="color:#f87171; font-size:12px; margin-top:4px; border: 1px solid #7f1d1d; padding:2px 6px; border-radius:4px; display:inline-block; background:#450a0a;">예상차익: +${(p.taxInfo.gain / 100000000).toFixed(1)}억 (세후수익률: ${p.taxInfo.roi.toFixed(1)}%)</div>` : ''}
                                        <div style="color:#60a5fa; font-size:12px; margin-top:4px;">${p.loc}</div>
                                    </div>'''
    html = html.replace(old_html_gen, new_html_gen)

# Remove the dashHTML dummy replacement
html = re.sub(r'const dashHTML = `.*?`;\s*if\(document\.getElementById\(\'view-dashboard\'\)\) document\.getElementById\(\'view-dashboard\'\)\.innerHTML = dashHTML;', '', html, flags=re.DOTALL)

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Enhanced properties logic.")
