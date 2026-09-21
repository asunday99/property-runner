with open("test_beta.js", "r", encoding="utf-8") as f:
    js = f.read()

opens = js.count("{")
closes = js.count("}")
print(f"Braces: {opens} open, {closes} close")

import re
# Check for any obvious syntax errors around the injected areas
idx = js.find("initDemoDashboard")
print(js[max(0, idx-100):idx+200])
