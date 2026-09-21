with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()
if 'fetch(GAS_URL)' in html:
    print('DANGER: Fetch logic found!')
else:
    print('SAFE: No GAS fetch logic in index.html.')
    
if 'runner-container' in html:
    print('SAFE: Runner HTML structure is intact.')
else:
    print('DANGER: Runner HTML missing.')
