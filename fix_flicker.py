with open("index_beta.html", "r", encoding="utf-8") as f:
    html = f.read()

import re

# 1. Remove the old savedTab logic from inside processData
old_saved_tab = """            const savedTab = localStorage.getItem('propertyRunnerTab') || 'marathon';
            if (savedTab === 'map' || savedTab === 'properties') {
                switchTab(savedTab);
            }"""
html = html.replace(old_saved_tab, "")

# 2. Add it right inside DOMContentLoaded
old_dom = "window.addEventListener('DOMContentLoaded', fetchAndParseData);"
new_dom = """window.addEventListener('DOMContentLoaded', () => {
            const savedTab = localStorage.getItem('propertyRunnerTab') || 'marathon';
            if (savedTab !== 'marathon') {
                switchTab(savedTab);
            }
            fetchAndParseData();
        });"""
html = html.replace(old_dom, new_dom)

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(html)
