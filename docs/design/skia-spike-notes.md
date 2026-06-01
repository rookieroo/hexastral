# Skia Spike · RN 端墨渲染可行性验证

> 目的：在真机上验证 `@shopify/react-native-skia` + Reanimated 4 能不能把 HTML POC
> 那套**水墨/月相阴影/墨晕粒子**复刻到 60fps；这是 8 App motion 系统是否走 Skia
> 路线、还是退回 **预烘焙序列帧 (Lottie/Rive)** 的**分水岭**。
>
> Spike 路径：`apps/fate-app/app/spike/skia-moon.tsx`。
> 包：已加 `@shopify/react-native-skia@2.2.12` 到 `apps/fate-app/package.json`。

---

## 1. 跑法

```bash
cd /Users/chris/Desktop/code/web/hexastral
bun install                          # 安装 skia（首次必要）
cd apps/fate-app
bun dev                              # Expo dev (--dev-client)
# 用 dev client 扫码或在模拟器打开,导航到 /spike/skia-moon
```

如果之前没用过 dev-client / 没装 native module，第一次需要 `bun prebuild && bun ios`（或 `bun android`）出一个新原生 build。

**真机别用 Expo Go**——Skia 是 native module，必须 dev-client / 自定义 build。

---

## 2. 通过标准（合格 / 不合格）

| 项 | 合格 | 不合格 → 行动 |
|---|---|---|
| **FPS** | 屏内 FPS 计数 ≥ **58** 持续 30s | <50 → 降一档:降位移精度 / 降 noise 频次 / 上预烘焙序列帧 |
| **明暗界形态** | 终止线**有机不规则**(非干净弧),近 HTML POC | 干净弧 → SkSL 没生效,查 inkEffect 编译 |
| **运动连续** | 阴影盘 cx 平滑扫,新月→满月→新月,无跳帧 | 卡顿 → useSharedValue / useDerivedValue 没在 UI 线程上 |
| **观感** | 接近 `motion-poc-fate-flow.html` loading 那颗月 | 差太多 → 调 noise 频率/位移幅度参数,逐步逼近 |

---

## 3. HTML → Skia 原语映射（核心）

| HTML POC（SVG） | RN Skia 等价 | 备注 |
|---|---|---|
| `<circle fill="…">` + `<radialGradient>` | `<Circle>` + `<RadialGradient>` | 1:1，同概念 |
| `<feTurbulence>` + `<feDisplacementMap>` | **SkSL `RuntimeEffect`**（自写 fragment shader）| 见 spike 里 `inkDisplacementSkSL` —— 这是关键。`feTurbulence` 在 Skia 有 `Skia.Shader.MakeTurbulence` 但更死板；自写 noise+displace 才能 1:1 复刻 3 频次链 |
| 描线 `stroke-dasharray/dashoffset` | `<Path strokeWidth strokeCap>` + `withTiming` 动 `start/end` 段 | 简单 |
| `<mask>` 揭示圆 | `<Group clip={...}>` 或 `<Mask>` | Skia `Mask` 组件 |
| 朱印盖戳 (CSS keyframes + transform) | Reanimated `withSequence` 控 transform | 1:1 |
| FLIP shared element | reanimated 4 `measure()` + `withTiming` 自手；或 `react-native-shared-element` | 见 Spike 2 |
| 月相 cx 动 | `useSharedValue` + `useDerivedValue` → Skia `Circle cx={derived}` | Skia 接受 SharedValue 作 prop |
| 触觉 | `expo-haptics` `impactAsync` | 不变 |

**关键洞察**：HTML 的 SVG filter chain 在 RN 没有直接对等物——`feDisplacementMap` 在 Skia 必须用 **SkSL RuntimeEffect** 自己写。Spike 里那个 ~30 行 SkSL 就是这套墨渲染的"心脏"。如果它通过 → 整套 motion 都能走 Skia；如果挂了 → 退预烘焙。

---

## 4. 不通过的退路（预烘焙 / Lottie / Rive）

如果 FPS 撑不住 60，或在低端机上挂掉，**整套 motion 的几何/节奏不动，只换实现路径**：

1. **月相 loader** → 预渲染 ~30 帧月相相位(0→1)的 PNG sequence(或 Lottie),`<Image>` 切帧。
2. **墨晕转场** → 预渲染 ~24 帧墨晕扩散动画(Lottie/Rive),触发点附近 overlay。
3. **盖印** → 预渲染石章降+冲击+抬起(~20 帧 Rive)。
4. **静态墨纹**（grain / 印章边缘）→ 烘焙成静态 PNG/SVG texture,做 `<Image>` 叠 blend。

**几何与节奏定数照旧**(SWEEP=180、dur=2400ms 等)；Lottie/Rive 工程师按规格出文件。

---

## 5. Spike 2 — FLIP 共享元素 · **已写**

文件：`apps/fate-app/app/spike/flip-magic.tsx`。**不依赖 Skia**，可以与 Spike 1 并行验证。

技法：
- `useAnimatedRef<View>()` 两个(splash logo / hero moon)。
- 触发时 `runOnUI` 里 `measure(ref)` 拿两个 `pageX/pageY/width`(UI 线程,真坐标)。
- 算 `dx / dy / scale = b.width/a.width`,跑 `withTiming(...,{duration:580,easing:cubic-bezier(.4,0,.2,1)})`。
- **干净交接**:到点(`DUR-16ms`) 瞬露真月、(`DUR+40ms`) 撤飞行体。**无淡出重叠** = 无抖。
- bg 同步 paper→dark crossfade，hero 文案 rise。

**通过标准**:
| 项 | 合格 |
|---|---|
| 翻译/缩放 | 平滑、易感速度对、落到 Hero 月位 |
| 落位 | 无闪、无双月叠 |
| FPS | ≥ 58 |
| 不依赖额外库 | ✅ 不需要 `react-native-shared-element` |

**跑法**:同 Spike 1 同一 dev-client,导航 `/spike/flip-magic`。屏内有 ▶ magic move / ↩ reset 两个按钮 + FPS。

通过 → `core-ui/motion/<MagicMoveLogo/>` 用同样的 measure + reanimated 方案;**不**装 `react-native-shared-element`。
不通过(measure 在跨屏返 null) → 改用 `react-native-shared-element` 库,或换 `onLayout` 测量缓存 layout(慢一拍但稳)。

---

## 6. Spike 通过 → 接下来做什么

1. **`packages/hexastral-tokens`** 落 motion 数值（easing/duration/SWEEP）+ 纸/墨/朱色。
2. **`packages/core-ui/src/motion/`** 起组件（HTML 里手感锁好的那 5 件套）:
   - `<MoonPhaseLoader/>`（先用 Spike 验过的 Skia 实现，否则切预烘焙）
   - `<InkWipeTransition/>`
   - `<SealStamp/>`
   - `<MagicMoveLogo/>`（Spike 2 通过后）
   - `<UnsealReveal/>`（蜡封）
3. **`@zhop/astro-core`** 出真实 BaZi/紫微数据 → `<DrawOnChart/>` / 章目录消费。
4. 每个 app 通过 props 注入**母题/印/文案**，复用相同结构 + 手感。

---

## 7. 已知 / 待验证的不确定项

- **`<Shader source={inkEffect}>` 嵌 `<RadialGradient>` 作 `uniform shader src`** —— Skia React API 这种 paint 组合在 v2 应可用，若不可用则改为 imperative `Skia.Shader.MakeRuntimeEffect` + `.makeShaderWithChildren(...)` 后赋给 `paint`。Spike 里采用了 declarative 写法，如果跑不起来切 imperative。
- **`useFrameCallback` + `globalThis._setFps`** 是个 spike-only 桥接（worklet → JS state）。生产用 `runOnJS`。
- **设备建议**：iPhone 12 / Pixel 5 / 同档安卓，开 perf monitor（Expo dev menu → Performance Monitor）双确认。
