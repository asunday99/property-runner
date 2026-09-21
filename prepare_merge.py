import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    dash_html = f.read()

# Extract dashboard HTML sections
m_inv = re.search(r'<!-- 2. INVESTOR TAB -->(.*?)<!-- 3. RENTROLL TAB -->', dash_html, re.DOTALL)
m_rent = re.search(r'<!-- 3. RENTROLL TAB -->(.*?)</div>\s*<!-- 모달 팝업 -->', dash_html, re.DOTALL)
m_modal = re.search(r'<!-- 모달 팝업 -->(.*?)<script>', dash_html, re.DOTALL)

inv_html = m_inv.group(1).replace('id="tab-investor"', 'id="view-dashboard" style="display:none; overflow-y:auto; flex-grow:1; color:white; padding:20px;"').replace('tab-content', '')
rent_html = m_rent.group(1).replace('id="tab-rentroll"', 'id="view-rentroll" style="display:none; overflow-y:auto; flex-grow:1; color:white; padding:20px;"').replace('tab-content', '')
modal_html = m_modal.group(1)

# Extract scripts
scripts = re.findall(r'<script.*?>(.*?)</script>', dash_html, re.DOTALL)
script2 = scripts[2]
script3 = scripts[3]

with open('merge_data.json', 'w', encoding='utf-8') as f:
    import json
    json.dump({
        'inv': inv_html,
        'rent': rent_html,
        'modal': modal_html,
        's2': script2,
        's3': script3
    }, f)
print("Extracted components successfully.")
