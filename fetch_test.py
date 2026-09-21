import urllib.request
import json
url = 'https://script.google.com/macros/s/AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz/exec'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
response = urllib.request.urlopen(req, timeout=30)
data = json.loads(response.read().decode('utf-8'))
print("KEYS:", list(data.keys()))
if '매입부동산' in data:
    print("PROPS ROW 0:", data['매입부동산'][0] if len(data['매입부동산']) > 0 else 'EMPTY')
else:
    print("NO 매입부동산 TAB!")
