const fs = require('fs');
const gasData = JSON.parse(fs.readFileSync('full_data.json', 'utf8'));

let rawData = {
    properties: [], sold_properties: [], dev_alerts: [], rents: [], debts: [], owners: []
};

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
    let propKey = keys.find(k => k.replace(/\s/g,'').includes('매입부동산')) || '매입부동산';
    let rentKey = keys.find(k => k.replace(/\s/g,'').includes('RentRoll') || k.replace(/\s/g,'').includes('렌트롤')) || 'RentRoll';
    let debtKey = keys.find(k => k.replace(/\s/g,'').includes('부채관리')) || '부채관리';
    
    console.log("PropKey:", propKey);
    console.log("RentKey:", rentKey);
    console.log("DebtKey:", debtKey);

    const propSheet = gasData[propKey] || [];
    const rentSheet = gasData[rentKey] || [];
    const debtSheet = gasData[debtKey] || [];
    
    if (propSheet.length === 0) {
        console.error("⚠️ 데이터를 찾지 못했습니다!", keys);
    }

    const allProps = [];
    propSheet.forEach(row => {
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
            'buy_price': safeFloat(row[buyPriceKey]),
            'status': safeStr(row[statKey]),
            'dev_stage': safeStr(row[devKey]),
            'exit_strategy': safeStr(row[exitKey]),
            'tax_note': safeStr(row[taxKey]),
            'memo': memoParts.join(" / ")
        });
    });

    rawData.properties = allProps.filter(p => !p.status.includes('매각완료'));
    console.log("Parsed Properties:", rawData.properties.length);
    if(rawData.properties.length > 0) {
        console.log("Sample property value:", rawData.properties[0].value);
    }
}

processGASData(gasData);
