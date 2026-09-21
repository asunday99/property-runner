import urllib.request
import json
import traceback

url = 'https://script.google.com/macros/s/AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz/exec'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    print("Fetching GAS API...")
    # GAS scripts can take 10-20 seconds to compile and run if cold
    with urllib.request.urlopen(req, timeout=45) as response:
        body = response.read().decode('utf-8')
        data = json.loads(body)
        print("SUCCESS! Keys found in JSON:", list(data.keys()))
        
        for k in data.keys():
            if len(data[k]) > 0:
                print(f"Sample keys in {k} (first row):", list(data[k][0].keys()))
            else:
                print(f"{k} is empty.")
                
except Exception as e:
    print("FAILED TO FETCH OR PARSE.")
    traceback.print_exc()
