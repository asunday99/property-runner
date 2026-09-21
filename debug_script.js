
        const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQUFrd48p3c6nFJA7rYjoeK43cMqrGTNT_Tv2W0QizuPnrUufbbuKfPN1VCZwtsfpmuljur_TOLtk8i/pub?gid=2053604895&single=true&output=csv';
        
        let runnersData = [];
        let mapInitialized = false;
        let kakaoMap = null;
        let geocoder = null;

        const photoInput = document.getElementById('photoInput');
        let currentUploadName = null;

        
        function toggleDrawer() {
            document.getElementById('drawer-sidebar').classList.toggle('open');
            document.getElementById('drawer-overlay').classList.toggle('open');
        }

        
        let isMapMode = false;
        
        function switchTab(mode) {
            localStorage.setItem('propertyRunnerTab', mode);
            // Hide all views
            ['view-marathon', 'view-map', 'view-dashboard', 'view-properties', 'view-rentroll', 'view-debt'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.style.display = 'none';
            });
            
            // Handle Tab UI styles
            ['btn-marathon', 'btn-dashboard', 'btn-properties'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.className = 'tab-btn tab-inactive';
            });
            
            if(document.getElementById('btn-' + mode)) {
                document.getElementById('btn-' + mode).className = 'tab-btn tab-active';
            }

            // Show selected view
            if (mode === 'marathon') {
                document.getElementById(isMapMode ? 'view-map' : 'view-marathon').style.display = 'block';
                if(document.getElementById('toggle-map-btn')) document.getElementById('toggle-map-btn').style.display = 'inline-block';
            } else {
                if(document.getElementById('view-' + mode)) document.getElementById('view-' + mode).style.display = 'block';
                if(document.getElementById('toggle-map-btn')) document.getElementById('toggle-map-btn').style.display = 'none';
                
                // Initialize map if it hasn't been initialized and we switched to it (or map mode)
                // Actually Map is now inside marathon, but just in case
            }
            
            // Init map if mode is map
            if (mode === 'map' || (mode === 'marathon' && isMapMode)) {
                if (!mapInitialized) {
                    initKakaoMap();
                    mapInitialized = true;
                }
                setTimeout(() => {
                    if (typeof kakaoMap !== 'undefined' && kakaoMap) {
                        kakaoMap.relayout();
                        kakaoMap.setCenter(new kakao.maps.LatLng(37.5255, 126.9954));
                    }
                }, 100);
            }
        }
        
        function toggleMapMode() {
            isMapMode = !isMapMode;
            const btn = document.getElementById('toggle-map-btn');
            if (isMapMode) {
                if(btn) { btn.innerHTML = '🏃 러너 뷰'; btn.style.background = '#c665d9'; }
                document.getElementById('view-marathon').style.display = 'none';
                document.getElementById('view-map').style.display = 'block';
                switchTab('marathon'); // to trigger map init logic
            } else {
                if(btn) { btn.innerHTML = '🗺️ 지도 뷰'; btn.style.background = '#2563eb'; }
                document.getElementById('view-map').style.display = 'none';
                document.getElementById('view-marathon').style.display = 'block';
            }
        }

        const GAS_URL = "https://script.google.com/macros/s/AKfycby5P264B3eU49w8U8z1z15VvI68s9HhFz_sR3q2m68b5C35ZJqD8T3L0_9c5N5Y9pA/exec";
        window.globalData = null;

        async function initDataEngine() {
            try {
                const response = await fetch(GAS_URL + "?t=" + new Date().getTime());
                const rawJson = await response.json();
                window.globalData = rawJson;
                
                const dashHTML = `
                    <div style="max-width:800px; margin:0 auto;">
                        <h2 style="font-size:24px; margin-bottom:20px; font-weight:bold;">📊 총괄 대시보드</h2>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
                            <div style="background:#1f2937; padding:20px; border-radius:12px;">
                                <div style="color:#9ca3af; font-size:14px;">총 보유 물건</div>
                                <div style="color:white; font-size:32px; font-weight:bold; margin-top:8px;">${rawJson["매입부동산"] ? rawJson["매입부동산"].length : 0}건</div>
                            </div>
                            <div style="background:#1f2937; padding:20px; border-radius:12px;">
                                <div style="color:#9ca3af; font-size:14px;">임대 계약</div>
                                <div style="color:#10b981; font-size:32px; font-weight:bold; margin-top:8px;">${rawJson["RentRoll"] ? rawJson["RentRoll"].length : 0}건</div>
                            </div>
                        </div>
                        <div style="background:#1f2937; padding:20px; border-radius:12px; margin-bottom:24px;">
                            <h3 style="color:#8ab4f8; font-weight:bold; margin-bottom:12px;">최근 매입 현황</h3>
                            <ul style="color:#d1d5db; font-size:14px; line-height:1.6; list-style:none; padding:0;">
                                ${rawJson["매입부동산"] ? rawJson["매입부동산"].slice(0,3).map(p => `<li>✅ ${p["물건명"]} (${p["소유주"]})</li>`).join('') : "데이터가 없습니다."}
                            </ul>
                        </div>
                    </div>
                `;
                
                const propHTML = `
                    <div style="max-width:800px; margin:0 auto;">
                        <h2 style="font-size:24px; margin-bottom:20px; font-weight:bold;">🏢 매입부동산 상세</h2>
                        <div style="background:#1f2937; border-radius:12px; overflow:hidden;">
                            ${rawJson["매입부동산"] ? rawJson["매입부동산"].map(p => `
                                <div style="padding:16px; border-bottom:1px solid #374151; display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-weight:bold; color:white; font-size:16px;">${p["물건명"]}</div>
                                        <div style="color:#9ca3af; font-size:12px; margin-top:4px;">소유주: ${p["소유주"] || '-'}</div>
                                    </div>
                                    <div style="text-align:right;">
                                        <div style="color:#10b981; font-weight:bold;">${p["현재시세"] ? '시세: ' + p["현재시세"].toLocaleString() : '-'}</div>
                                        <div style="color:#60a5fa; font-size:12px; margin-top:4px;">${p["지역"]}</div>
                                    </div>
                                </div>
                            `).join('') : "<div style='padding:20px; color:#9ca3af;'>데이터가 없습니다.</div>"}
                        </div>
                    </div>
                `;

                if(document.getElementById('view-dashboard')) document.getElementById('view-dashboard').innerHTML = dashHTML;
                if(document.getElementById('view-properties')) document.getElementById('view-properties').innerHTML = propHTML;
                if(document.getElementById('view-rentroll')) document.getElementById('view-rentroll').innerHTML = '<h2 style="font-size:24px; margin-bottom:10px;">📁 임대관리</h2><p>✅ 엑셀 데이터 연동 중...</p>';
                if(document.getElementById('view-debt')) document.getElementById('view-debt').innerHTML = '<h2 style="font-size:24px; margin-bottom:10px;">💳 부채관리</h2><p>✅ 엑셀 데이터 연동 중...</p>';
            } catch (e) {
                console.error(e);
            }
        }
, 100);
            }
        }

        photoInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0] && currentUploadName) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const base64Str = event.target.result;
                    localStorage.setItem('photo_' + currentUploadName, base64Str);
                    
                    document.querySelectorAll('.character').forEach(char => {
                        if (char.dataset.ownerName === currentUploadName) {
                            const img = char.querySelector('img.face-img');
                            const emoji = char.querySelector('.emoji');
                            if(img && emoji) {
                                img.src = base64Str;
                                img.style.display = 'block';
                                emoji.style.display = 'none';
                                char.dataset.hasPhoto = 'true';
                            }
                        }
                    });
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        async function fetchAndParseData() {
            initDataEngine();
            Papa.parse(CSV_URL, {
                download: true,
                header: false,
                complete: function(results) { processData(results.data); }
            });
        }

        function extractNeighborhood(addr) {
            if (!addr) return "";
            let parts = addr.trim().split(/\s+/);
            
            // 1. '동', '읍', '면', '가' 로 끝나는 단어 우선 탐색
            let dongPart = parts.find(p => p.match(/[동읍면]$/) || p.match(/동\d*가$/));
            
            // 2. 없으면 '로', '길' 로 끝나는 도로명 주소 탐색 (예: 서빙고로62길)
            if (!dongPart) {
                dongPart = parts.find(p => p.match(/[로길]$/));
            }
            
            if (!dongPart) {
                if (parts.length >= 3 && parts[1].endsWith('구')) dongPart = parts[2];
                else dongPart = parts[0]; // 주소의 첫 번째 단어 (안전장치)
            }
            
            // "서빙고동", "성수동2가", "서빙고로62길" 등에서 "서빙고", "성수"만 추출
            let nameMatch = dongPart.match(/^([가-힣a-zA-Z0-9]+?)(?:[0-9]*동|[0-9]*가|동|읍|면|로[0-9]*길|로|길)+$/);
            
            let result = (nameMatch && nameMatch[1]) ? nameMatch[1] : dongPart;
            
            if (result.length < 2 && addr.length >= 2) return addr.substring(0, 2);
            return result;
        }
        // (0.사전준비 1.구역지정 2.조합설립 3.사업시행 4.관리처분 5.이주/철거 6.착공/분양 7.준공/입주)
        const methodData = {
            '모아타운': { years: [0.5, 1.19, 2.01, 3.01, 4.01, 5.01, 6.76, 7.5], max: 8.13 },
            '민간도심복합개발': { years: [0.75, 1.88, 2.63, 3.38, 4.38, 5.63, 7.88, 8.5], max: 9.5 },
            '재건축': { years: [0.75, 2.13, 3.5, 4.88, 6.38, 7.88, 9.13, 11.38], max: 13.0 },
            '재개발': { years: [0.75, 2.75, 4.75, 6.75, 8.75, 10.38, 12.63, 14.38], max: 14.75 },
            '역세권시프트': { years: [0.75, 1.84, 2.8, 4.05, 5.55, 7.05, 8.3, 10.8], max: 12.67 },
            'default': { years: [0.75, 2.75, 4.75, 6.75, 8.75, 10.38, 12.63, 14.38], max: 14.75 }
        };

        function processData(data) {
            let headerRowIndex = data.findIndex(row => row[0] && row[0].includes('자산ID'));
            if (headerRowIndex === -1) return;

            const headers = data[headerRowIndex];
            const getCol = (name) => headers.findIndex(h => h && h.replace(/\s+/g, '') === name.replace(/\s+/g, ''));
            
            const idxId = getCol('자산ID');
            const idxManager = getCol('관리주체');
            const idxOwner = getCol('소유주');
            const idxType = getCol('유형'); 
            const idxState = getCol('상태'); 
            const idxDate = getCol('취득일'); 
            const idxMethod = getCol('사업방식');
            const idxProgress = getCol('개발진행단계');
            const idxSpeech = headers.findIndex(h => h && (h.includes('말풍선') || h.includes('대사')));
            const idxAddress = headers.findIndex(h => h && h.includes('주소')); 

            const dataRows = data.filter(row => row[idxId] && row[idxId].startsWith('Re_'));

            runnersData = dataRows.map(row => {
                const owner = row[idxOwner] || '';
                const manager = row[idxManager] || '';
                const typeStr = row[idxType] || '';
                const stateStr = row[idxState] || '';
                const acquireDateStr = row[idxDate] || '';
                const method = row[idxMethod] ? row[idxMethod].replace(/\s+/g, '') : '';
                const progressStr = row[idxProgress] || '';
                const msg = row[idxSpeech] || '가즈아! 🏃';
                const address = row[idxAddress] || '';

                let dongName = extractNeighborhood(address);
                if (owner.includes('창희')) dongName = '황학';
                let markerType = 'runner';
                if (method.toLowerCase() === 'x' || method === '' || progressStr === '해당없음' || progressStr.includes('취소')) {
                    if (typeStr.includes('토지')) markerType = 'land';
                    else markerType = 'building'; 
                }

                if (address && address.includes('이태원') && (owner.includes('영애') || owner.includes('준학') || owner.includes('기정') || owner.includes('윤정'))) {
                    markerType = 'runner';
                }

                let status = 'normal';
                if (stateStr === '매각완료') status = 'finished';
                else if (stateStr === '보유') {
                    if (typeStr.includes('토지')) status = 'good';
                    else if (typeStr.includes('뚜껑')) status = 'bad';
                }

                let speed = 1.0;
                let actualYears = 0;
                
                if (acquireDateStr) {
                    let cleanedStr = acquireDateStr.trim();
                    let parts = cleanedStr.split('.');
                    if (parts.length >= 2) {
                        let y = parseInt(parts[0], 10);
                        if (y < 100) y += 2000;
                        let m = parseInt(parts[1], 10) - 1;
                        let d = parts.length >= 3 ? parseInt(parts[2], 10) : 1;
                        if (!isNaN(y) && !isNaN(m)) {
                            const acquireDate = new Date(y, m, d);
                            const today = new Date();
                            const diffTime = today - acquireDate;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            let rawYears = diffDays / 365;
                            if (rawYears < 0.1) rawYears = 0.1;
                            actualYears = rawYears;
                        }
                    }
                }

                // --- 아선 (성수) 예외 하드코딩 ---
                if (owner === '아선' && address.includes('성수')) {
                    actualYears = 6;
                }

                let mData = methodData[method];
                if (!mData) mData = methodData['default'];
                
                let stageNum = -1;
                const match = progressStr.match(/(\d+)\./);
                if (match) stageNum = parseInt(match[1]);

                let isPreparing = false;
                if (stageNum === -1 || progressStr === '해당없음' || progressStr.includes('취소')) {
                    isPreparing = true;
                }

                let progressYear = 0;
                if (!isPreparing) {
                    if (stageNum >= 0 && stageNum < mData.years.length) {
                        progressYear = mData.years[stageNum];
                    } else if (stageNum >= mData.years.length) {
                        progressYear = mData.max;
                    }
                }

                const maxYear = mData.max;
                let remainYearsNum = Math.max(0, maxYear - progressYear);
                if (owner && (owner.includes('하늬') || owner.includes('조영'))) {
                    remainYearsNum = 4.5;
                }
                
                if (owner && (owner.includes('성준') || owner.includes('준학') || owner.includes('경아') || owner.includes('덕일'))) {
                    remainYearsNum = 9.0;
                }
                if (owner && owner.includes('문정')) {
                    remainYearsNum = 9.5;
                }
                if (owner && owner.includes('아선') && address && address.includes('성수')) {
                    remainYearsNum = 9.0;
                }
                if (address && address.includes('일원동')) {
                    remainYearsNum = 10.0;
                }
                
                const GLOBAL_MAX_YEAR = 14.75;
                let completionPercent = (GLOBAL_MAX_YEAR - remainYearsNum) / GLOBAL_MAX_YEAR;
                if (completionPercent < 0) completionPercent = 0;
                if (completionPercent > 1) completionPercent = 1;

                let progressScore = status === 'finished' ? 90 : (completionPercent * 90);
                
                if (isPreparing) {
                    speed = 0; // 주저앉음 (애니메이션 멈춤)
                } else {
                    if (remainYearsNum <= 5) speed = 0.2;       // 3~5년 이내 (가장 빠름)
                    else if (remainYearsNum <= 7) speed = 0.5;  // 5~7년 이내
                    else if (remainYearsNum <= 9) speed = 0.9;  // 7~9년 이내
                    else if (remainYearsNum <= 11) speed = 1.4; // 9~11년 이내
                    else speed = 2.0;                           // 11년 초과 (매우 느림)
                }

                let marathonKm = status === 'finished' ? 42.195 : (completionPercent * 42.195).toFixed(1);
                
                let remainYears = remainYearsNum.toFixed(1);

                let stageNumStr = (stageNum >= 0) ? stageNum + "단계" : progressStr.split('/')[0].trim();
                if (!stageNumStr || stageNumStr === "해당없음") stageNumStr = "준비중";
                
                let fullStageStr = dongName ? `${dongName}${stageNumStr}` : stageNumStr;

                // 스크린샷 요구사항에 맞춘 정규화 라벨 텍스트 적용
                let statsText = '';
                if (markerType === 'runner' && status !== 'finished') {
                    if (owner && (owner.includes('하늬') || owner.includes('하니') || owner.includes('조영'))) {
                        statsText = '둔촌4단계 / 4.5년후 준공';
                    } else {
                        statsText = `${fullStageStr}`;
                    }
                } else if (status === 'finished') {
                    statsText = `매각 완료 (🏆 42.195km 완주)`;
                } else {
                    statsText = `보유 ${actualYears.toFixed(1)}년차 [${typeStr}]`;
                }

                
                if (owner.includes('아선') && typeStr.includes('호텔')) markerType = 'building';
                if ((owner.includes('고미') || owner.includes('뉴푸드')) && (typeStr.includes('토지') || typeStr.includes('대지') || typeStr.includes('전답'))) markerType = 'land';
                                // Custom override for Seongsu A-seon
                if (owner.includes('아선') && address.includes('성수')) {
                    progressScore = 60;
                    speed = 0.4; // One level faster than 0.9 (which is for 8.5 years)
                    statsText = '성수3단계<br>8.5년후 준공';
                }
                
                if (owner.includes('아선') && address.includes('서빙고')) { progressScore = 40; isPreparing = false; }
                if (owner.includes('원일')) { progressScore = 40; isPreparing = false; }
                
                if (owner.includes('의대') || owner.includes('지원')) { progressScore = 35; isPreparing = false; }
                
                if (owner.includes('성준') || owner.includes('덕일')) { progressScore = 30; isPreparing = false; }
                
                if (owner.includes('문정') || (owner.includes('희영') && !address.includes('옥수')) || owner.includes('준학') || owner.includes('경아')) { progressScore = 25; isPreparing = false; }
                
                if (address.includes('일원')) { progressScore = 15; isPreparing = false; }
                
                if (owner.includes('하늬') || owner.includes('조영') || owner.includes('하니')) { progressScore = 75; isPreparing = false; }
                
                return { id: row[idxId], owner, manager, typeStr, markerType, status, speed, msg, statsText, progressScore, address, marathonKm, isPreparing, actualYears, remainYears, bizType: method };
            });

            
            const activeRunners = runnersData.filter(d => d.markerType === 'runner' && d.status !== 'finished' && !(d.address && d.address.includes('이태원') && (d.owner.includes('영애') || d.owner.includes('준학') || d.owner.includes('기정') || d.owner.includes('윤정'))));
            
            const totalRunners = activeRunners.length;
            const totalProps = runnersData.filter(data => {
                let addr = data.address || '';
                if (data.owner.includes('아선') && data.typeStr && data.typeStr.includes('호텔')) addr = '인천광역시 중구 운서동';
                if ((data.owner.includes('고미') || data.owner.includes('뉴푸드')) && data.typeStr && (data.typeStr.includes('토지') || data.typeStr.includes('대지') || data.typeStr.includes('전답'))) addr = '인천광역시 중구 운서동';
                return addr && data.status !== 'finished';
            }).length;
            
            const delegatedRunners = activeRunners.filter(d => !(d.manager.includes('개인') || d.manager.includes('법인'))).length;
            const directRunners = activeRunners.filter(d => (d.manager.includes('개인') || d.manager.includes('법인'))).length;

            const runnerGoldEl = document.getElementById('drawer-gold-count');
            if(runnerGoldEl) runnerGoldEl.innerHTML = '<span style="color:#b5924a;">금색 러너:</span> 위탁 투자 (총 ' + delegatedRunners + '건)';
            const runnerPurpleEl = document.getElementById('drawer-purple-count');
            if(runnerPurpleEl) runnerPurpleEl.innerHTML = '<span style="color:#c665d9;">보라색 러너:</span> 직접 투자 (총 ' + directRunners + '건)';

            const mapItems = runnersData.filter(data => {
                let addr = data.address || '';
                if (data.owner.includes('아선') && data.typeStr && data.typeStr.includes('호텔')) addr = '인천광역시 중구 운서동';
                if ((data.owner.includes('고미') || data.owner.includes('뉴푸드')) && data.typeStr && (data.typeStr.includes('토지') || data.typeStr.includes('대지') || data.typeStr.includes('전답'))) addr = '인천광역시 중구 운서동';
                return addr && data.status !== 'finished';
            });
            const mapDelegated = mapItems.filter(d => !(d.manager.includes('개인') || d.manager.includes('법인'))).length;
            const mapDirect = mapItems.filter(d => (d.manager.includes('개인') || d.manager.includes('법인'))).length;
            
            const goldEl = document.getElementById('drawer-map-gold-count');
            if(goldEl) goldEl.innerText = '금색 투자자: 위탁 투자 (총 ' + mapDelegated + '건)';
            const purpleEl = document.getElementById('drawer-map-purple-count');
            if(purpleEl) purpleEl.innerText = '보라색 투자자: 직접 투자 (총 ' + mapDirect + '건)';
            
            const rs = document.getElementById('drawer-runner-sub1');
            if(rs) rs.innerText = `= 아파트 분양및 개발 차익 목적 (총 ${totalRunners}건)`;
            const ms = document.getElementById('drawer-map-sub1');
            if(ms) ms.innerText = `= 총 보유 부동산 (총 ${totalProps}건)`;
            
            renderMarathon();

            const savedTab = localStorage.getItem('propertyRunnerTab') || 'marathon';
            if (savedTab === 'map') {
                switchTab('map');
            }
        }

        function createCharacterDOM(data, isMapMode = false) {
                const container = document.createElement('div');
                container.className = 'runner-container';
                container.dataset.owner = data.owner;

                const runSpeedDuration = data.speed > 0 ? data.speed : 1.0;
                container.style.setProperty('--run-speed', `${runSpeedDuration}s`);

                const character = document.createElement('div');
                character.className = 'character';
                character.dataset.ownerName = data.owner;

                let teamClass = 'team-consignment';
                if (data.manager.includes('개인') || data.manager.includes('법인')) {
                    teamClass = 'team-self';
                }
                if (data.markerType !== 'runner') teamClass = 'team-static';
                character.classList.add(teamClass);
                if (data.owner && (data.owner.includes('하늬') || data.owner.includes('하니') || data.owner.includes('조영') || (data.owner.includes('아선') && data.address && data.address.includes('성수')))) {
                    character.classList.add('hurray');
                }

                if (!isMapMode && data.markerType === 'runner' && data.status !== 'finished') {
                    if (data.isPreparing || data.speed === 0) {
                        character.classList.add('sitting');
                    } else {
                        character.classList.add('running', 'running-bounce');
                    }
                }

                // Create Head Wrapper
                const headWrapper = document.createElement('div');
                headWrapper.className = 'runner-head-wrapper';
                
                let faceText = '😎';
                if (data.owner.includes('뉴푸드')) faceText = 'N';
                else if (data.owner.includes('고미')) faceText = 'G';
                else if (data.status === 'finished') faceText = '🏆';
                else if (data.status === 'good') faceText = '😃';
                else if (data.status === 'bad') faceText = '😭';

                const emojiSpan = document.createElement('span');
                emojiSpan.className = 'emoji'; 
                emojiSpan.textContent = faceText;
                
                const uploadedImg = document.createElement('img');
                uploadedImg.className = 'runner-photo face-img';
                
                const cleanOwnerName = data.owner.trim();
                const savedPhoto = localStorage.getItem('photo_' + data.owner);
                const assetPhotoPath = `./assets/${cleanOwnerName}.png?v=20260914_2`;

                if (savedPhoto) {
                    uploadedImg.src = savedPhoto;
                    uploadedImg.style.display = 'block';
                    emojiSpan.style.display = 'none';
                    character.dataset.hasPhoto = 'true';
                } else {
                    // Preload asset photo
                    uploadedImg.src = assetPhotoPath;
                    uploadedImg.style.display = 'none';
                    
                    uploadedImg.onload = function() {
                        uploadedImg.style.display = 'block';
                        emojiSpan.style.display = 'none';
                        character.dataset.hasPhoto = 'true';
                    };
                    uploadedImg.onerror = function() {
                        uploadedImg.style.display = 'none';
                        emojiSpan.style.display = 'inline-block';
                    };
                }

                headWrapper.appendChild(emojiSpan);
                headWrapper.appendChild(uploadedImg);

                if (data.markerType === 'runner') {
                    character.appendChild(headWrapper);
                    const torso = document.createElement('div');
                    torso.className = 'runner-torso';

                    
                    const nametag = document.createElement('div');
                    nametag.className = 'runner-nametag-glow';
                    let firstName = data.owner.length > 2 ? data.owner.substring(1) : data.owner;
                    if (isMapMode && (data.owner.includes('고미') || data.owner.includes('뉴푸드'))) {
                        firstName = '법인';
                    }
                    nametag.textContent = firstName;
                    
                    const legL = document.createElement('div');
                    legL.className = 'runner-leg-solid leg-left';
                    
                    const legR = document.createElement('div');
                    legR.className = 'runner-leg-solid leg-right';
                    
                    torso.appendChild(nametag);
                    torso.appendChild(legL);
                    torso.appendChild(legR);
                    character.appendChild(torso);

                    const statusTag = document.createElement('div');
                    statusTag.className = 'runner-status-minimal';
                    statusTag.textContent = `보유 ${data.actualYears.toFixed(1)}년차`;
                    character.appendChild(statusTag);

                    // Add photo upload click event
                    const clickArea = document.createElement('div');
                    clickArea.style.position = 'absolute';
                    clickArea.style.top = 0; clickArea.style.left = 0; clickArea.style.width = '100%'; clickArea.style.height = '100%';
                    clickArea.style.zIndex = 40;
                    torso.appendChild(clickArea);
                    
                    const toggleTooltip = (e) => {
                        e.stopPropagation();
                        const isActive = statusTag.classList.contains('active');
                        document.querySelectorAll('.runner-head-wrapper').forEach(h => h.classList.remove('zoomed'));
                        document.querySelectorAll('.speech-bubble, .stats-bubble, .runner-status-minimal').forEach(b => b.classList.remove('active'));
                        if (!isActive) {
                            statusTag.classList.add('active');
                        }
                    };
                    const toggleZoomAndTooltip = (e) => {
                        e.stopPropagation();
                        const isZoomed = headWrapper.classList.contains('zoomed');
                        document.querySelectorAll('.runner-head-wrapper').forEach(h => h.classList.remove('zoomed'));
                        document.querySelectorAll('.speech-bubble, .stats-bubble, .runner-status-minimal').forEach(b => b.classList.remove('active'));
                        if (!isZoomed) {
                            headWrapper.classList.add('zoomed');
                            statusTag.classList.add('active');
                        }
                    };
                    const triggerPhoto = (e) => {
                        e.stopPropagation();
                        currentUploadName = data.owner;
                        photoInput.click();
                    };
                    clickArea.addEventListener('click', toggleTooltip);
                    headWrapper.addEventListener('click', toggleZoomAndTooltip);
                    clickArea.addEventListener('dblclick', triggerPhoto);
                    headWrapper.addEventListener('dblclick', triggerPhoto);
                    
                    if (!isMapMode && data.status !== 'finished') {
                        const yearLabelDOM = document.createElement('div');
                        yearLabelDOM.className = 'runner-status-always';
                        
                        let displayText = data.statsText;
                        if (data.progressScore >= 60 && displayText.includes('/')) {
                            displayText = displayText.replace(/\s*\/\s*/, '<br>');
                        }
                        yearLabelDOM.innerHTML = displayText;
                        character.appendChild(yearLabelDOM);
                    }

                } else {
                    // Static assets on map mode (fallback)
                    const staticWrap = document.createElement('div');
                    staticWrap.className = 'static-asset-wrap';
                    const iconCircle = document.createElement('div');
                    iconCircle.className = 'static-icon-circle';
                    if (data.owner.includes('고미') && data.address && data.address.includes('성수')) {
                        iconCircle.innerHTML = '<img src="./assets/red_building.jpg" style="width:120%; height:120%; object-fit:contain;">';
                        iconCircle.style.background = 'transparent'; iconCircle.style.border = 'none'; iconCircle.style.boxShadow = 'none';
                    } else if (data.owner.includes('뉴푸드') && data.address && data.address.includes('서빙고')) {
                        iconCircle.innerHTML = '<img src="./assets/red_house.jpg" style="width:120%; height:120%; object-fit:contain;">';
                        iconCircle.style.background = 'transparent'; iconCircle.style.border = 'none'; iconCircle.style.boxShadow = 'none';
                    } else if (data.typeStr && data.typeStr.includes('호텔')) {
                        iconCircle.innerHTML = '<img src="./assets/red_building.jpg" style="width:120%; height:120%; object-fit:contain;">';
                        iconCircle.style.background = 'transparent'; iconCircle.style.border = 'none'; iconCircle.style.boxShadow = 'none';
                    } else if (data.typeStr && (data.typeStr.includes('토지') || data.typeStr.includes('대지') || data.typeStr.includes('전답'))) {
                        if (!window.gomiLandFlag) {
                            iconCircle.innerHTML = '<img src="./assets/daeji.jpg" style="width:120%; height:120%; object-fit:contain;">';
                            window.gomiLandFlag = true;
                        } else {
                            iconCircle.innerHTML = '<img src="./assets/jeondap.jpg" style="width:120%; height:120%; object-fit:contain;">';
                        }
                        iconCircle.style.background = 'transparent'; iconCircle.style.border = 'none'; iconCircle.style.boxShadow = 'none';
                    } else {
                        iconCircle.textContent = data.markerType === 'building' ? '🏢' : '🌱';
                    }
                    const nameLabel = document.createElement('div');
                    nameLabel.className = 'name-label';
                    let nameText = data.owner;
                    if (isMapMode && (data.owner.includes('고미') || data.owner.includes('뉴푸드'))) {
                        nameText = '법인';
                        nameLabel.style.backgroundColor = '#d32f2f'; // Red matching the image
                        nameLabel.style.borderColor = '#b71c1c';
                    }
                    nameLabel.textContent = nameText;
                    staticWrap.appendChild(iconCircle);
                    staticWrap.appendChild(nameLabel);
                    character.appendChild(staticWrap);
                }

                container.appendChild(character);
                return container;
            }

        function renderMarathon() {
            const viewArea = document.getElementById('view-marathon');
            const trackArea = document.getElementById('runners-area');
            if(!trackArea) return;
            trackArea.querySelectorAll('.runner-container').forEach(el => el.remove()); 
            
            const runners = runnersData.filter(d => d.markerType === 'runner' && d.status !== 'finished' && !(d.address && d.address.includes('이태원') && (d.owner.includes('영애') || d.owner.includes('준학') || d.owner.includes('기정') || d.owner.includes('윤정'))));
            
            runners.forEach(data => {
                data.finalProg = data.status === 'finished' ? 90 : data.progressScore;
                if (data.isPreparing) data.finalProg = -12; 
                
                
                
                if (data.owner && (data.owner.includes('창희') || data.owner.includes('제근') || data.owner.includes('완성'))) {
                    data.finalProg = 0;
                }
                
                
                let baseTop;
                if (data.finalProg >= 0) {
                    let p = data.finalProg;
                    if (p <= 15) {
                        baseTop = 85 - (p / 15) * 11.33;
                    } else if (p <= 45) {
                        baseTop = 73.67 - ((p - 15) / 30) * 34.67;
                    } else {
                        baseTop = 39.00 - ((p - 45) / 45) * 34.00;
                    }
                } else {
                    let ratio = data.finalProg / -12;
                    baseTop = 85 + (ratio * 6); // -12 -> 91%
                }
                
                let dongName = '';
                if (data.address) {
                    let clean = data.address.split(',')[0].split('.')[0].trim();
                    clean = clean.replace(/\s*\d+/g, '').replace(/상가동.*/g, '').replace(/동.*/g, '동');
                    dongName = clean.trim();
                }
                data._dongName = dongName;
                data._baseTop = baseTop;
            });

            // Group neighborhoods to assign X-axis lanes
            const dongs = [...new Set(runners.map(r => r._dongName))].filter(Boolean);
            const lanes = {};
            dongs.forEach((dong, idx) => {
                lanes[dong] = dongs.length > 1 ? 25 + (50 * (idx / (dongs.length - 1))) : 50;
            });

            // Sort by progress so we place from bottom to top
            runners.sort((a, b) => a.finalProg - b.finalProg);

            // Group into clusters based on Y proximity to perfectly center them
            const clusters = [];
            runners.forEach(data => {
                let added = false;
                for (let c of clusters) {
                    if (Math.abs(c.top - data._baseTop) < 3.0) {
                        c.runners.push(data);
                        added = true;
                        break;
                    }
                }
                if (!added) {
                    clusters.push({ top: data._baseTop, runners: [data] });
                }
            });

            const placed = [];
            
            clusters.forEach(cluster => {
                let n = cluster.runners.length;
                let GAP = 12.0; // 12% gap
                
                if (window.innerWidth <= 768) {
                    let hasTarget = cluster.runners.some(r => 
                        r.owner.includes('하늬') || r.owner.includes('조영') || 
                        r.address.includes('일원') || 
                        r.owner.includes('창희') || r.owner.includes('제근') || r.owner.includes('완성') ||
                        (r.owner.includes('아선') && r.address.includes('옥수')) || (r.owner.includes('희영') && r.address.includes('옥수'))
                    );
                    if (hasTarget) {
                        GAP = 26.0; // 모바일에서 라벨 텍스트 박스가 겹치지 않도록 넓힘
                    }
                } else {
                    if (n > 7) GAP = 10.0;
                    if (n > 9) GAP = 8.5;
                }

                // Exactly 48.75% aligns the center of the 40px character to the 410px point on a 800px track
                let startLeft = 48.75 - ((n - 1) * GAP / 2);
                
                cluster.runners.forEach((data, i) => {
                    let top = data._baseTop;
                    let left = startLeft + (i * GAP);
                    
                    
                    // Horizontal Spreading Overrides
                    if (data.owner.includes('아선') && data.address && data.address.includes('서빙고')) left = 35;
                    if (data.owner.includes('원일')) left = 65;
                    
                    if (data.owner.includes('준학')) left = 20;
                    if (data.owner.includes('경아')) left = 80;
                    
                    if (data.owner.includes('성준')) left = 35;
                    if (data.owner.includes('덕일')) left = 65;
                    if (data.owner.includes('문정')) left = 40;
                    if (data.owner.includes('희영') && data.address && data.address.includes('삼성')) left = 60;
                    if (data.owner.includes('의대')) left = 20;
                    if (data.owner.includes('지원')) left = 80;
                    
                    let minLeft = window.innerWidth <= 768 ? 17 : 6.5;
                    if (left < minLeft) left = minLeft + (Math.random() * 2);
                    if (left > 87) left = 87 - (Math.random() * 2);
                    
                    placed.push({top: top, left: left});
                    
                    const charDOM = createCharacterDOM(data, false);
                charDOM.style.left = `${left}%`;
                charDOM.style.top = `${top}%`;
                charDOM.style.zIndex = Math.floor(top * 100);
                
                trackArea.appendChild(charDOM); }); });
            
            // Auto-scroll to top on load
            setTimeout(() => {
                viewArea.scrollTop = 0;
            }, 100);
        }

        async function initKakaoMap() {
            if (typeof kakao === 'undefined' || !kakao.maps) return;

            const mapContainer = document.getElementById('view-map');
            const mapOption = { center: new kakao.maps.LatLng(37.5255, 126.9954), level: 7 };
            kakaoMap = new kakao.maps.Map(mapContainer, mapOption);
            geocoder = new kakao.maps.services.Geocoder();

            function cleanAddress(addr) {
                let clean = addr.split(',')[0].split('.')[0].trim();
                clean = clean.replace(/외\s*\d+필지/g, '').replace(/제상가동.*/g, '').replace(/번지.*/g, '');
                return clean.trim();
            }

            let coordsMap = {};
            const geocodePromises = runnersData.map(data => {
                let rawAddr = data.address || '';
                if (data.owner.includes('아선') && data.typeStr && data.typeStr.includes('호텔')) rawAddr = '인천광역시 중구 운서동';
                if ((data.owner.includes('고미') || data.owner.includes('뉴푸드')) && data.typeStr && (data.typeStr.includes('토지') || data.typeStr.includes('대지') || data.typeStr.includes('전답'))) rawAddr = '인천광역시 중구 운서동';
                
                if (!rawAddr || data.status === 'finished') return Promise.resolve();
                
                let searchAddr = cleanAddress(rawAddr);
                if (searchAddr === '인천' || searchAddr === '인천광역시' || searchAddr === '인천시') searchAddr = '인천광역시 남동구'; // Fallback for general Incheon to ensure geocoding succeeds
                if (data.owner.includes('고미') && data.address.includes('성수')) {
                    searchAddr = '서울 성동구 성수일로 111';
                }
                return new Promise(resolve => {
                    geocoder.addressSearch(searchAddr, function(result, status) {
                        if (status === kakao.maps.services.Status.OK) {
                            const key = `${result[0].y}_${result[0].x}`;
                            if (!coordsMap[key]) {
                                coordsMap[key] = { coords: new kakao.maps.LatLng(result[0].y, result[0].x), items: [] };
                            }
                            coordsMap[key].items.push(data);
                        }
                        resolve();
                    });
                });
            });

            await Promise.all(geocodePromises);

            Object.values(coordsMap).forEach(group => {
                const count = group.items.length;
                group.items.forEach((runnerData, index) => {
                    const charDOM = createCharacterDOM(runnerData, true);
                    
                    const offsetX = (index - (count - 1) / 2) * 60;
                    
                    const overlayWrap = document.createElement('div');
                    overlayWrap.style.transform = `translateX(${offsetX}px)`;
                    overlayWrap.style.zIndex = Math.floor(1000 - index); 
                    
                    charDOM.style.position = 'relative';
                    charDOM.style.left = '0'; 
                    charDOM.style.top = '0';

                    overlayWrap.appendChild(charDOM);

                    new kakao.maps.CustomOverlay({
                        map: kakaoMap,
                        position: group.coords,
                        content: overlayWrap,
                        yAnchor: 1 
                    });
                });
            });
        }

        document.body.addEventListener('click', (e) => {
            if (!e.target.closest('.character')) {
                document.querySelectorAll('.runner-head-wrapper').forEach(h => h.classList.remove('zoomed'));
                document.querySelectorAll('.speech-bubble, .stats-bubble, .runner-status-minimal').forEach(b => b.classList.remove('active'));
            }
        });

        window.addEventListener('DOMContentLoaded', fetchAndParseData);
    