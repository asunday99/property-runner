with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()
import re
print(re.findall(r'<div id="view-[a-z]+"', html))
