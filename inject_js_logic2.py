import json, re

with open('merge_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

s2 = data['s2']
s3 = data['s3']

# Extract global var rawData from s2
m = re.search(r'let rawData = \{.*?};', s2, re.DOTALL)
global_raw_data = m.group(0) if m else 'let dashRawData = {};'
global_raw_data = global_raw_data.replace('let rawData', 'let dashRawData')

# Extract processGASData from s2
m = re.search(r'function processGASData\(gasData\) \{.*', s2, re.DOTALL)
process_func = m.group(0) if m else ''
process_func = re.split(r'fetch\(GAS_URL', process_func)[0].strip()
if not process_func.endswith('}'): process_func += '\n}'
process_func = process_func.replace('rawData.', 'dashRawData.')

# Extract functions from s3
s3_funcs = re.sub(r'window\.addEventListener\(\'DOMContentLoaded\'.*', '', s3, flags=re.DOTALL)
s3_funcs = s3_funcs.replace('rawData.', 'dashRawData.')

combined_scripts = f"\n\n// --- DASHBOARD PORTED CODE ---\n{global_raw_data}\n\n{process_func}\n\n{s3_funcs}\n// --- END DASHBOARD PORTED CODE ---\n"

with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find the LAST </script> tag
idx = html.rfind('</script>')
if idx != -1:
    html = html[:idx] + combined_scripts + html[idx:]

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
print("Injected dashboard JS logic properly.")
