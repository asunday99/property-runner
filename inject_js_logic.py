import json, re

with open('merge_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

s2 = data['s2']
s3 = data['s3']

# Extract global var rawData from s2
m = re.search(r'let rawData = \{.*?};', s2, re.DOTALL)
global_raw_data = m.group(0) if m else 'let dashRawData = {};'
global_raw_data = global_raw_data.replace('let rawData', 'let dashRawData') # rename to avoid conflict

# Extract processGASData from s2
m = re.search(r'function processGASData\(gasData\) \{.*', s2, re.DOTALL)
process_func = m.group(0) if m else ''
# Need to remove the closing fetch and listener stuff if any
process_func = re.split(r'fetch\(GAS_URL', process_func)[0]
process_func = process_func.strip()
if process_func.endswith('}'):
    pass # ok
else:
    process_func += '\n}'

# In processGASData, replace `rawData.` with `dashRawData.`
process_func = process_func.replace('rawData.', 'dashRawData.')

# Extract functions from s3
# Remove DOMContentLoaded listener
s3_funcs = re.sub(r'window\.addEventListener\(\'DOMContentLoaded\'.*', '', s3, flags=re.DOTALL)
s3_funcs = s3_funcs.replace('rawData.', 'dashRawData.')

combined_scripts = f"\n\n// --- DASHBOARD PORTED CODE ---\n{global_raw_data}\n\n{process_func}\n\n{s3_funcs}\n// --- END DASHBOARD PORTED CODE ---\n"

with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Insert right before the last </script>
html = html.replace('</script>\n</body>', combined_scripts + '</script>\n</body>')

# In initDataEngine, after window.globalData = ..., call processGASData(rawData) and then init charts
m_init = re.search(r'window\.globalData = \{ props: propSheet, raw: rawData \};', html)
if m_init:
    injection = '''window.globalData = { props: propSheet, raw: rawData };
                  
                  // Initialize Dashboard Tab Logic
                  processGASData(rawData);
                  initInvestorTab();
                  initRentRollTab();'''
    html = html.replace(m_init.group(0), injection)

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Injected dashboard JS logic.")
