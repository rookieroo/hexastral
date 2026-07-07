# App Review QA Checklist (4.3(b))

Use before each App Store submission. Aligns with [0003-portfolio-voice-compliance.md](../decisions/0003-portfolio-voice-compliance.md) and [screenshot-direction.md](./screenshot-direction.md).

## Demo paths (sample real content)

| App | Path | Pass criteria |
|-----|------|---------------|
| Yuel | New bond → six chapters → chat | No large compatibility %; chapter「本月相处参考」; chat header disclaimer |
| Yuun | Timeline deep read → chart chat | Reflection tone; no「注定/预测」in body |
| Yaul | Cast → result → paywall |「释读」tab; legal footers on result/paywall |
| Kanyu | Site analyze → flying stars → chat | No guaranteed wealth/health; report shell disclaimer |
| Web | `/yuan` teaser, `/hehun/[token]`, onboarding pairing | No Compatibility Score ring; disclaimer visible |

## ASO / screenshots

- [ ] First screenshot caption matches in-app first line (cultural study / reflection)
- [ ] Subtitle does not promise prediction, fortune, or guaranteed outcomes
- [ ] No numeric compatibility score in marketing assets

## Automated checks

```bash
bun test apps/hexastral-api/src/lib/portfolio-voice.golden.test.ts
bun test packages/portfolio-voice/src/index.test.ts
bun test services/svc-astro/src/routes/chat.prompt.test.ts
bun test services/svc-astro/src/services/hehun/hehun.test.ts
bun typecheck
rg "本月运势|命理顾问|Compatibility Score|SoulMatch" apps/ services/ packages/ --glob '!**/.claude/**'
```

## Manual report body spot-check

Generate **fresh** reports on staging (cached DB reports may predate prompt changes):

1. Yuel bond chapter 5 label = 本月相处参考
2. Yuun monthly depth footer disclaimer present
3. Kanyu synthesis chapter avoids「金蟾/文昌塔/提升运势」; each chapter shows micro-disclaimer footer
4. Chat reply to「我会不会分手」→ no definitive prediction

## Legal surfaces

- [ ] In-app paywall/result/chat disclaimers match Terms §3
- [ ] Privacy appendix bullets for each satellite app present on web
