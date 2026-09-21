
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
        function switchTab(tabId, btnElement) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tabId).classList.add('active');
            
            document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
            btnElement.classList.add('active');
            
            if (tabId === 'dashboard') initDashboard();
            if (tabId === 'investor' && !window.invInit) initInvestorTab();
            if (tabId === 'rentroll' && !window.rentInit) initRentRollTab();
        }

        // 1. Dashboard
        function initDashboard() {
            const props = rawData.properties;
            const rents = rawData.rents.filter(r => r.dday <= 180).sort((a,b) => a.dday - b.dday);
            const devAlerts = rawData.dev_alerts;

            let tValue = 0, tInvest = 0, tFuture = 0;
            let typeSums = {};
            props.forEach(p => {
                tValue += p.value; tInvest += p.invest; tFuture += p.future;
                if (p.value > 0) typeSums[p.type] = (typeSums[p.type] || 0) + p.value;
            });

            const target = 50000000000;
            let pct = Math.min((tValue / target) * 100, 100) || 0;
            document.getElementById('dash-goal-pct').innerText = pct.toFixed(2) + '%';
            document.getElementById('dash-goal-bar').style.width = pct + '%';

            document.getElementById('dash-prop-count').innerText = props.length + '건';
            document.getElementById('dash-val-total').innerText = formatMoney(tValue);
            document.getElementById('dash-val-invest').innerText = formatMoney(tInvest);

            // Chart.js Bar Chart (Growth)
            const ctxGrowth = document.getElementById('growthChart').getContext('2d');
            if(growthChart) growthChart.destroy();
            growthChart = new Chart(ctxGrowth, {
                type: 'bar',
                data: {
                    labels: ['총 실투자금', '현재 시세', '미래 가치'],
                    datasets: [{
                        data: [tInvest, tValue, tFuture],
                        backgroundColor: ['#64748b', '#3b82f6', '#10b981'],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { display: false },
                        x: { grid: { display: false }, border: { display: false } }
                    }
                }
            });
            
            // Dev Alerts
            const dl = document.getElementById('dash-dev-list');
            document.getElementById('dash-dev-count').innerText = devAlerts.length;
            dl.innerHTML = '';
            if (devAlerts.length === 0) {
                document.getElementById('dash-no-dev').classList.remove('hidden');
            } else {
                document.getElementById('dash-no-dev').classList.add('hidden');
                devAlerts.forEach(w => {
                    dl.innerHTML += `
                        <li class="flex justify-between items-center bg-slate-800/80 p-3 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-700 transition" onclick="showDevModal('${w.name}', '${w.owner}', '${w.dev_stage}', '${w.exit_strategy}')">
                            <div class="flex flex-col">
                                <span class="font-bold text-blue-300">[${w.owner}] ${w.name}</span>
                                <span class="text-xs text-slate-400 mt-1">단계: ${w.dev_stage}</span>
                            </div>
                            <span class="font-black px-3 py-1 rounded-md shadow-sm whitespace-nowrap bg-blue-900/40 text-blue-400">엑시트 주의</span>
                        </li>
                    `;
                });
            }

            // Warnings
            const wl = document.getElementById('dash-warning-list');
            document.getElementById('dash-warning-count').innerText = rents.length;
            wl.innerHTML = '';
            if (rents.length === 0) {
                document.getElementById('dash-no-warnings').classList.remove('hidden');
            } else {
                document.getElementById('dash-no-warnings').classList.add('hidden');
                rents.forEach(w => {
                    let badgeClass = w.dday > 100 ? 'bg-orange-900/30 text-orange-400' : 'bg-red-900/40 text-red-400';
                    wl.innerHTML += `
                        <li class="flex justify-between items-center bg-slate-800/80 p-3 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-700 transition" onclick="showModal('${w.tenant}', '${w.bldg}', '${w.room}', ${w.deposit}, ${w.rent}, ${w.dday})">
                            <div class="flex flex-col">
                                <span class="font-medium text-slate-200">${w.bldg} ${w.room}호</span>
                                <span class="text-xs text-slate-400">${w.tenant} (${w.owner})</span>
                            </div>
                            <span class="font-black px-3 py-1 rounded-md shadow-sm whitespace-nowrap ${badgeClass}">D-${w.dday}</span>
                        </li>
                    `;
                });
            }

            // Allocations
            const aBar = document.getElementById('dash-alloc-bar');
            const aLeg = document.getElementById('dash-alloc-legend');
            aBar.innerHTML = ''; aLeg.innerHTML = '';
            const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4', '#eab308'];
            let cIdx = 0;
            let totalValid = Object.values(typeSums).reduce((a,b)=>a+b, 0);
            
            Object.entries(typeSums).sort((a,b)=>b[1]-a[1]).forEach(([key, val]) => {
                let p = (val / totalValid) * 100;
                let c = colors[cIdx % colors.length];
                cIdx++;
                aBar.innerHTML += `<div class="h-full flex items-center justify-center text-xs font-bold text-white overflow-hidden" style="width:${p}%; background:${c}">${p>8?key:''}</div>`;
                aLeg.innerHTML += `<div class="flex items-center bg-slate-800/50 p-2 rounded-lg"><span class="w-3 h-3 rounded-full mr-2" style="background:${c}"></span><span class="text-slate-300 font-medium text-xs">${key} ${p.toFixed(1)}%</span></div>`;
            });
        }

        // 2. Investor Tab
        function initInvestorTab() {
            window.invInit = true;
            const container = document.getElementById('inv-filter-container');
            const topOwners = ['고미', '양아선', '위탁', '김미한']; 
            let dOwners = [...topOwners];
            rawData.owners.forEach(o => { if(!dOwners.includes(o) && dOwners.length<10) dOwners.push(o); });
            
            dOwners.forEach(o => {
                if(!rawData.owners.includes(o)) return;
                let btn = document.createElement('button');
                btn.className = 'filter-btn inv-btn ' + (o === topOwners[0] ? 'active' : '');
                btn.innerText = o;
                btn.onclick = () => setInv(o);
                container.appendChild(btn);
            });
            setInv(topOwners[0]);
        }

        function setInv(owner) {
            document.querySelectorAll('.inv-btn').forEach(b => {
                b.classList.toggle('active', b.innerText === owner);
            });
            document.getElementById('inv-name-title').innerText = owner;
            
            const props = rawData.properties.filter(p => p.owner === owner);
            const soldProps = rawData.sold_properties.filter(p => p.owner === owner || owner === '전체'); // If we want to show all sold
            const debts = rawData.debts.filter(d => d.borrower === owner);
            const ownerFlows = rawData.flows.filter(f => f.title.includes(owner) || owner === '전체' || (owner==='고미' && f.title.includes('고미'))); // Basic heuristic
            
            let tValue=0, tInvest=0, tDebt=0, tInt=0;
            props.forEach(p => { tValue+=p.value; tInvest+=p.invest; });
            debts.forEach(d => { tDebt+=d.principal; tInt+=d.monthly_interest; });
            
            document.getElementById('inv-total').innerText = formatMoney(tValue);
            document.getElementById('inv-invest').innerText = formatMoney(tInvest);
            document.getElementById('inv-debt').innerText = formatMoney(tDebt);
            document.getElementById('inv-interest').innerText = formatMoney(tInt);
            document.getElementById('inv-prop-count').innerText = props.length;
            
            // LTV Chart
            const ctxLtv = document.getElementById('ltvChart').getContext('2d');
            if(ltvChart) ltvChart.destroy();
            let netAsset = Math.max(0, tValue - tDebt);
            let hasDebt = tDebt > 0;
            
            ltvChart = new Chart(ctxLtv, {
                type: 'doughnut',
                data: {
                    labels: ['부채 (차용금)', '순자산 (자본)'],
                    datasets: [{
                        data: hasDebt || netAsset > 0 ? [tDebt, netAsset] : [0, 1],
                        backgroundColor: ['#ef4444', '#10b981'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'right', labels: { color: '#cbd5e1', font: {size: 11} } },
                        tooltip: { callbacks: { label: (ctx) => ' ' + formatMoney(ctx.raw) } }
                    }
                }
            });
            
            // Active Property List
            const pl = document.getElementById('inv-prop-list');
            pl.innerHTML = '';
            props.forEach(p => {
                let bg = p.status === '운용중' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50' : 'bg-slate-700 text-slate-300';
                pl.innerHTML += `
                    <div class="accordion-item bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                        <div class="p-4 cursor-pointer hover:bg-slate-700/50 flex justify-between items-center" onclick="this.parentElement.classList.toggle('active')">
                            <div>
                                <span class="text-xs px-2 py-0.5 rounded mr-2 border ${bg}">${p.status||'상태모름'}</span>
                                <span class="font-bold text-slate-200">${p.name}</span>
                            </div>
                            <span class="text-slate-400">▼</span>
                        </div>
                        <div class="accordion-content bg-slate-900/50 border-t border-slate-700">
                            <div class="p-4 space-y-3 text-sm">
                                <div class="grid grid-cols-2 gap-4">
                                    <div><span class="text-slate-500 block mb-1">취득일/취득가</span><span class="text-slate-200">${p.buy_date} / ${formatMoney(p.buy_price)}</span></div>
                                    <div><span class="text-slate-500 block mb-1">현재시세/실투자금</span><span class="text-emerald-400 font-bold">${formatMoney(p.value)}</span> / ${formatMoney(p.invest)}</div>
                                </div>
                                <div class="border-t border-slate-700/50 pt-3">
                                    <span class="text-slate-500 block mb-1">매도/보유 엑시트 전략</span>
                                    <p class="text-blue-300">${p.exit_strategy || '전략 미입력'}</p>
                                </div>
                                <div class="border-t border-slate-700/50 pt-3">
                                    <span class="text-slate-500 block mb-1">세금/가족상황/비고</span>
                                    <p class="text-slate-300">비과세: ${p.tax_note || '-'} | 메모: ${p.memo || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            // ROI Chart
            const ctxRoi = document.getElementById('roiChart').getContext('2d');
            if(roiChart) roiChart.destroy();
            let roiLabels = soldProps.map(p => p.name.split(' ')[1] || p.name);
            let roiData = soldProps.map(p => p.roi);
            
            if(soldProps.length > 0) {
                roiChart = new Chart(ctxRoi, {
                    type: 'bar',
                    data: {
                        labels: roiLabels,
                        datasets: [{
                            label: '수익률 (%)',
                            data: roiData,
                            backgroundColor: '#10b981',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            } else {
                document.getElementById('roiChart').parentElement.innerHTML = '<p class="text-slate-500 text-sm text-center py-10">해당 투자자의 매각 이력이 없습니다.</p>';
            }

            const sl = document.getElementById('sold-prop-list');
            sl.innerHTML = '';
            soldProps.forEach(p => {
                sl.innerHTML += `
                    <div class="flex justify-between items-center bg-slate-800/50 p-2 rounded">
                        <span>${p.name}</span>
                        <span class="text-emerald-400 font-bold">${p.roi.toFixed(1)}% 수익</span>
                    </div>
                `;
            });

            // Fund Flow Timeline
            const fl = document.getElementById('fund-flow-list');
            const nfl = document.getElementById('no-fund-flow');
            fl.innerHTML = '';
            let flowsToShow = ownerFlows.length > 0 ? ownerFlows : rawData.flows.slice(0,2); // show some generic if none match exactly for demo
            
            if (flowsToShow.length === 0) {
                nfl.classList.remove('hidden');
            } else {
                nfl.classList.add('hidden');
                flowsToShow.forEach(f => {
                    let htmlStr = `<div class="mb-6"><h4 class="font-bold text-slate-300 mb-2">${f.title}</h4>`;
                    f.items.forEach(item => {
                        htmlStr += `<div class="timeline-item text-slate-400 text-sm">${item}</div>`;
                    });
                    htmlStr += `</div>`;
                    fl.innerHTML += htmlStr;
                });
            }
        }

        // 3. RentRoll Tab
        function initRentRollTab() {
            window.rentInit = true;
            filterRent('all');
        }

        function filterRent(mode) {
            document.getElementById('btn-rent-all').classList.toggle('active', mode==='all');
            document.getElementById('btn-rent-warn').classList.toggle('active', mode!=='all');
            
            let rents = rawData.rents;
            if (mode === 'warning') {
                rents = rents.filter(r => r.dday <= 180).sort((a,b) => a.dday - b.dday);
            } else {
                rents = rents.sort((a,b) => a.bldg.localeCompare(b.bldg));
            }
            
            const tb = document.getElementById('rent-table-body');
            tb.innerHTML = '';
            rents.forEach(r => {
                let dClass = r.dday <= 180 ? (r.dday <= 100 ? 'text-red-400 font-bold bg-red-900/20' : 'text-orange-400 font-bold') : 'text-slate-400';
                tb.innerHTML += `
                    <tr class="cursor-pointer" onclick="showModal('${r.tenant}', '${r.bldg}', '${r.room}', ${r.deposit}, ${r.rent}, ${r.dday})">
                        <td><span class="bg-slate-700 px-2 py-1 rounded text-xs">${r.owner}</span></td>
                        <td class="font-medium text-slate-200">${r.bldg} ${r.room}호</td>
                        <td>${r.tenant}</td>
                        <td class="text-emerald-400">${formatMoney(r.deposit)}</td>
                        <td>${formatMoney(r.rent)}</td>
                        <td class="${dClass}">${r.end_date||'-'} (D-${r.dday === 9999 ? '?' : r.dday})</td>
                    </tr>
                `;
            });
        }

        // Modals
        function showModal(tenant, bldg, room, deposit, rent, dday) {
            document.getElementById('modal-title').innerText = bldg + ' ' + room + '호';
            document.getElementById('modal-body').innerHTML = `
                <div class="flex justify-between border-b border-slate-700/50 pb-2">
                    <span class="text-slate-400">임차인</span><span class="font-bold text-slate-200">${tenant}</span>
                </div>
                <div class="flex justify-between border-b border-slate-700/50 pb-2">
                    <span class="text-slate-400">보증금</span><span class="font-bold text-emerald-400">${formatMoney(deposit)}</span>
                </div>
                <div class="flex justify-between border-b border-slate-700/50 pb-2">
                    <span class="text-slate-400">월세</span><span class="font-bold text-blue-400">${formatMoney(rent)}</span>
                </div>
                <div class="flex justify-between pt-2">
                    <span class="text-slate-400">남은 기간</span><span class="font-black text-red-400 bg-red-900/30 px-2 py-1 rounded">D-${dday===9999 ? '?' : dday}일</span>
                </div>
            `;
            const modal = document.getElementById('modal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }
        
        function showDevModal(name, owner, stage, strategy) {
            document.getElementById('modal-title').innerText = `[${owner}] ${name}`;
            document.getElementById('modal-body').innerHTML = `
                <div class="border-b border-slate-700/50 pb-2 mb-2">
                    <span class="text-blue-400 font-bold block mb-1">개발 진행 단계</span>
                    <span class="text-slate-200">${stage}</span>
                </div>
                <div class="pt-2">
                    <span class="text-emerald-400 font-bold block mb-1">매도/보유 엑시트 전략</span>
                    <span class="text-slate-200">${strategy}</span>
                </div>
            `;
            const modal = document.getElementById('modal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }

        function closeModal(force = false) {
            if (force || event.target.id === 'modal') {
                const modal = document.getElementById('modal');
                modal.classList.remove('show');
                setTimeout(() => modal.style.display = 'none', 300);
            }
        }

        