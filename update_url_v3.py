with open("index_beta.html", "r", encoding="utf-8") as f:
    html = f.read()

import re
old_url = re.search(r'const GAS_URL = "(.*?)";', html).group(1)
new_url = "https://script.google.com/macros/s/AKfycbxirG8wxYgpi2CPKZwcVeTuoAH--Nk_-DRaCqex7Jpm_fHOWGQ5LIMV_lUuGV5pWydg/exec"

html = html.replace(old_url, new_url)

with open("index_beta.html", "w", encoding="utf-8") as f:
    f.write(html)
print("URL updated successfully.")
