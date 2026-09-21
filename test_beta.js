
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

        function switchTab(mode) {
            localStorage.setItem('propertyRunnerTab', mode);
            document.getElementById('view-marathon').style.display = (mode === 'marathon') ? 'block' : 'none';
            document.getElementById('view-map').style.display = (mode === 'map') ? 'block' : 'none';
            if(document.getElementById('view-dashboard')) document.getElementById('view-dashboard').style.display = (mode === 'dashboard') ? 'block' : 'none';
            
            const btnMarathon = document.getElementById('btn-marathon');
            const btnMap = document.getElementById('btn-map');
            const btnDash = document.getElementById('btn-dashboard');
            
            if(btnMarathon) btnMarathon.className = (mode === 'marathon') ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
            if(btnMap) btnMap.className = (mode === 'map') ? 'tab-btn tab-active' : 'tab-btn tab-inactive';
            if(btnDash) btnDash.className = (mode === 'dashboard') ? 'tab-btn tab-active' : 'tab-btn tab-inactive';

            if (mode === 'map') {
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
            } else if (mode === 'dashboard') {
                if (!window.dashInitialized) {
                    initDemoDashboard();
                    window.dashInitialized = true;
                }
            }
        }, 100);
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

        window.addEventListener('DOMContentLoaded', () => {
            const savedTab = localStorage.getItem('propertyRunnerTab') || 'marathon';
            if (savedTab !== 'marathon') {
                switchTab(savedTab);
            }
            fetchAndParseData();
        });
    
/* --- DEMO DATA --- */
const rawData = {"properties": [{"id": "Re_C1_01", "owner": "고미", "type": "토지", "value": 400000000.0, "invest": 412461590.0, "future": 400000000.0, "name": "인천 운서동 3047-19", "buy_date": "2015.5", "buy_price": 562461590.0, "status": "운용중", "dev_stage": "매각 진행중", "exit_strategy": "매도", "tax_note": "", "memo": "분양: 분양확정"}, {"id": "Re_C1_02", "owner": "고미", "type": "토지", "value": 400000000.0, "invest": 385749540.0, "future": 400000000.0, "name": "인천 운북동 789-285", "buy_date": "2015.8", "buy_price": 535749540.0, "status": "운용중", "dev_stage": "매각 진행중", "exit_strategy": "매도", "tax_note": "", "memo": "분양: 초고가 아파트"}, {"id": "Re_P1_01", "owner": "양아선", "type": "분양호텔", "value": 99000000.0, "invest": 170096940.0, "future": 99000000.0, "name": "인천 골든튤립호텔 407호", "buy_date": "2015.5", "buy_price": 170096940.0, "status": "운용중", "dev_stage": "매각 진행중", "exit_strategy": "26.11.30  매도예정", "tax_note": "", "memo": "사업자등록완료"}, {"id": "Re_P1_02", "owner": "양아선", "type": "분양호텔", "value": 99000000.0, "invest": 170096940.0, "future": 99000000.0, "name": "인천 골든튤립호텔 408호", "buy_date": "2015.5", "buy_price": 170096940.0, "status": "운용중", "dev_stage": "매각 진행중", "exit_strategy": "26.11.30  매도예정", "tax_note": "", "memo": "분양: 고가 아파트"}, {"id": "Re_P1_03", "owner": "양아선", "type": "신축빌라", "value": 900000000.0, "invest": 357931190.0, "future": 3000000000.0, "name": "서빙고로62길 29-4  501호", "buy_date": "2018.3", "buy_price": 457931190.0, "status": "운용중", "dev_stage": "2. 정비구역 지정/ 계획 수립", "exit_strategy": "조합설립인가 확실시에 매도\n(목표가 11~13억)", "tax_note": "0", "memo": "airbnb"}, {"id": "Re_C2_01", "owner": "뉴푸드", "type": "빌라", "value": 790000000.0, "invest": 149902350.0, "future": 2000000000.0, "name": "서빙고동 198-6  101호", "buy_date": "2018.3", "buy_price": 349902350.0, "status": "운용중", "dev_stage": "매각 진행중", "exit_strategy": "매도", "tax_note": "", "memo": ""}, {"id": "Re_P2_01", "owner": "신원일", "type": "주택", "value": 600000000.0, "invest": 354555000.0, "future": 1500000000.0, "name": "서빙고동 271-57외 1필지", "buy_date": "2018.11", "buy_price": 359555000.0, "status": "운용중", "dev_stage": "2. 정비구역 지정/ 계획 수립", "exit_strategy": "보유 / 분양받기", "tax_note": "0", "memo": "강미영 절반"}, {"id": "Re_P2_02", "owner": "최창희", "type": "상가", "value": 180000000.0, "invest": 168000000.0, "future": 180000000.0, "name": "중구 황학동259", "buy_date": "2020.7", "buy_price": 168000000.0, "status": "운용중", "dev_stage": "0. 사전 준비", "exit_strategy": "보유 / 분양받기", "tax_note": "x", "memo": "250708. 대출 7천상환완료\n(송경미통함) -임대수익발생"}, {"id": "Re_P2_03", "owner": "김영애", "type": "신축빌라", "value": 650000000.0, "invest": 159706040.0, "future": 650000000.0, "name": "이태원동 181-40, 104호", "buy_date": "2021.7", "buy_price": 469706040.0, "status": "운용중", "dev_stage": "매각예정", "exit_strategy": "27.7.14 매도", "tax_note": "0", "memo": "전세3.5억-> 3억> 3.1억(갱신) / 분양: 매도 & 종잣돈 불리기 (9건)"}, {"id": "Re_O_01", "owner": "심윤정", "type": "신축빌라", "value": 700000000.0, "invest": 176848000.0, "future": 700000000.0, "name": "이태원동 181-40, 101호", "buy_date": "2021.7", "buy_price": 541848000.0, "status": "운용중", "dev_stage": "매각예정", "exit_strategy": "28.9.20 매도", "tax_note": "0", "memo": "전세4.2억->3.65억 / 분양: 매도 필수"}, {"id": "Re_P2_04", "owner": "오준학", "type": "신축빌라", "value": 650000000.0, "invest": 172878600.0, "future": 650000000.0, "name": "이태원동 181-40, 305호", "buy_date": "2021.9", "buy_price": 472878600.0, "status": "운용중", "dev_stage": "매각예정", "exit_strategy": "27.11.14 /기한28.11.14", "tax_note": "0", "memo": "전세3.55억-> 3억"}, {"id": "Re_O_02", "owner": "주기정", "type": "신축빌라", "value": 650000000.0, "invest": 176334040.0, "future": 650000000.0, "name": "이태원동 181-40, 202호", "buy_date": "2021.9", "buy_price": 476334040.0, "status": "운용중", "dev_stage": "매각예정", "exit_strategy": "27.9.27 매도", "tax_note": "0", "memo": ""}, {"id": "Re_O_03", "owner": "한제근", "type": "빌라", "value": 450000000.0, "invest": 106392670.0, "future": 450000000.0, "name": "중구 황학동 1200, 805호", "buy_date": "2021.9", "buy_price": 356392670.0, "status": "운용중", "dev_stage": "0. 사전 준비", "exit_strategy": "담당아님", "tax_note": "", "memo": ""}, {"id": "Re_C1_03", "owner": "고미", "type": "지산", "value": 950000000.0, "invest": 774719566.0, "future": 1150000000.0, "name": "성동구 성수일로 111, B206호", "buy_date": "2022.3", "buy_price": 804719566.0, "status": "운용중", "dev_stage": "", "exit_strategy": "보유", "tax_note": "", "memo": "권자1억/기정2.2억/은행4.14억 상환완료\n임대수익률6.57% (25년6월이후)"}, {"id": "Re_P2_05", "owner": "한완성", "type": "상가", "value": 150000000.0, "invest": 136952120.0, "future": 160000000.0, "name": "중구 황학동 521-1", "buy_date": "2022.4", "buy_price": 136952120.0, "status": "운용중", "dev_stage": "0. 사전 준비", "exit_strategy": "구역지정시 매도", "tax_note": "x", "memo": "250708.대출3200만 상환완료\n(송경미통함)-임대수익발생"}, {"id": "Re_P1_04", "owner": "양아선", "type": "상가", "value": 300000000.0, "invest": 283203890.0, "future": 3000000000.0, "name": "옥수동 100 제상가동 404호", "buy_date": "2025.1", "buy_price": 283203890.0, "status": "운용중", "dev_stage": "진행전", "exit_strategy": "구역지정시 매도", "tax_note": "x", "memo": "사업자등록완료 / 분양: 매도 후 상급지 갈아타기 (6명)"}, {"id": "Re_O_04", "owner": "정희영", "type": "상가", "value": 300000000.0, "invest": 283203110.0, "future": 3000000000.0, "name": "옥수동 100 제상가동 403-1호", "buy_date": "2025.1", "buy_price": 283203110.0, "status": "운용중", "dev_stage": "진행전", "exit_strategy": "구역지정시 매도", "tax_note": "", "memo": "사업자등록완료 / 분양: 매도 검토"}, {"id": "Re_O_05", "owner": "주하늬", "type": "빌라", "value": 900000000.0, "invest": 464600810.0, "future": 2000000000.0, "name": "둔촌동 69-11번지 A동 503호", "buy_date": "2025.2", "buy_price": 634600810.0, "status": "운용중", "dev_stage": "4. 통합심의/ 사업시행인가", "exit_strategy": "분담금준비 / 분양확정", "tax_note": "0", "memo": "24평형. 59제곱\n조합원분양가 9.95억"}, {"id": "Re_P1_05", "owner": "양아선", "type": "상가", "value": 450000000.0, "invest": 397200000.0, "future": 3500000000.0, "name": "일원동 716  B7-1-1", "buy_date": "2025.5", "buy_price": 398700000.0, "status": "운용중", "dev_stage": "2. 정비계획 수립/ 구역 지정", "exit_strategy": "구역지정시 매도", "tax_note": "", "memo": "사업자등록완료 / 분양: 분담금 부족"}, {"id": "Re_O_06", "owner": "김미한", "type": "상가", "value": 550000000.0, "invest": 476501770.0, "future": 3500000000.0, "name": "일원동 716 B7-1-2", "buy_date": "2025.2", "buy_price": 476501770.0, "status": "운용중", "dev_stage": "2. 정비계획 수립/ 구역 지정", "exit_strategy": "보유 / 분양받기", "tax_note": "", "memo": "사업자등록완료"}, {"id": "Re_O_07", "owner": "문라연", "type": "상가", "value": 470000000.0, "invest": 412059330.0, "future": 3600000000.0, "name": "일원동 716 B7-1-3", "buy_date": "2025.2", "buy_price": 412059330.0, "status": "운용중", "dev_stage": "2. 정비계획 수립/ 구역 지정", "exit_strategy": "매도검토 / 갈아타기", "tax_note": "", "memo": "사업자등록완료"}, {"id": "Re_O_08", "owner": "황의대", "type": "신축빌라", "value": 800000000.0, "invest": 155683446.0, "future": 1500000000.0, "name": "송파구 삼전동 71-27 501호", "buy_date": "2025.7", "buy_price": 395683446.0, "status": "운용중", "dev_stage": "0. 입안 제안 준비", "exit_strategy": "매도검토 / 갈아타기", "tax_note": "x", "memo": "분양: 명의"}, {"id": "Re_O_09", "owner": "이지원", "type": "신축빌라", "value": 830000000.0, "invest": 156164334.0, "future": 1500000000.0, "name": "송파구 삼전동 71-27 404호", "buy_date": "2025.7", "buy_price": 431164334.0, "status": "운용중", "dev_stage": "0. 입안 제안 준비", "exit_strategy": "보유 / 분양받기", "tax_note": "x", "memo": "분양: 김영애"}, {"id": "Re_O_10", "owner": "김조영", "type": "빌라", "value": 900000000.0, "invest": 494381946.0, "future": 2000000000.0, "name": "둔촌동 69-11번지 A동 303호", "buy_date": "2025.4", "buy_price": 634381946.0, "status": "운용중", "dev_stage": "4. 통합심의/ 사업시행인가", "exit_strategy": "분담금준비 / 분양확정", "tax_note": "0", "memo": "24평형. 59제곱\n조합원분양가 9.95억 / 분양: 주기정"}, {"id": "Re_P2_06", "owner": "정희영", "type": "빌라", "value": 1250000000.0, "invest": 818310910.0, "future": 4000000000.0, "name": "삼성동 47-26. 102호", "buy_date": "2025.6", "buy_price": 1238310910.0, "status": "운용중", "dev_stage": "0. 입안 제안 준비", "exit_strategy": "보유 / 분양받기", "tax_note": "x", "memo": "분양: 오준학"}, {"id": "Re_O_11", "owner": "문성준", "type": "신축빌라", "value": 800000000.0, "invest": 261458397.0, "future": 4000000000.0, "name": "서초동 1514-2. H동 504호", "buy_date": "2025.7", "buy_price": 671458397.0, "status": "운용중", "dev_stage": "0. 입안 제안 준비", "exit_strategy": "보유 / 분양받기", "tax_note": "x", "memo": "상생임대인/모아타운가능 / 분양: 심윤정"}, {"id": "Re_P1_06", "owner": "양아선", "type": "상가", "value": 3200000000.0, "invest": 560000000.0, "future": 6000000000.0, "name": "성동구 성수동2가 331-243", "buy_date": "2026.2", "buy_price": 1600000000.0, "status": "운용중", "dev_stage": "3. 건축심의 / 사업시행계획인가", "exit_strategy": "보유 / 분양받기", "tax_note": "", "memo": ""}, {"id": "Re_O_12", "owner": "신덕일", "type": "신축빌라", "value": 900000000.0, "invest": 400670000.0, "future": 4000000000.0, "name": "방배동 871-1. 401호", "buy_date": "2027.4", "buy_price": 800670000.0, "status": "운용중", "dev_stage": "0. 입안 제안 준비", "exit_strategy": "보유 / 분양받기", "tax_note": "x", "memo": ""}, {"id": "Re_O_13", "owner": "최문정", "type": "신축빌라", "value": 500000000.0, "invest": 248499680.0, "future": 2500000000.0, "name": "구의동 643-4,5  402호", "buy_date": "2027.1", "buy_price": 488499680.0, "status": "운용중", "dev_stage": "0. 입안 제안 준비", "exit_strategy": "매도검토 / 갈아타기", "tax_note": "x", "memo": ""}, {"id": "Re_O_14", "owner": "오준학", "type": "신축빌라", "value": 700000000.0, "invest": 266950000.0, "future": 3500000000.0, "name": "서초동 1481-10. 303호 (2R)", "buy_date": "2027.5", "buy_price": 616950000.0, "status": "운용중", "dev_stage": "0. 입안 제안 준비", "exit_strategy": "보유 / 분양받기", "tax_note": "x", "memo": ""}, {"id": "Re_O_15", "owner": "김경아", "type": "신축빌라", "value": 700000000.0, "invest": 277510000.0, "future": 3500000000.0, "name": "서초동 1481-10. 502호 (2R)", "buy_date": "2027.5", "buy_price": 637510000.0, "status": "운용중", "dev_stage": "0. 입안 제안 준비", "exit_strategy": "매도검토 / 갈아타기", "tax_note": "x", "memo": ""}], "sold_properties": [{"id": "", "owner": "정희영", "type": "빌라", "value": 1150000000.0, "invest": 275037800.0, "future": 1150000000.0, "name": "이태원동 63-33, 304호", "buy_date": "2019.2", "buy_price": 375037800.0, "status": "매각완료", "dev_stage": "", "exit_strategy": "매도", "tax_note": "", "memo": "11.5억 매각완료", "roi": 318.12434509002037}, {"id": "", "owner": "고미", "type": "상가", "value": 1600000000.0, "invest": 206010291.0, "future": 7000000000.0, "name": "성동구 성수동2가 331-243", "buy_date": "2020.4", "buy_price": 1056010291.0, "status": "매각완료", "dev_stage": "", "exit_strategy": "매도", "tax_note": "", "memo": "서선현1억 / 이권혁3억", "roi": 676.6602300464689}, {"id": "", "owner": "고미", "type": "빌라", "value": 1450000000.0, "invest": 437185800.0, "future": 1450000000.0, "name": "이태원 74-27,201호", "buy_date": "2020.6", "buy_price": 637185800.0, "status": "매각완료", "dev_stage": "", "exit_strategy": "매도", "tax_note": "", "memo": "14.5억 매각완료", "roi": 231.66676502301766}], "dev_alerts": [{"id": "Re_P1_03", "owner": "양아선", "type": "신축빌라", "value": 900000000.0, "invest": 357931190.0, "future": 3000000000.0, "name": "서빙고로62길 29-4  501호", "buy_date": "2018.3", "buy_price": 457931190.0, "status": "운용중", "dev_stage": "2. 정비구역 지정/ 계획 수립", "exit_strategy": "조합설립인가 확실시에 매도\n(목표가 11~13억)", "tax_note": "0", "memo": "airbnb"}], "flows": [{"title": "세후현금흐름", "items": ["기부 합계", "은행잔액합계", "증권잔액합계", "관리통장 내역 업데이트 26.08.30"]}, {"title": "(아선) 일원, 옥수, 차량 매입자금 및 커미션 흐름", "items": ["251115", "251123", "251130", "251130"]}, {"title": "[고미 이태원주택] 매각금액 흐름", "items": ["250305", "250312", "250408"]}], "rents": [{"id": "Re_P1_06", "bldg": "고미빌딩", "room": "301", "tenant": "허재석", "deposit": 10000000.0, "rent": 700000.0, "dday": 341, "end_date": "2027-08-22 00:00:00", "owner": "양아선"}, {"id": "Re_P1_06", "bldg": "고미빌딩", "room": "302", "tenant": "황정연", "deposit": 30000000.0, "rent": 1700000.0, "dday": 294, "end_date": "2027-07-06 00:00:00", "owner": "양아선"}, {"id": "Re_P1_06", "bldg": "고미빌딩", "room": "303", "tenant": "양아선", "deposit": 20000000.0, "rent": 1850000.0, "dday": 504, "end_date": "2028-02-01 00:00:00", "owner": "양아선"}, {"id": "Re_P1_06", "bldg": "고미빌딩", "room": "201", "tenant": "에이치케이", "deposit": 10000000.0, "rent": 1200000.0, "dday": 310, "end_date": "2027-07-22 00:00:00", "owner": "양아선"}, {"id": "Re_P1_06", "bldg": "고미빌딩", "room": "202", "tenant": "강동훈", "deposit": 20000000.0, "rent": 1700000.0, "dday": 654, "end_date": "2028-06-30 00:00:00", "owner": "양아선"}, {"id": "Re_P1_06", "bldg": "고미빌딩", "room": "203", "tenant": "신국어연구", "deposit": 20000000.0, "rent": 1850000.0, "dday": 79, "end_date": "2026-12-03 00:00:00", "owner": "양아선"}, {"id": "Re_C1_03", "bldg": "선명스퀘어", "room": "B206", "tenant": "쏘울라이브", "deposit": 30000000.0, "rent": 3050000.0, "dday": 283, "end_date": "2027-06-25 00:00:00", "owner": "고미"}, {"id": "Re_P1_04", "bldg": "양아선상가", "room": "404", "tenant": "부성씨앤아이", "deposit": 0.0, "rent": 180000.0, "dday": 488, "end_date": "2028-01-16 00:00:00", "owner": "양아선"}, {"id": "Re_O_04", "bldg": "정희영상가", "room": "403-1", "tenant": "부성씨앤아이", "deposit": 0.0, "rent": 180000.0, "dday": 488, "end_date": "2028-01-16 00:00:00", "owner": "정희영"}, {"id": "Re_P1_05", "bldg": "양아선상가", "room": "지하7-1-1", "tenant": "와이에스비", "deposit": 1500000.0, "rent": 150000.0, "dday": 229, "end_date": "2027-05-02 00:00:00", "owner": "양아선"}, {"id": "Re_O_06", "bldg": "김미한상가", "room": "지하7-1-2", "tenant": "와이에스비", "deposit": 3700000.0, "rent": 370000.0, "dday": 165, "end_date": "2027-02-27 00:00:00", "owner": "김미한"}, {"id": "Re_O_07", "bldg": "문라연상가", "room": "지하7-1-3", "tenant": "와이에스비", "deposit": 2000000.0, "rent": 200000.0, "dday": 176, "end_date": "2027-03-10 00:00:00", "owner": "문라연"}, {"id": "Re_P1_01", "bldg": "골든호텔", "room": "407", "tenant": "인천공항글로벌", "deposit": 0.0, "rent": 534909.0, "dday": 1568, "end_date": "2030-12-31 00:00:00", "owner": "양아선"}, {"id": "Re_P1_02", "bldg": "골든호텔", "room": "408", "tenant": "인천공항글로벌", "deposit": 0.0, "rent": 534909.0, "dday": 1568, "end_date": "2030-12-31 00:00:00", "owner": "양아선"}, {"id": "Re_C2_01", "bldg": "동남빌라", "room": "101", "tenant": "최준", "deposit": 200000000.0, "rent": 0.0, "dday": 127, "end_date": "2027-01-20 00:00:00", "owner": "뉴푸드"}, {"id": "Re_P1_03", "bldg": "리버빌", "room": "501", "tenant": "", "deposit": 0.0, "rent": 0.0, "dday": 9999, "end_date": "", "owner": "양아선"}, {"id": "Re_P2_01", "bldg": "신원일집", "room": "101", "tenant": "박병규", "deposit": 5000000.0, "rent": 350000.0, "dday": 76, "end_date": "2026-11-30 00:00:00", "owner": "신원일"}, {"id": "Re_P2_02", "bldg": "최창희집", "room": "101", "tenant": "에스에스", "deposit": 0.0, "rent": 160000.0, "dday": 1416, "end_date": "2030-08-01 00:00:00", "owner": "최창희"}, {"id": "Re_P2_05", "bldg": "한완성집", "room": "101", "tenant": "에스에스", "deposit": 0.0, "rent": 100000.0, "dday": 1416, "end_date": "2030-08-01 00:00:00", "owner": "한완성"}, {"id": "Re_O_03", "bldg": "한제근집", "room": "805", "tenant": "박상현", "deposit": 250000000.0, "rent": 0.0, "dday": 147, "end_date": "2027-02-09 00:00:00", "owner": "한제근"}, {"id": "Re_P2_03", "bldg": "김영애집", "room": "104", "tenant": "이호승", "deposit": 310000000.0, "rent": 0.0, "dday": 302, "end_date": "2027-07-14 00:00:00", "owner": "김영애"}, {"id": "Re_O_01", "bldg": "심윤정집", "room": "101", "tenant": "정다이", "deposit": 365000000.0, "rent": 0.0, "dday": 736, "end_date": "2028-09-20 00:00:00", "owner": "심윤정"}, {"id": "Re_P2_04", "bldg": "오준학집", "room": "305", "tenant": "신희재", "deposit": 300000000.0, "rent": 0.0, "dday": 425, "end_date": "2027-11-14 00:00:00", "owner": "오준학"}, {"id": "Re_O_02", "bldg": "주기정집", "room": "202", "tenant": "박수현", "deposit": 300000000.0, "rent": 0.0, "dday": 377, "end_date": "2027-09-27 00:00:00", "owner": "주기정"}, {"id": "Re_O_05", "bldg": "주하늬집", "room": "503", "tenant": "김가영", "deposit": 170000000.0, "rent": 0.0, "dday": 659, "end_date": "2028-07-05 00:00:00", "owner": "주하늬"}, {"id": "Re_O_10", "bldg": "김조영집", "room": "303", "tenant": "황춘경", "deposit": 140000000.0, "rent": 0.0, "dday": 73, "end_date": "2026-11-27 00:00:00", "owner": "김조영"}, {"id": "Re_O_08", "bldg": "황의대집", "room": "501", "tenant": "임강산", "deposit": 240000000.0, "rent": 0.0, "dday": 382, "end_date": "2027-10-02 00:00:00", "owner": "황의대"}, {"id": "Re_O_09", "bldg": "이지원집", "room": "404", "tenant": "홍준범", "deposit": 275000000.0, "rent": 0.0, "dday": 365, "end_date": "2027-09-15 00:00:00", "owner": "이지원"}, {"id": "Re_P2_06", "bldg": "정희영집", "room": "102", "tenant": "안호성", "deposit": 430000000.0, "rent": 0.0, "dday": 593, "end_date": "2028-04-30 00:00:00", "owner": "정희영"}, {"id": "Re_O_11", "bldg": "문성준집", "room": "504", "tenant": "김준수", "deposit": 410000000.0, "rent": 0.0, "dday": 374, "end_date": "2027-09-24 00:00:00", "owner": "문성준"}, {"id": "Re_O_12", "bldg": "신덕일집", "room": "401", "tenant": "", "deposit": 400000000.0, "rent": 0.0, "dday": 9999, "end_date": "", "owner": "신덕일"}, {"id": "Re_O_13", "bldg": "최문정집", "room": "401", "tenant": "", "deposit": 240000000.0, "rent": 0.0, "dday": 9999, "end_date": "", "owner": "최문정"}, {"id": "", "bldg": "주차비 관리", "room": "", "tenant": "", "deposit": 0.0, "rent": 0.0, "dday": 9999, "end_date": "", "owner": "고미"}, {"id": "", "bldg": "고미빌딩", "room": "201호", "tenant": "문병준", "deposit": 0.0, "rent": 0.0, "dday": 9999, "end_date": "2026-12-31 00:00:00", "owner": "고미"}, {"id": "", "bldg": "고미빌딩", "room": "202호", "tenant": "강동훈", "deposit": 0.0, "rent": 0.0, "dday": 9999, "end_date": "2027-06-30 00:00:00", "owner": "고미"}, {"id": "", "bldg": "고미빌딩", "room": "외부", "tenant": "손동협", "deposit": 0.0, "rent": 0.0, "dday": 9999, "end_date": "", "owner": "고미"}, {"id": "", "bldg": "고미빌딩", "room": "국수집", "tenant": "김리라", "deposit": 0.0, "rent": 0.0, "dday": 9999, "end_date": "", "owner": "고미"}, {"id": "", "bldg": "고미빌딩", "room": "옆건물", "tenant": "안효훈", "deposit": 0.0, "rent": 0.0, "dday": 9999, "end_date": "", "owner": "고미"}, {"id": "", "bldg": "기타수입", "room": "", "tenant": "", "deposit": 0.0, "rent": 0.0, "dday": 9999, "end_date": "", "owner": "고미"}, {"id": "", "bldg": "고미빌딩", "room": "", "tenant": "성수관리단", "deposit": 0.0, "rent": 0.0, "dday": 9999, "end_date": "", "owner": "고미"}], "debts": [{"borrower": "고미", "principal": 80000000.0, "monthly_interest": 0.0}, {"borrower": "뉴푸드", "principal": 90000000.0, "monthly_interest": 0.0}, {"borrower": "뉴푸드", "principal": 10000000.0, "monthly_interest": 0.0}, {"borrower": "고미", "principal": 200000000.0, "monthly_interest": 0.0}, {"borrower": "고미", "principal": 450000000.0, "monthly_interest": 0.0}, {"borrower": "고미", "principal": 300000000.0, "monthly_interest": 870000.0}, {"borrower": "고미", "principal": 100000000.0, "monthly_interest": 335000.0}, {"borrower": "양아선", "principal": 550000000.0, "monthly_interest": 1957083.3333333333}, {"borrower": "양아선", "principal": 300000000.0, "monthly_interest": 525000.0}, {"borrower": "고미", "principal": 200000000.0, "monthly_interest": 0.0}, {"borrower": "고미", "principal": 100000000.0, "monthly_interest": 0.0}, {"borrower": "뉴푸드(501호)", "principal": 100000000.0, "monthly_interest": 384166.6666666667}, {"borrower": "뉴푸드/(동남빌라)", "principal": 100000000.0, "monthly_interest": 0.0}, {"borrower": "뉴푸드", "principal": 160000000.0, "monthly_interest": 0.0}, {"borrower": "양아선", "principal": 400000000.0, "monthly_interest": 0.0}, {"borrower": "양아선", "principal": 100000000.0, "monthly_interest": 0.0}, {"borrower": "오준*", "principal": 70000000.0, "monthly_interest": 0.0}, {"borrower": "김*애", "principal": 50000000.0, "monthly_interest": 0.0}, {"borrower": "고미", "principal": 10000000.0, "monthly_interest": 0.0}, {"borrower": "고미", "principal": 615000000.0, "monthly_interest": 0.0}, {"borrower": "고미", "principal": 295000000.0, "monthly_interest": 0.0}, {"borrower": "딘어게인", "principal": 20000000.0, "monthly_interest": 0.0}, {"borrower": "고미", "principal": 414000000.0, "monthly_interest": 0.0}, {"borrower": "양아선", "principal": 200000000.0, "monthly_interest": 0.0}, {"borrower": "양아선", "principal": 136000000.0, "monthly_interest": 0.0}, {"borrower": "양아선", "principal": 120000000.0, "monthly_interest": 0.0}, {"borrower": "양아선", "principal": 85000000.0, "monthly_interest": 148750.0}, {"borrower": "고미", "principal": 100000000.0, "monthly_interest": 0.0}, {"borrower": "고미", "principal": 100000000.0, "monthly_interest": 0.0}, {"borrower": "고미", "principal": 100000000.0, "monthly_interest": 0.0}, {"borrower": "자본금", "principal": 50000000.0, "monthly_interest": 0.0}, {"borrower": "오준*(양아선)", "principal": 55000000.0, "monthly_interest": 0.0}, {"borrower": "양아선", "principal": 350000000.0, "monthly_interest": 1166666.6666666667}, {"borrower": "양아선", "principal": 140000000.0, "monthly_interest": 466666.6666666667}, {"borrower": "이체", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "송경미->고미법인", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "고미법인->대표. 신한3377", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "이권혁->대표. 신한3377", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->뉴푸드4054", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->김중훈법무사", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->한국대부협회", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->서울보증보험", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->미래에셋CMA", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "미래에셋CMA->양아선대표3377", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->신한적금", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->미래에셋CMA", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->금융감독원", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "미래에셋CMA->양아선대표3377", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377-고미법인", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "신한적금->양아선대표3377", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->고미법인", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "한남대부 사업자등록완료", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "미래에셋CMA->3377", "principal": 0.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->한남대부", "principal": 55000000.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->한남대부", "principal": 7000000.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->한남대부", "principal": 13000000.0, "monthly_interest": 0.0}, {"borrower": "양아선대표3377->한남대부", "principal": 18000000.0, "monthly_interest": 0.0}], "owners": ["고미", "김경아", "김미한", "김영애", "김조영", "뉴푸드", "문라연", "문성준", "신덕일", "신원일", "심윤정", "양아선", "오준학", "이지원", "정희영", "주기정", "주하늬", "최문정", "최창희", "한완성", "한제근", "황의대"]};
/* --- DEMO LOGIC --- */

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
        function demoSwitchTab(tabId, btnElement) {
            document.querySelectorAll('.demo-tab-content').forEach(el => el.classList.remove('active'));
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

        window.onload = () => switchTab('dashboard', document.querySelector('.nav-btn'));
    
