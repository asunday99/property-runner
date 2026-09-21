with open("dashboard.html", "r", encoding="utf-8") as f:
    out = []
    for i, line in enumerate(f):
        if 255 <= i <= 265:
            out.append(f"{i}: {line.strip()}")
with open("lines.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
