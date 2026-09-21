from bs4 import BeautifulSoup

with open('index_beta.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

# 1. Remove left drawer admin buttons
drawer_content = soup.find('div', class_='drawer-content')
if drawer_content:
    admin_sections = drawer_content.find_all('div', class_='drawer-section')
    for sec in admin_sections:
        title = sec.find('h3')
        if title and '실무 관리' in title.text:
            sec.decompose()
            break
            
# Clean up duplicate dividers
dividers = drawer_content.find_all('div', class_='drawer-divider')
if len(dividers) > 2:
    dividers[0].decompose()

# 2. Add Top Right Gear Icon (Option B)
header_right = soup.find('div', class_='header-top-right')
if header_right:
    # Remove the map toggle from header_right if it's there (user didn't ask to move it, but it's part of the right header)
    
    # We add a container for the gear dropdown
    gear_html = '''
    <div id="admin-menu-container" style="position: relative;">
        <div onclick="document.getElementById('admin-dropdown').style.display = document.getElementById('admin-dropdown').style.display === 'block' ? 'none' : 'block';" style="cursor:pointer; font-size:20px; padding:4px;">⚙️</div>
        <div id="admin-dropdown" style="display:none; position:absolute; right:0; top:36px; background:#1f2937; border-radius:8px; padding:8px; width:150px; box-shadow:0 4px 6px rgba(0,0,0,0.3); z-index:9999;">
            <button onclick="switchTab('rentroll'); document.getElementById('admin-dropdown').style.display='none';" style="width:100%; padding:10px; background:transparent; border:none; color:white; text-align:left; font-weight:bold; cursor:pointer;">📁 임대관리</button>
            <div style="height:1px; background:#374151; margin:4px 0;"></div>
            <button onclick="switchTab('debt'); document.getElementById('admin-dropdown').style.display='none';" style="width:100%; padding:10px; background:transparent; border:none; color:white; text-align:left; font-weight:bold; cursor:pointer;">💳 부채관리</button>
        </div>
    </div>
    '''
    header_right.append(BeautifulSoup(gear_html, 'html.parser'))

with open('index_beta_modified2.html', 'w', encoding='utf-8') as f:
    f.write(str(soup))
