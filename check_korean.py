with open("dashboard.html", "r", encoding="utf-8") as f:
    out = []
    for i, line in enumerate(f):
        if "매입부동산" in line or "투자자" in line:
            out.append(f"{i}: {line.strip()}")
with open("korean_lines.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
