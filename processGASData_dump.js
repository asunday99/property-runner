function processGASData(gasData) {
        const keys = Object.keys(gasData);
        // Fuzzy matching logic
        let propKey = keys.find(k => k.replace(/\s/g,'').includes('매입부동산')) || '매입부동산';
        let rentKey = keys.find(k => k.replace(/\s/g,'').includes('RentRoll') || k.replace(/\s/g,'').includes('렌트롤')) || 'RentRoll';
        let debtKey = keys.find(k => k.replace(/\s/g,'').includes('부채관리')) || '부채관리';
        
        const propSheet = gasData[propKey] || [];
        const rentSheet = gasData[rentKey] || [];
        const debtSheet = gasData[debtKey] || [];
        
        if (propSheet.length === 0) {
            console.error("Available tabs:", keys);
            alert("⚠️ 데이터를 찾지 못했습니다! 구글 시트의 탭 이름이 '매입부동산'인지 확인해주세요. 현재 발견된 탭: " + keys.join(", "));
        }

        const allProps = [];
        propSheet.forEach(row => {
            // Flexible matching for '소유주'
            let ownerKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '소유주') || '소유주';
            let memoKey = Object.keys(row).find(k => k.includes('비고')) || '비고';
            let owner8Key = Object.keys(row).find(k => k.includes('분양')) || '아파트 분양 받을 명의자 (8명)';
            let idKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '자산ID') || '자산ID';
            let typeKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '유형') || '유형';
            let valKey = Object.keys(row).find(k => k.includes('현재시세')) || '현재시세/매각금액';
            let invKey = Object.keys(row).find(k => k.includes('실투자금')) || '실투자금';
            let futKey = Object.keys(row).find(k => k.includes('미래가치')) || '미래가치';
            let nameKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '주소') || '주소';
            let buyDateKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '취득일') || '취득일';
            let buyPriceKey = Object.keys(row).find(k => k.includes('취득가')) || '취득가';
            let statKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '상태') || '상태';
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
                'buy_price': safeFloat(row[buyPriceK