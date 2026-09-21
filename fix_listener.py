with open('index_beta.html', 'r', encoding='utf-8') as f:
    html = f.read()

bad_str = """    document.addEventListener("DOMContentLoaded", () => {
        showLoading();
}"""

html = html.replace(bad_str, "")

with open('index_beta.html', 'w', encoding='utf-8') as f:
    f.write(html)
