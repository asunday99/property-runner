import urllib.request
import time
import json

url = "https://script.google.com/macros/s/AKfycbxirG8wxYgpi2CPKZwcVeTuoAH--Nk_-DRaCqex7Jpm_fHOWGQ5LIMV_lUuGV5pWydg/exec"

start = time.time()
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        end = time.time()
        print(f"Time taken: {end - start:.2f} seconds")
        print("Keys:", list(data.keys()))
except Exception as e:
    print("Error:", e)
