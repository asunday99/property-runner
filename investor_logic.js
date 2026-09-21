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
        