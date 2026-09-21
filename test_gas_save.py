import urllib.request
import json

url = 'https://script.google.com/macros/s/AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz/exec'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=45) as response:
    body = response.read().decode('utf-8')
    data = json.loads(body)
    
    with open('gas_keys.txt', 'w', encoding='utf-8') as f:
        f.write("TABS:\n")
        f.write(", ".join(data.keys()) + "\n\n")
        
        for k in data.keys():
            if '부동산' in k or 'Rent' in k:
                f.write(f"KEYS for {k}:\n")
                if len(data[k]) > 0:
                    f.write(", ".join(data[k][0].keys()) + "\n\n")
