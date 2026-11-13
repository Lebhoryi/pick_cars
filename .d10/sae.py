from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1500, "height": 1200})
    api = []
    page.on("response", lambda r: api.append((r.status, r.url)) if any(k in r.url for k in ('api', 'json', 'rank', 'sale')) else None)
    page.goto("https://autolink.sae-china.org/", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(4000)
    txt = page.inner_text("body")
    print("len", len(txt))
    print(txt[:300].replace("\n", " / "))
    print("--- api calls ---")
    for s, u in api[:15]: print(s, u[:120])
    # 分页/搜索
    print("--- 输入框 ---")
    print(page.eval_on_selector_all("input", "els => els.map(e => e.placeholder || e.type)"))
    b.close()
