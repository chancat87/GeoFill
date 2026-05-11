# 地址数据源筛选（覆盖插件国家）

更新时间：2026-05-10  
目标：尽量覆盖插件内 19 个国家/地区，优先可下载、可持续更新、许可清晰的数据源。

## 1) 先看全局底座（必须有）

- **OpenAddresses（OA）**：全球地址源聚合，适合做主底座。  
  - 仓库与许可说明（注意每个子源许可证不同）：https://github.com/openaddresses/openaddresses
  - 覆盖参考（该页面是 2021 归档，仅用于筛选方向）：https://results.openaddresses.io/coverage/world/
- **OpenStreetMap 提取（Geofabrik）**：全国家 fallback，日更，便于补空白。  
  - 下载：https://download.geofabrik.de/
  - 许可（ODbL）：https://wiki.openstreetmap.org/wiki/ODbL

## 2) 插件国家覆盖结论（按国家）

| 国家/地区 | 推荐主源（优先） | 备源/补源 | 覆盖可行性 |
|---|---|---|---|
| United States | USDOT NAD（国家地址库）https://www.transportation.gov/NAD | OA + OSM | 高 |
| United Kingdom | OS Open UPRN（GB）https://www.ordnancesurvey.co.uk/products/os-open-uprn | OSM；若要更完整地址字段可考虑商业源 | 中 |
| Canada | StatsCan ODA（开放地址库）https://www.statcan.gc.ca/en/lode/databases/oda | OA + OSM | 高 |
| Australia | G-NAF（国家级）https://data.gov.au/data/dataset/geocoded-national-address-file-g-naf | OA + OSM | 高 |
| China | OSM（Geofabrik） | OA（覆盖不稳定） | 中偏低 |
| Japan | OA（覆盖较好） + Digital Agency Base Registry（先町字，后续扩展）https://www.digital.go.jp/en/policies/base_registry_address | OSM | 中 |
| South Korea | OA + 韩国道路名地址 API（data.go.kr）https://www.data.go.kr/en/data/15059078/openapi.do | OSM | 中高 |
| Germany | OA（覆盖中等） + OSM | 各州开放数据（逐州接入） | 中 |
| France | BAN（官方国家地址库）https://www.data.gouv.fr/datasets/base-adresse-nationale | OA + OSM | 高 |
| Russia | OA（覆盖有限） + OSM | 地方开放源 | 中偏低 |
| Spain | CartoCiudad（国家级）https://datos.gob.es/gl/catalogo/e00125901-spaign-cartociudad-addresses | OA + OSM | 高 |
| Italy | OA（覆盖高） + OSM | 地方开放源 | 中高 |
| Brazil | OA（覆盖高） + CNEFE（IBGE 体系）https://www.ibge.gov.br/estatisticas/sociais/populacao/38734-cadastro-nacional-de-enderecos-para-fins-estatisticos.html | OSM | 中高 |
| India | OSM + data.gov.in（需要逐数据集筛选）https://www.data.gov.in/ | 地方州级开放门户 | 中偏低 |
| Singapore | OA + OneMap（官方）https://geoworks.sla.gov.sg/sla-products/onemap/ | OSM | 中高 |
| Taiwan | OA + 地方门牌数据（例如新北/台北）https://data.gov.tw/dataset/168887 / https://data.gov.tw/dataset/155472 | OSM | 中 |
| Hong Kong | ALS 地址库（可下载 GeoJSON）https://data.gov.hk/en-data/dataset/hk-dpo-als_01-als/resource/a6ef2619-bc11-442f-a511-7b21e5fe9f5c | OSM + CSDI | 高 |
| Mexico | OA（覆盖高） + OSM | 官方地方源按州补充 | 中高 |
| Netherlands | BAG（国家级，PDOK）https://www.pdok.nl/atom-downloadservices/-/article/adress-1 | OA + OSM | 高 |

## 3) 结合 OA 覆盖快照的筛选结果（用于优先级）

说明：以下来自 OA 公开 coverage 归档页（2021 快照，非实时），用于“先做谁”的排序。  
参考：https://results.openaddresses.io/coverage/world/

- **Complete（优先直接用 OA）**：Australia, Brazil, Italy, Mexico, Netherlands, Singapore, Spain
- **Substantial（OA 可用，但建议叠加国家源/OSM）**：Canada, Germany, Japan, Korea, Russia, Taiwan, United States
- **Minimal（OA 不够用，必须叠加国家源）**：France
- **未列出/弱覆盖（以国家源或 OSM 为主）**：United Kingdom, China, India, Hong Kong

## 4) 许可与使用注意（落地前必须做）

- OA：**每个子源许可证不同**，不能一刀切；要在导入时保留 source-level attribution。  
  参考：https://github.com/openaddresses/openaddresses
- OSM：ODbL，派生数据库分发要注意 share-alike 义务。  
  参考：https://wiki.openstreetmap.org/wiki/ODbL
- G-NAF：有额外使用条款（尤其是用于寄递场景前需二次核验）。  
  参考：data.gov.au 对 G-NAF 说明页
- NAD（US）：开放但不保证全州同等完整度，不建议直接用于 mailing list 目的。  
  参考：USDOT NAD 页面及 disclaimer

## 5) 建议执行顺序（最快见效）

1. **P0（先做）**：US, CA, AU, FR, NL, ES, HK（都有强国家级源）  
2. **P1（第二批）**：MX, BR, IT, DE, JP, KR, SG, TW（OA+国家/地方源组合）  
3. **P2（最后攻坚）**：UK, CN, IN, RU（全国统一高质量开放源较弱，主要靠 OSM + 地方增量）

