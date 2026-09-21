import urllib.request
import gzip
import json

url = 'https://script.google.com/macros/s/AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz/exec'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'gzip, deflate'})
with urllib.request.urlopen(req, timeout=30) as response:
    if response.info().get('Content-Encoding') == 'gzip':
        body = gzip.decompress(response.read()).decode('utf-8')
    else:
        body = response.read().decode('utf-8')
    
    data = json.loads(body)
    with open('gas_keys_gzip.txt', 'w', encoding='utf-8') as f:
        f.write("TABS:\n")
        f.write(", ".join(data.keys()) + "\n\n")
        
        for k in data.keys():
            if '부동산' in k or 'Rent' in k:
                f.write(f"KEYS for {k}:\n")
                if len(data[k]) > 0:
                    f.write(", ".join(data[k][0].keys()) + "\n\n")
