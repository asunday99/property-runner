with open('dashboard.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the fetch URL to include cache-busting
html = html.replace('fetch(GAS_URL)', 'fetch(GAS_URL + "?t=" + new Date().getTime())')

with open('dashboard.html', 'w', encoding='utf-8') as f:
    f.write(html)
