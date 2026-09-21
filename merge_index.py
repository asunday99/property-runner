import re

with open('index.html', 'r', encoding='utf-8-sig') as f:
    html = f.read()

# 1. Find the start and end of the rawData script block
start_idx = html.find('<script>\n        const rawData =')
if start_idx == -1:
    start_idx = html.find('<script>\n    const rawData =')
if start_idx == -1:
    start_idx = html.find('<script>\n        let rawData =')
if start_idx == -1:
    start_idx = html.find('<script>')

end_idx = html.find('</script>', start_idx) + 9
old_block = html[start_idx:end_idx]

# 2. Define the new robust fetch logic
replacement = '''<script>
    let rawData = {
        properties: [], sold_properties: [], dev_alerts: [], rents: [], debts: [], owners: []
    };
    const GAS_URL = "https://script.google.com/macros/s/AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz/exec";

    function showLoading() {
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = '#0f172a';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.color = '#fff';
        
        overlay.innerHTML = 
            <div style="width: 50px; height: 50px; border: 5px solid #334155; border-top-color: #4ade80; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <h2 style="margin-top: 20px;">구글 시트 연동 중...</h2>
            <p style="color: #94a3b8;">최신 데이터를 가져오고 있습니다.</p>
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        ;
        document.body.appendChild(overlay);
    }

    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if(overlay) overlay.remove();
    }

    function safeFloat(val) {
        if(val === null || val === undefined || val === '') return 0;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    }

    function safeStr(val) {
        if(val === null || val === undefined) return '';
        return String(val).trim();
    }

    function processGASData(gasData) {
        const keys = Object.keys(gasData);
        let propKey = keys.find(k => k.replace(/\\s/g,'').includes('매입부동산')) || '매입부동산';
        let rentKey = keys.find(k => k.replace(/\\s/g,'').includes('RentRoll') || k.replace(/\\s/g,'').includes('렌트롤')) || 'RentRoll';
        let debtKey = keys.find(k => k.replace(/\\s/g,'').includes('부채관리')) || '부채관리';
        
        const propSheet = gasData[propKey] || [];
        const rentSheet = gasData[rentKey] || [];
        const debtSheet = gasData[debtKey] || [];
        
        if (propSheet.length === 0) {
            console.error("데이터 로드 실패, 사용 가능한 시트 탭:", keys);
            alert("⚠️ 데이터를 찾지 못했습니다! 발견된 탭: " + keys.join(", "));
        }

        const allProps = [];
        propSheet.forEach(row => {
            let ownerKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '소유주') || '소유주';
            let memoKey = Object.keys(row).find(k => k.includes('비고')) || '비고';
            let owner8Key = Object.keys(row).find(k => k.includes('분양')) || '아파트 분양 받을 명의자 (8명)';
            let idKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '자산ID') || '자산ID';
            let typeKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '유형') || '유형';
            let valKey = Object.keys(row).find(k => k.includes('현재시세')) || '현재시세/매각금액';
            let invKey = Object.keys(row).find(k => k.includes('실투자금')) || '실투자금';
            let futKey = Object.keys(row).find(k => k.includes('미래가치')) || '미래가치';
            let nameKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '주소') || '주소';
            let buyDateKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '취득일') || '취득일';
            let buyPriceKey = Object.keys(row).find(k => k.includes('취득가')) || '취득가';
            let statKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '상태') || '상태';
            let devKey = Object.keys(row).find(k => k.includes('개발')) || '개발 진행단계';
            let exitKey = Object.keys(row).find(k => k.includes('매도') || k.includes('전략')) || '매도/보유 전략';
            let taxKey = Object.keys(row).find(k => k.includes('비과세')) || '비과세적용';

            const owner = safeStr(row[ownerKey]);
            if(!owner || owner === 'nan') return;

            let memoParts = [];
            if(safeStr(row[memoKey])) memoParts.push(safeStr(row[memoKey]));
            if(safeStr(row[owner8Key])) memoParts.push("분양: " + safeStr(row[owner8Key]));

            allProps.push({
                'id': safeStr(row[idKey]),
                'owner': owner,
                'type': safeStr(row[typeKey]),
                'value': safeFloat(row[valKey]),
                'invest': safeFloat(row[invKey]),
                'future': safeFloat(row[futKey]),
                'name': safeStr(row[nameKey]),
                'buy_date': safeStr(row[buyDateKey]),
                'buy_price': safeFloat(row[buyPriceKey]),
                'status': safeStr(row[statKey]),
                'dev_stage': safeStr(row[devKey]),
                'exit_strategy': safeStr(row[exitKey]),
                'tax_note': safeStr(row[taxKey]),
                'memo': memoParts.join(" / ")
            });
        });

        rawData.properties = allProps.filter(p => !p.status.includes('매각완료'));
        rawData.sold_properties = allProps.filter(p => p.status.includes('매각완료'));
        rawData.sold_properties.forEach(p => {
            const profit = p.value - p.invest;
            p.roi = p.invest > 0 ? (profit / p.invest * 100) : 0;
        });

        rawData.dev_alerts = rawData.properties.filter(p => 
            p.dev_stage.includes('조합') || p.dev_stage.includes('관리처분') || 
            p.exit_strategy.includes('조합') || p.exit_strategy.includes('관리처분')
        );

        const propOwnerMap = {};
        allProps.forEach(p => propOwnerMap[p.id] = p.owner);

        rentSheet.forEach(row => {
            let bldgKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '건물명') || '건물명';
            let rIdKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '자산ID') || '자산ID';
            let ddayKey = Object.keys(row).find(k => k.replace(/\\s/g,'').toUpperCase() === 'D-DAY') || 'D-Day';
            let roomKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '호수') || '호수';
            let tenKey = Object.keys(row).find(k => k.replace(/\\s/g,'').includes('임차인')) || '임차인명';
            let depKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '보증금') || '보증금';
            let rentMKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '월세') || '월세';
            let endKey = Object.keys(row).find(k => k.includes('종료')) || '계약종료일';

            const bldg = safeStr(row[bldgKey]);
            if(!bldg || bldg === 'nan') return;
            const dday = safeFloat(row[ddayKey]);
            
            const rId = safeStr(row[rIdKey]);
            rawData.rents.push({
                'id': rId,
                'bldg': bldg,
                'room': safeStr(row[roomKey]),
                'tenant': safeStr(row[tenKey]),
                'deposit': safeFloat(row[depKey]),
                'rent': safeFloat(row[rentMKey]),
                'dday': dday !== 0 ? Math.floor(dday) : 9999,
                'end_date': safeStr(row[endKey]),
                'owner': propOwnerMap[rId] || '기타'
            });
        });

        debtSheet.forEach(row => {
            let bKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '차주') || '차주';
            let pKey = Object.keys(row).find(k => k.replace(/\\s/g,'') === '차용금') || '차용금';
            let mKey = Object.keys(row).find(k => k.includes('이자비용')) || '월이자비용';

            const borrower = safeStr(row[bKey]);
            if(!borrower || borrower === 'nan') return;
            rawData.debts.push({
                'borrower': borrower,
                'principal': safeFloat(row[pKey]),
                'monthly_interest': safeFloat(row[mKey])
            });
        });

        const ownerSet = new Set(allProps.map(p => p.owner));
        rawData.owners = Array.from(ownerSet).sort();
    }

    document.addEventListener("DOMContentLoaded", () => {
        showLoading();
        fetch(GAS_URL + "?t=" + new Date().getTime())
            .then(res => res.json())
            .then(gasData => {
                processGASData(gasData);
                hideLoading();
                
                // Initialize default tab
                const firstTabBtn = document.querySelector('.nav-btn');
                if (firstTabBtn) switchTab('dashboard', firstTabBtn);
                
                // Call initRunnerView if we are on it, or we can just initialize everything
                try { renderDashboard(); } catch(e){}
                try { renderRentRoll(); } catch(e){}
                try { renderProperties(); } catch(e){}
                try { initRunnerView(); } catch(e){}
            })
            .catch(err => {
                console.error("Fetch error:", err);
                hideLoading();
                alert("구글 시트 데이터를 불러오지 못했습니다. 에러: " + err);
            });
    });
</script>'''

html = html.replace(old_block, replacement)

# 3. Remove window.onload that might interfere
html = re.sub(r'window\.onload\s*=\s*\(\)\s*=>\s*\{.*?switchTab.*?\};\s*', '', html, flags=re.DOTALL)
html = re.sub(r'window\.onload\s*=\s*\(\)\s*=>\s*switchTab.*?;\s*', '', html)

# 4. Add PWA meta tags if missing
meta_tags = '''
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="manifest" href="manifest.json">
    <title>PROPERTY333</title>
'''
if '<link rel="manifest" href="manifest.json">' not in html:
    html = re.sub(r'<title>.*?</title>', meta_tags.strip(), html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
