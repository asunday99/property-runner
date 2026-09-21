with open("index_beta.html", "r", encoding="utf-8") as f:
    js = f.read()

opens = js.count("{")
closes = js.count("}")
print(f"Braces: {opens} open, {closes} close")
