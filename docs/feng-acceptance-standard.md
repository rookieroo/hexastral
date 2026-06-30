# Feng — 风水报告验收标准 (deterministic layer)

The rubric for judging the **deterministic** layer of a Feng report (D1-D4 —
everything except the VLM prose). This is the in-house "风水师 ruler": the engine
is accepted as 专业-grade when every report passes these invariants. No external
expert gate (decision 2026-06-30); correctness rests on the sourced 沈氏 algorithms
+ golden tests + this checklist run against `scripts/feng-sample-report.ts`.

Run: `cd packages/astro-core && bun scripts/feng-sample-report.ts`

## Lineage (locked)
玄空 = 沈氏玄空; 八宅 = 八宅明镜大游年; 替卦 = 沈氏起星; 七星打劫/城门诀 = 沈氏
operational (conservative). Any reading that contradicts 沈氏 is a defect.

## Section invariants (must hold on every report)

### 坐向 / 元运
- 坐 = 向 + 180°; both map to the correct 24山 + 卦宫.
- 建运 from buildYear, 现运 from asOf (立春 boundary). 旺衰 judged by **现运**;
  格局 (旺山旺向 等) judged by **建运**. (Mixing these is a defect.)
- 兼向 (±2.5° of a 山 boundary) → 排盘=替卦; else 下卦. Stated explicitly.

### 山盘 / 向盘 (玄空)
- 运盘 = 建运入中顺飞. 山盘 center = 运盘[坐宫], 向盘 center = 运盘[向宫];
  顺逆 by the 元龙-proxy 阴阳 rule. (Golden: 八运子山午向 = 双星会向, 山向皆8到离.)
- 替卦: center = 替星(proxy), same 顺逆 as 下卦; 5黄无替 ("用替不能替").

### 格局 (建运)
- At most one of {旺山旺向, 上山下水}; 双星会向/会坐 mutually exclusive sides.
- 合十 / 父母三般卦(147/258/369) / 连珠三般卦 / 全盘反伏吟 — set-exact.
- **七星打劫**: only when 当旺向星到向首 AND 向首组(离震乾真 / 坎巽兑假)向盘成三般 AND
  not 反伏吟. (Validated: 八运子山午向 → 离宫真打劫.) Never on a 平局.
- **城门诀**: only the two 向首-flanking 宫; 合河图(1-6/2-7/3-8/4-9)=正, 余=副;
  surfaced only when 当令旺星到该宫. (Validated: 离向 → 巽(正)/坤 城门.)

### 旺衰 (现运)
- 当令=现运; 生气=现运+1/+2; 退气=现运−1; 五黄恒煞(非当令时); else 死气.
- 5运的5=当令 (not 煞).

### 双星组合断事
- Reading by the SORTED pair, 沈氏 corpus. **Phase rule**: benefic combos read
  旺 on 当令 OR 生气; **煞组合 (域含 灾/病/是非/盗) read 旺 ONLY on true 当令** —
  e.g. 二五交加 must read 衰·大凶 in 9运 (2 is 生气 but 5黄 keeps it malefic);
  七九合辙 reads 旺 in 9运 (9 当令). A 二五/五黄 reading "旺/田产暂旺" outside its
  own 运 is a DEFECT.

### 八宅
- 命卦 from 立春-year + gender (男 11−root, 女 root+4, 5→坤/艮). 宅卦 = 坐宫.
- 宅命合参: 同组(东四×东四 / 西四×西四)=相配, else 不配.
- placement: 门=生气, 床头=天医, 灶=坐凶(绝命)向吉(天医), 书桌=生气 — all from 命卦.

### 形理整合 (山管人丁水管财)
- 当旺山星方: 见山=旺丁 / 见水=损丁. 当旺向星方: 见水=旺财 / 见山=破财.
- 失令二五黄方见水/形煞=动凶; 衰向星见水=破财; 形煞=化煞.
- 零正: 正神(当运卦位)宜山, 零神(合十对宫)宜水; 反则示警.
- 格局救应: 上山下水+后水前山=救; 旺山旺向+坐山向水=真旺.

### 月紫白
- 三元月白诀: 子午卯酉年正月8 / 辰戌丑未年正月5 / 寅申巳亥年正月2; 逐月递减, 顺飞.

## Red flags (auto-fail — fix before ship)
1. 旺衰 judged by 建运 instead of 现运 (or vice-versa for 格局).
2. 煞组合 (二五/五黄/紫黄/斗牛/交剑/穿心) reading auspicious when not 当令.
3. 七星打劫/城门诀 on a chart that doesn't meet the strict conditions.
4. 替卦 used outside 兼向, or 下卦 inside it.
5. form-li verdict contradicting 山管人丁水管财 (e.g. 旺向星见水 → 破财).
6. 八宅 placement pointing a 吉位 item at a 凶方.
7. Any 5黄 shown as 旺 outside 5运.

## Self-validation log
- 2026-06-30: ran the 5-scenario harness. Caught + fixed: 二五交加 mis-reading 旺
  in 9运 (phase rule tightened to 当令-only for 煞组合). Confirmed 七星打劫 fires on
  八运子山午向 (真打劫); 全盘反吟 on 九运子山午向 山盘; 替卦 on 兼向 172.6°. PASS.
