import re
with open('dashboard.html', 'r', encoding='utf-8') as f:
    html = f.read()

# find processGASData function body
m = re.search(r'function processGASData\(gasData\) \{(.*?)\s*\} // end processGASData', html, re.DOTALL)
if not m:
    m = re.search(r'function processGASData\(gasData\) \{.*', html, re.DOTALL)

if m:
    with open('processGASData_dump.js', 'w', encoding='utf-8') as sf:
        sf.write(m.group(0)[:3000]) # just the first 3000 chars to see variables
    print("Dumped processGASData_dump.js")
