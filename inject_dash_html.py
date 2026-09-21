import re

with open('investor.html', 'r', encoding='utf-8') as f:
    inv_html = f.read()

# Remove the outer div id="tab-investor" to replace it with the inner contents,
# because we will put this inside view-dashboard.
inv_html = re.sub(r'<div id="tab-investor"[^>]*>', '', inv_html, 1)
inv_html = inv_html.strip()
if inv_html.endswith('</div>'):
    inv_html = inv_html[:-6] # remove the last closing div

with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace <div id="view-dashboard">...</div> with the new HTML
new_dash_div = f'<div id="view-dashboard" style="display:none; color:white; padding:20px; overflow-y:auto; flex-grow:1;">\n{inv_html}\n</div>'
html = re.sub(r'<div id="view-dashboard".*?</div>', new_dash_div, html, flags=re.DOTALL)

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Injected dashboard HTML")
