import re

with open('index_beta.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Drawer with Admin Buttons
admin_section = '''
        <div class="drawer-divider"></div>
        <div class="drawer-section">
            <h3 class="drawer-section-title">💻 실무 관리</h3>
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
                <button onclick="switchTab('rentroll')" style="background:#1f2937; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold; font-size:16px; cursor:pointer; text-align:left;">📁 임대관리 (RentRoll)</button>
                <button onclick="switchTab('debt')" style="background:#1f2937; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold; font-size:16px; cursor:pointer; text-align:left;">💳 부채관리</button>
            </div>
        </div>
'''
content = content.replace('<div class="drawer-divider"></div>\n  \n          <div class="drawer-section">\n              <h3 class="drawer-section-title">러너 뷰</h3>', admin_section + '\n          <div class="drawer-divider"></div>\n          <div class="drawer-section">\n              <h3 class="drawer-section-title">러너 뷰</h3>')

# If the replace above failed due to encoding/spacing, let's use a safer regex or target
