with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

if '<div id="view-marathon"' in html:
    print('view-marathon exists')
else:
    print('view-marathon MISSING')

if 'function switchTab' in html:
    print('switchTab exists')
