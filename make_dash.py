import re

with open("prosam_demo.html", "r", encoding="utf-8") as f:
    demo = f.read()

# Remove the nav
nav_match = re.search(r'<div class="flex border-b border-slate-700 mb-6 overflow-x-auto whitespace-nowrap custom-scrollbar">.*?</div>', demo, re.DOTALL)
if nav_match:
    demo = demo.replace(nav_match.group(0), "")

# Remove investor and rentroll tabs
def remove_div(html, div_id):
    idx = html.find(f'<div id="{div_id}"')
    if idx == -1: return html
    open_divs = 0
    end_idx = -1
    for i in range(idx, len(html)):
        if html[i:i+4] == '<div': open_divs += 1
        elif html[i:i+5] == '</div':
            open_divs -= 1
            if open_divs == 0:
                end_idx = i + 6
                break
    return html[:idx] + html[end_idx:]

demo = remove_div(demo, "tab-investor")
demo = remove_div(demo, "tab-rentroll")

# Fix JS
scripts = re.findall(r'<script.*?>\s*(.*?)</script>', demo, re.DOTALL)
js1 = [s for s in scripts if len(s) > 1000][1]

new_js1 = js1
new_js1 = re.sub(r'window\.onload = \(\) => switchTab.*?;\n', 'window.onload = () => { initFilters(); updateDashboard(); };\n', new_js1)
new_js1 = re.sub(r'updateInvestorTab\(\);', '', new_js1)
new_js1 = re.sub(r'updateRentRollTab\(\);', '', new_js1)

# Make sure tab-dashboard is visible
demo = demo.replace('id="tab-dashboard" class="tab-content"', 'id="tab-dashboard"')

demo = demo.replace(js1, new_js1)

with open("dashboard_only.html", "w", encoding="utf-8") as f:
    f.write(demo)
print("dashboard_only.html created.")
