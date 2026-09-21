import re

with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad_str = """ } else {
                btnMap.className = 'tab-btn tab-active';
                btnMarathon.className = 'tab-btn tab-inactive';
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
        }"""
        
# Note: we need to replace it EXACTLY. 
# It might be easier to use re.sub for the remaining leftover chunk.
old_tail = r'\} else \{\s*btnMap\.className = \'tab-btn tab-active\';.*?\}, 100\);\s*\}\s*\}'
html = re.sub(old_tail, '}', html, flags=re.DOTALL)

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.write(html)
