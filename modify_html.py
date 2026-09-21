from bs4 import BeautifulSoup

with open('index_beta.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

# 1. Add admin buttons to the drawer
drawer_content = soup.find('div', class_='drawer-content')
if drawer_content:
    admin_html = '''
    <div class="drawer-section">
        <h3 class="drawer-section-title">💻 실무 관리</h3>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
            <button onclick="switchTab('rentroll')" style="background:#1f2937; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold; font-size:16px; cursor:pointer; text-align:left;">📁 임대관리 (RentRoll)</button>
            <button onclick="switchTab('debt')" style="background:#1f2937; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold; font-size:16px; cursor:pointer; text-align:left;">💳 부채관리</button>
        </div>
    </div>
    <div class="drawer-divider"></div>
    '''
    first_divider = drawer_content.find('div', class_='drawer-divider')
    if first_divider:
        new_soup = BeautifulSoup(admin_html, 'html.parser')
        first_divider.insert_before(new_soup)

# 2. Modify tabs
tabs_container = soup.find('div', class_='tabs-container')
if tabs_container:
    tabs_html = '''
    <button id="btn-dashboard" class="tab-btn tab-inactive" onclick="switchTab('dashboard')">📊 대시보드</button>
    <button id="btn-properties" class="tab-btn tab-inactive" onclick="switchTab('properties')">🏢 매입부동산</button>
    <button id="btn-marathon" class="tab-btn tab-active" onclick="switchTab('marathon')">🏃 러너 뷰</button>
    '''
    tabs_container.clear()
    tabs_container.append(BeautifulSoup(tabs_html, 'html.parser'))

# 3. Add view containers
app_container = soup.find('div', id='app-container')
if app_container:
    views_html = '''
    <div id="view-dashboard" style="display:none; color:white; padding:20px; overflow-y:auto; flex-grow:1;">대시보드 화면 (데이터 연결 중...)</div>
    <div id="view-properties" style="display:none; color:white; padding:20px; overflow-y:auto; flex-grow:1;">매입부동산 화면 (데이터 연결 중...)</div>
    <div id="view-rentroll" style="display:none; color:white; padding:20px; overflow-y:auto; flex-grow:1;">임대관리 화면 (데이터 연결 중...)</div>
    <div id="view-debt" style="display:none; color:white; padding:20px; overflow-y:auto; flex-grow:1;">부채관리 화면 (데이터 연결 중...)</div>
    '''
    # Append right before the end of app-container
    app_container.append(BeautifulSoup(views_html, 'html.parser'))

# 4. Map Toggle button
header_right = soup.find('div', class_='header-top-right')
if header_right:
    map_toggle_html = '''
    <button id="toggle-map-btn" onclick="toggleMapMode()" style="background:#2563eb; color:white; border:none; padding:6px 12px; border-radius:16px; font-weight:bold; font-size:12px; cursor:pointer;">🗺️ 지도 뷰</button>
    '''
    header_right.insert(0, BeautifulSoup(map_toggle_html, 'html.parser'))

with open('index_beta_modified.html', 'w', encoding='utf-8') as f:
    f.write(str(soup))
