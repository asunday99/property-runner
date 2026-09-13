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
                if (data.manager === '개인' || data.manager === '개인위탁' || data.manager === '법인') {
                    teamClass = 'team-self';
                }
                if (data.markerType !== 'runner') teamClass = 'team-static';
                character.classList.add(teamClass);

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
                
                const savedPhoto = localStorage.getItem('photo_' + data.owner);
                if (savedPhoto) {
                    uploadedImg.src = savedPhoto;
                    uploadedImg.style.display = 'block';
                    emojiSpan.style.display = 'none';
                    character.dataset.hasPhoto = 'true';
                }

                headWrapper.appendChild(emojiSpan);
                headWrapper.appendChild(uploadedImg);
                character.appendChild(headWrapper);

                if (data.markerType === 'runner') {
                    const torso = document.createElement('div');
                    torso.className = 'runner-torso';
                    
                    const nametag = document.createElement('div');
                    nametag.className = 'runner-nametag-glow';
                    let firstName = data.owner.length > 2 ? data.owner.substring(1) : data.owner;
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
                    statusTag.textContent = data.statsText;
                    character.appendChild(statusTag);

                    // Add photo upload click event
                    const clickArea = document.createElement('div');
                    clickArea.style.position = 'absolute';
                    clickArea.style.top = 0; clickArea.style.left = 0; clickArea.style.width = '100%'; clickArea.style.height = '100%';
                    clickArea.style.zIndex = 40;
                    torso.appendChild(clickArea);
                    
                    clickArea.addEventListener('click', (e) => {
                        e.stopPropagation();
                        currentUploadName = data.owner;
                        photoInput.click();
                    });
                    
                    headWrapper.addEventListener('click', (e) => {
                        e.stopPropagation();
                        currentUploadName = data.owner;
                        photoInput.click();
                    });

                } else {
                    // Static assets on map mode (fallback)
                    const staticWrap = document.createElement('div');
                    staticWrap.className = 'static-asset-wrap';
                    const iconCircle = document.createElement('div');
                    iconCircle.className = 'static-icon-circle';
                    iconCircle.textContent = data.markerType === 'building' ? '🏢' : '🌱';
                    const nameLabel = document.createElement('div');
                    nameLabel.className = 'name-label';
                    nameLabel.textContent = data.owner;
                    staticWrap.appendChild(iconCircle);
                    staticWrap.appendChild(nameLabel);
                    character.appendChild(staticWrap);
                }

                container.appendChild(character);
                return container;
            }