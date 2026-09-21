with open("index_beta.html", "r", encoding="utf-8") as f:
    html = f.read()

old_url = "https://script.google.com/macros/s/AKfycbxTwh1RscCE9FDajFBXMbdaR-RiFHxrgy2jg1Mgry7qH3xnnVqH2tbtWjZIKQ58aExz/exec"
new_url = "https://script.google.com/macros/s/AKfycbxE8HCDDuWzmohzdF5H0fY7TXkPLeO_GyrgBlFI-AtN9WW_B_cuUts7EGF60tT5MN2C/exec"

html = html.replace(old_url, new_url)

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(html)
print("URL updated")
