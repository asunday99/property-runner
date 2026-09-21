// exitStrategy.js - 글로벌 엑시트 전략 AI 엔진

class ExitStrategyEngine {
    constructor() {
        // 글로벌 엑시트 가이드라인 (어플리케이션 전역 설정)
        this.globalExitRules = {
            targetYieldPercent: 30, // 목표 세후 수익률 (%)
            minHoldingYears: 2      // 최소 보유 기간 (년)
        };
    }

    /**
     * 로드된 매입부동산 데이터를 스캔하여 엑시트 조건에 부합하는 매물 필터링
     * @param {Array} parsedProperties - 파싱된 매입부동산 객체 배열 (taxInfo 포함)
     * @returns {Array} 엑시트 가능 매물 리스트
     */
    scanForExitCandidates(parsedProperties) {
        if (!parsedProperties || parsedProperties.length === 0) return [];
        
        return parsedProperties.filter(prop => {
            const meetsYield = prop.taxInfo && prop.taxInfo.roi >= this.globalExitRules.targetYieldPercent;
            // TODO: 취득일 기반 minHoldingYears 검증 로직 추가
            
            return meetsYield;
        });
    }

    /**
     * 엑시트 가능 매물에 대한 브리핑 텍스트(AI 리포트 형식) 생성
     * @param {Array} candidates - 엑시트 가능 매물 리스트
     * @returns {string} 브리핑 HTML 문자열
     */
    generateExitBriefing(candidates) {
        if (!candidates || candidates.length === 0) {
            return `<div style="padding:10px; color:#9ca3af;">현재 글로벌 엑시트 가이드라인(수익률 ${this.globalExitRules.targetYieldPercent}% 이상)을 충족하는 매물이 없습니다.</div>`;
        }

        let html = `<div style="padding:15px; background:#1e3a8a; border-radius:8px; margin-bottom:20px;">`;
        html += `<h3 style="color:#60a5fa; margin-top:0; margin-bottom:10px;">💡 AI 엑시트 추천 브리핑</h3>`;
        html += `<p style="color:#d1d5db; font-size:14px; margin-bottom:15px;">글로벌 가이드라인(목표수익률 ${this.globalExitRules.targetYieldPercent}% 이상)을 충족하는 매물 <strong>${candidates.length}건</strong>이 발견되었습니다.</p>`;
        
        candidates.forEach(c => {
            const gainInUk = (c.taxInfo.gain / 100000000).toFixed(1);
            const profitInUk = (c.taxInfo.netProfit / 100000000).toFixed(1);
            html += `<div style="background:#172554; padding:10px; border-radius:6px; margin-bottom:10px;">`;
            html += `<strong style="color:#ffffff;">${c.name}</strong> <span style="color:#9ca3af; font-size:12px;">(${c.owner})</span><br/>`;
            html += `<span style="color:#10b981; font-size:13px;">세후 수익률: ${c.taxInfo.roi.toFixed(1)}%</span> | `;
            html += `<span style="color:#f87171; font-size:13px;">세후 순수익: +${profitInUk}억</span>`;
            html += `</div>`;
        });
        
        html += `</div>`;
        return html;
    }
}

window.exitStrategy = new ExitStrategyEngine();
