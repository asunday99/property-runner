import urllib.request
url = 'https://script.google.com/macros/s/AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz/exec'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    text = response.read().decode('utf-8')
    print('First 10 chars:', text[:10])
