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
            let bldgKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '건물명') || '건물명';
            let rIdKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '자산ID') || '자산ID';
            let ddayKey = Object.keys(row).find(k => k.replace(/\s/g,'').toUpperCase() === 'D-DAY') || 'D-Day';
            let roomKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '호수') || '호수';
            let tenKey = Object.keys(row).find(k => k.replace(/\s/g,'').includes('임차인')) || '임차인명';
            let depKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '보증금') || '보증금';
            let rentMKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '월세') || '월세';
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
            let bKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '차주') || '차주';
            let pKey = Object.keys(row).find(k => k.replace(/\s/g,'') === '차용금') || '차용금';
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
                switchTab('dashboard', document.querySelector('.nav-btn'));
            })
            .catch(err => {
                console.error("Fetch error:", err);
                hideLoading();
                alert("구글 시트 데이터를 불러오지 못했습니다. 에러: " + err);
            });
    });
</script>

    <!-- 티커 -->
    <div class="ticker-wrap">
        <div class="ticker">
            <span class="ticker-item">[USD/KRW 환율] <span>1,345.86</span></span>
            <span class="ticker-item">[VIX 지수] <span>17.56</span></span>
            <span class="ticker-item">[미국 10년 국채금리] <span>4.98%</span></span>
            <span class="ticker-item">[한국 기준금리] <span>3.50%</span></span>
            <span class="ticker-item text-slate-500 text-xs">※ 구글 시트 실시간 연동</span>
        </div>
    </div>

    <div class="max-w-6xl mx-auto p-4 md:p-8 mt-4">
        <header class="mb-4">
            <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">부동산의 신</h1>
            <p class="text-slate-400 text-sm mt-2">Executive Multi-View System</p>
        </header>

        <div class="flex border-b border-slate-700 mb-6 overflow-x-auto whitespace-nowrap custom-scrollbar">
            <button class="nav-btn active" onclick="switchTab('dashboard', this)">📊 대시보드</button>
            <button class="nav-btn" onclick="switchTab('investor', this)">👤 투자자별 자산 및 성과</button>
            <button class="nav-btn" onclick="switchTab('rentroll', this)">🏢 렌트롤 관리</button>
        </div>

        <!-- 1. DASHBOARD TAB -->
        <div id="tab-dashboard" class="tab-content active">
            <div class="card mb-6 bg-gradient-to-br from-slate-800 to-slate-900 border-blue-900/30">
                <div class="flex justify-between items-end mb-4">
                    <h2 class="text-xl font-bold text-slate-300">🏁 통합 포트폴리오 <span class="text-blue-400">500억</span> 달성 목표</h2>
                    <div class="text-right">
                        <span id="dash-goal-pct" class="text-emerald-400 text-3xl font-black">0%</span>
                        <p class="text-slate-400 text-sm font-bold mt-1">D-1569</p>
                    </div>
                </div>
                <div class="w-full bg-slate-900 rounded-full h-5 mb-2 shadow-inner">
                    <div id="dash-goal-bar" class="bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-400 h-5 rounded-full relative" style="width: 0%; transition: width 1s ease-out;">
                        <div class="absolute top-0 right-0 bottom-0 w-10 bg-white/20 blur-sm rounded-full"></div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <!-- 요약 & 그래프 -->
                <div class="card">
                    <h3 class="text-lg font-bold text-slate-300 mb-5 border-b border-slate-700 pb-3 flex items-center justify-between">
                        <span><span class="mr-2">📈</span> 통합 포트폴리오 가치 성장</span>
                        <span id="dash-prop-count" class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">0건</span>
                    </h3>
                    <div class="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div class="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <span class="text-slate-400 block mb-1">총 실투자금</span>
                            <span id="dash-val-invest" class="font-bold text-lg text-slate-300">0 원</span>
                        </div>
                        <div class="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <span class="text-slate-400 block mb-1">총 평가금액 (현재시세)</span>
                            <span id="dash-val-total" class="font-extrabold text-lg text-emerald-400">0 원</span>
                        </div>
                    </div>
                    <div class="h-48 w-full relative">
                        <canvas id="growthChart"></canvas>
                    </div>
                </div>

                <!-- 자산 비중 -->
                <div class="card">
                    <h3 class="text-lg font-bold text-slate-300 mb-6 border-b border-slate-700 pb-3 flex items-center">
                        <span class="mr-2">🥧</span> 자산 비중 요약
                    </h3>
                    <div class="flex flex-col md:flex-row items-center justify-around py-4">
                        <div id="dash-alloc-bar" class="w-full mb-6 md:mb-0 flex h-10 rounded-full overflow-hidden shadow-inner bg-slate-800 transition-all duration-500"></div>
                    </div>
                    <div id="dash-alloc-legend" class="grid grid-cols-2 gap-4 text-sm mt-2 px-2"></div>
                </div>
                
                <!-- 재개발 엑시트 알림 -->
                <div class="card border-blue-900/30 relative overflow-hidden flex flex-col">
                    <div class="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
                    <h3 class="text-lg font-bold text-blue-400 mb-5 border-b border-blue-900/50 pb-3 flex items-center justify-between">
                        <span><span class="mr-2 animate-pulse">🚧</span> 재개발/재건축 엑시트 타점 알림</span>
                        <span id="dash-dev-count" class="text-xs bg-blue-900/40 px-2 py-1 rounded text-blue-300">0건</span>
                    </h3>
                    <ul id="dash-dev-list" class="space-y-3 text-sm flex-1 overflow-y-auto pr-2" style="max-height: 250px;"></ul>
                    <p id="dash-no-dev" class="text-slate-500 text-center py-8 hidden">해당되는 엑시트 알림이 없습니다.</p>
                </div>

                <!-- 만기 알림 -->
                <div class="card border-red-900/30 relative overflow-hidden flex flex-col">
                    <div class="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 blur-3xl rounded-full pointer-events-none"></div>
                    <h3 class="text-lg font-bold text-red-400 mb-5 border-b border-red-900/50 pb-3 flex items-center justify-between">
                        <span><span class="mr-2 animate-pulse">🚨</span> 180일 이내 만기 알림</span>
                        <span id="dash-warning-count" class="text-xs bg-red-900/40 px-2 py-1 rounded text-red-300">0건</span>
                    </h3>
                    <ul id="dash-warning-list" class="space-y-3 text-sm flex-1 overflow-y-auto pr-2" style="max-height: 250px;"></ul>
                    <p id="dash-no-warnings" class="text-slate-500 text-center py-8 hidden">해당되는 만기 알림이 없습니다.</p>
                </div>
            </div>
        </div>

        <!-- 2. INVESTOR TAB -->
        <div id="tab-investor" class="tab-content">
            <div class="mb-6 flex flex-wrap gap-2" id="inv-filter-container"></div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- 개인 요약 & 부채 비율 그래프 -->
                <div class="card lg:col-span-1 h-fit space-y-6">
                    <div>
                        <h3 class="text-lg font-bold text-blue-400 mb-4 border-b border-slate-700 pb-3">
                            <span id="inv-name-title">투자자</span> 자산 요약
                        </h3>
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div class="bg-slate-800/50 p-3 rounded-lg border border-slate-700 col-span-2 flex justify-between items-center">
                                <span class="text-slate-400">총 평가금액</span>
                                <span id="inv-total" class="font-extrabold text-lg text-emerald-400">0 원</span>
                            </div>
                            <div class="bg-slate-800/50 p-3 rounded-lg border border-slate-700 col-span-2 flex justify-between items-center">
                                <span class="text-slate-400">총 실투자금</span>
                                <span id="inv-invest" class="font-bold text-slate-300">0 원</span>
                            </div>
                            <div class="bg-red-900/20 p-3 rounded-lg border border-red-900/30">
                                <span class="text-red-400 block mb-1">총 부채(차용금)</span>
                                <span id="inv-debt" class="font-bold text-red-300 block truncate">0 원</span>
                            </div>
                            <div class="bg-red-900/20 p-3 rounded-lg border border-red-900/30">
                                <span class="text-red-400 block mb-1">월 이자 비용</span>
                                <span id="inv-interest" class="font-bold text-red-300 block truncate">0 원</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 class="text-sm font-bold text-slate-400 mb-3 border-t border-slate-700 pt-4 text-center">
                            ⚖️ 순자산 vs 부채 (LTV 비율)
                        </h3>
                        <div class="h-40 w-full relative">
                            <canvas id="ltvChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <div class="lg:col-span-2 space-y-6">
                    <!-- 보유 부동산 -->
                    <div class="card">
                        <h3 class="text-lg font-bold text-slate-300 mb-5 border-b border-slate-700 pb-3">
                            🏢 보유 부동산 및 엑시트 전략 (<span id="inv-prop-count">0</span>건)
                        </h3>
                        <div id="inv-prop-list" class="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"></div>
                    </div>

                    <!-- 매각 완료 자산 및 수익률 -->
                    <div class="card bg-slate-800/30">
                        <h3 class="text-lg font-bold text-emerald-400 mb-5 border-b border-slate-700 pb-3">
                            💰 매각 완료 자산 수익률 (ROI)
                        </h3>
                        <div class="h-48 w-full relative mb-4">
                            <canvas id="roiChart"></canvas>
                        </div>
                        <div id="sold-prop-list" class="space-y-2 mt-4 text-sm"></div>
                    </div>

                    <!-- 자금 흐름 트래커 -->
                    <div class="card bg-slate-800/30 border-blue-900/30">
                        <h3 class="text-lg font-bold text-blue-400 mb-5 border-b border-slate-700 pb-3">
                            💸 매각 자금 흐름 트래커 (Timeline)
                        </h3>
                        <div id="fund-flow-list" class="pl-4"></div>
                        <p id="no-fund-flow" class="text-slate-500 text-sm hidden">추적된 자금 흐름 데이터가 없습니다.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 3. RENTROLL TAB -->
        <div id="tab-rentroll" class="tab-content">
            <div class="card">
                <div class="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-slate-700 pb-4 gap-4">
                    <h3 class="text-lg font-bold text-slate-300 flex items-center">
                        <span class="mr-2">🏢</span> 전체 렌트롤 현황
                    </h3>
                    <div class="flex gap-2">
                        <button class="filter-btn active" id="btn-rent-all" onclick="filterRent('all')">전체 보기</button>
                        <button class="filter-btn text-red-400 border-red-900/50" id="btn-rent-warn" onclick="filterRent('warning')">🚨 180일 이내 만기</button>
                    </div>
                </div>
                
                <div class="overflow-x-auto h-[600px] custom-scrollbar border border-slate-700 rounded-lg">
                    <table class="w-full text-sm rent-table">
                        <thead>
                            <tr>
                                <th>소유주</th>
                                <th>건물명 / 호수</th>
                                <th>임차인</th>
                                <th>보증금</th>
                                <th>월세</th>
                                <th>만기일 (D-Day)</th>
                            </tr>
                        </thead>
                        <tbody id="rent-table-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- 모달 팝업 -->
    <div id="modal" onclick="closeModal(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
            <div class="flex justify-between items-start mb-4 border-b border-slate-700 pb-3">
                <h3 id="modal-title" class="text-xl font-bold text-white">건물명 호수</h3>
                <button onclick="closeModal(true)" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div class="space-y-4 text-sm" id="modal-body">
                <!-- Injected via JS -->
            </div>
            <div class="mt-6 text-center">
                <button onclick="closeModal(true)" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-full w-full transition-colors">확인</button>
            </div>
        </div>
    </div>

    <script>
        const formatMoney = (num) => {
            if (!num) return '0 원';
            return new Intl.NumberFormat('ko-KR').format(Math.round(num)) + ' 원';
        };

        // Chart instances
        let growthChart = null;
        let ltvChart = null;
        let roiChart = null;
        
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = 'Pretendard';
        
        // Navigation
        