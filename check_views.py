import re
with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()
if 'id="view-dashboard"' in html:
    print('view-dashboard exists')
else:
    print('view-dashboard MISSING')
