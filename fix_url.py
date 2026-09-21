import re
with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the wrong GAS URL with the correct one
old_url = 'AKfycby5P264B3eU49w8U8z1z15VvI68s9HhFz_sR3q2m68b5C35ZJqD8T3L0_9c5N5Y9pA'
new_url = 'AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz'

if old_url in html:
    html = html.replace(old_url, new_url)
    with open('index_beta.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('Replaced GAS URL')
else:
    print('Old URL not found')
