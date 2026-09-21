import urllib.request
import time
import json

url = "https://script.google.com/macros/s/AKfycbxE8HCDDuWzmohzdF5H0fY7TXkPLeO_GyrgBlFI-AtN9WW_B_cuUts7EGF60tT5MN2C/exec"

print("Fetching data...")
start = time.time()
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        end = time.time()
        print(f"Success! Time taken: {end - start:.2f} seconds")
        print("Keys found:", list(data.keys()))
        if "매입부동산" in data:
            print("Property count:", len(data["매입부동산"]))
except Exception as e:
    print("Error:", e)
