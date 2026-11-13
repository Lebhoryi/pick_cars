import json, glob, subprocess, time, os
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"
# 1) 从 10 月数据里拿 8 款车的 series_id
rows = []
for f in sorted(glob.glob('.d10/oct_*.json')):
    rows.extend(json.load(open(f, encoding='utf-8')).get('data') or [])
want = {'海狮06', 'MG 07', 'ID.AURA T6', '零跑C10', '长安启源Q06', '极狐 阿尔法T7', '零跑C11', '深蓝S07'}
ids = {r['series_name']: r['series_id'] for r in rows if r['series_name'] in want}
print('series_id:', json.dumps(ids, ensure_ascii=False))

# 2) 抓 1-9 月（10 月已有）
out = {}
for month in range(1, 10):
    got = {}
    for page in range(1, 8):
        path = f'.d10/m{month:02d}_p{page}.json'
        if not os.path.exists(path):
            url = f"https://autolink.sae-china.org/api/rankings/series?year=2026&month={month}&sale_type=retail&page={page}&page_size=100"
            subprocess.run(['curl', '-sL', '-A', UA, '--max-time', '30', url, '-o', path], check=True)
            time.sleep(0.8)
        data = json.load(open(path, encoding='utf-8')).get('data') or []
        for r in data:
            if r['series_id'] in ids.values():
                got[r['series_name']] = {'retail': r['retail_sales'], 'wholesale': r['wholesale_sales']}
        if len(data) < 100:
            break
    out[f'2026-{month:02d}'] = got
    print(f'2026-{month:02d}', json.dumps(got, ensure_ascii=False))
json.dump(out, open('.d10/history.json', 'w'), ensure_ascii=False, indent=1)
