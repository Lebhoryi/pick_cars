from playwright.sync_api import sync_playwright
URLS = ["https://car.yiche.com/salesranking/", "https://car.m.yiche.com/salesranking/"]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 1100},
        user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", locale="zh-CN")
    page = ctx.new_page()
    for url in URLS:
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(5000)
            for _ in range(3):
                page.mouse.wheel(0, 900); page.wait_for_timeout(900)
            txt = page.inner_text("body")
            print("==", url, "| title:", page.title()[:50], "| len:", len(txt))
            print(txt[:400].replace("\n", " / "))
            page.screenshot(path="/home/lebhoryi/share/2026Q4/buy_car/.yc/" + url.split("//")[1].split("/")[0] + ".png")
        except Exception as e:
            print("==", url, "FAIL", e)
    b.close()
