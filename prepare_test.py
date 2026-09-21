import re
with open("dashboard.html", "r", encoding="utf-8") as f:
    html = f.read()
scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
js = scripts[-1]

# mock DOM environment for a tiny check
test_js = """
let document = {
    getElementById: () => ({ parentElement: { innerHTML: '' }, appendChild: () => {}, classList: {add: ()=>{}, remove: ()=>{}, toggle: ()=>{}} }),
    querySelectorAll: () => ([]),
    querySelector: () => ({ classList: {add: ()=>{}, remove: ()=>{}, toggle: ()=>{}} }),
    createElement: () => ({ style: {}, classList: {add: ()=>{}, remove: ()=>{}, toggle: ()=>{}} })
};
let window = {};
let Chart = { defaults: { color: '', font: {} } };
""" + js + """
try {
    initDashboard();
    console.log("initDashboard OK");
    initInvestorTab();
    console.log("initInvestorTab OK");
} catch(e) {
    console.log("Error:", e.message);
}
"""
with open("test.js", "w", encoding="utf-8") as f:
    f.write(test_js)
