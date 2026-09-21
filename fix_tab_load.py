with open("index_beta.html", "r", encoding="utf-8") as f:
    html = f.read()

old_code = """            const savedTab = localStorage.getItem('propertyRunnerTab') || 'marathon';
            if (savedTab === 'map') {
                switchTab('map');
            }"""

new_code = """            const savedTab = localStorage.getItem('propertyRunnerTab') || 'marathon';
            if (savedTab === 'map' || savedTab === 'properties') {
                switchTab(savedTab);
            }"""

html = html.replace(old_code, new_code)

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Updated successfully")
