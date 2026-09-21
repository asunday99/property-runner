// taxEngine.js - 소유주 맞춤형 세금 및 수익률(ROI) 계산 모듈

class TaxEngine {
    constructor() {
        // 법인세율 및 누진공제 (단순화된 모델, 필요시 세부 조정)
        this.corpTaxRate = 0.40; 
        this.individualTaxRate = 0.45; 
    }

    /**
     * 소유주 이름을 기반으로 법인 여부 판별
     * @param {string} owner - 소유주 텍스트
     * @returns {boolean} 법인 여부
     */
    isCorporation(owner) {
        if (!owner) return false;
        const o = owner.replace(/\s/g, '');
        return o.includes('법인') || o.includes('주식회사') || o.includes('(주)');
    }

    /**
     * 취득가와 현재시세를 바탕으로 세후 수익금과 ROI 계산
     * @param {number} buyPrice - 취득가
     * @param {number} currentPrice - 현재시세(매각예상가)
     * @param {string} owner - 소유주 텍스트
     * @param {string} buyDate - 취득일 (향후 장기보유특별공제용)
     * @returns {Object} 세금 및 수익률 결과 객체
     */
    calculateROI(buyPrice, currentPrice, owner, buyDate = null) {
        if (!buyPrice || !currentPrice || buyPrice >= currentPrice) {
            return { gain: 0, netProfit: 0, roi: 0, tax: 0, type: '알수없음' };
        }

        const gain = currentPrice - buyPrice;
        const isCorp = this.isCorporation(owner);
        const type = isCorp ? '법인' : '개인';
        
        // TODO: buyDate를 활용한 장기보유특별공제(개인) 로직 확장 공간
        
        const tax = isCorp ? (gain * this.corpTaxRate) : (gain * this.individualTaxRate);
        const netProfit = gain - tax;
        const roi = (netProfit / buyPrice) * 100;

        return {
            gain: gain,
            tax: tax,
            netProfit: netProfit,
            roi: roi,
            type: type
        };
    }
}

window.taxEngine = new TaxEngine();
