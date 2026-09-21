import urllib.request
import gzip
import json

url = 'https://script.google.com/macros/s/AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz/exec'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'gzip'})
try:
    with urllib.request.urlopen(req, timeout=45) as response:
        body = response.read()
        if response.info().get('Content-Encoding') == 'gzip':
            body = gzip.decompress(body)
        with open('full_data.json', 'wb') as f:
            f.write(body)
        print("Saved to full_data.json")
except Exception as e:
    print(e)
