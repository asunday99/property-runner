with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

print('track-lines CSS:', '.track-lines {' in html)
print('view-marathon CSS:', '#view-marathon {' in html)
