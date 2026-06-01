# Page Builder Architecture (Simplified)

## 核心理念

**问题**：用户不需要了解技术层级（L0, L1, L2...），这增加了认知负担。

**解决方案**：按**业务场景**分类组件，只有两种使用方式：

1. **AI 对话生成** - 用户描述需求，AI 自动组合组件
2. **手动拖拽编辑** - 用户从 Blocks 面板选择预设组件

---

## 两种使用场景

### 1. AI 驱动场景（AI Tab）

**用户体验**：

- 输入："我要一个产品页面，包含 Hero 图、特性介绍和价格表"
- AI 自动选择合适的组件并生成 JSON
- 用户可以在 Fields 面板微调细节

**AI 的选择策略**：

- 标准需求 → 使用 Commerce/Marketing 预设组件
- 定制需求 → 使用 Layout 容器 + Components 原子组件组合
- 极端定制 → AI 可以通过 `className` 注入自定义样式

**关键：AI 不需要知道"层级"，只需知道"场景"**

### 2. 手动拖拽场景（Blocks Tab）

**用户体验**：

- 从分类清晰的 Blocks 面板拖拽组件
- 在 Fields 面板编辑组件属性
- 在 Outline 面板调整页面结构

**组件分类**（按业务场景）：

- **🛒 Commerce** - 电商相关（Hero, ProductCard, ProductGrid, FeatureGrid）
- **📣 Marketing** - 营销活动（AnnouncementBar, PromoBanner, Countdown, Newsletter）
- **⭐ Social Proof** - 社会证明（TestimonialCarousel, SocialProof）
- **📦 Layout** - 布局容器（Section, Container, FlexBox）
- **🧩 Components** - 基础组件（Heading, Text, Button, Image）
- **🎨 Shadcn UI** - 标准 UI 组件（Accordion, Tabs, Modal...）

---

## 组件设计原则

### 所有组件都支持 `className` 扩展

**为什么？**

- AI 可以通过 Tailwind 类名实现定制化
- 用户可以手动添加自定义样式
- 无需等待系统更新组件库

**示例**：

```tsx
<Hero
  title="Welcome"
  className="bg-gradient-to-r from-blue-500 to-purple-600"
/>
```

### Props over Children

**为什么？**

- AI 更容易生成 JSON 格式的 Props
- Puck 编辑器原生支持字段编辑

**对比**：

```tsx
// ❌ 难以编辑
<Accordion>
  <AccordionItem title="Q1">...</AccordionItem>
</Accordion>

// ✅ 易于编辑
<Accordion items={[
  { title: "Q1", content: "..." }
]} />
```

### 嵌套容器支持 DropZone

**为什么？**

- 用户可以自由组合布局
- AI 可以规划复杂的页面结构

**示例**：

```tsx
<Section padding="lg" background="muted">
  <Container direction="row" gap={24}>
    <Heading text="Title" />
    <Button label="CTA" />
  </Container>
</Section>
```

---

## 四个核心 Tab

### 1. AI Tab

- 对话式生成页面
- AI 自动选择组件并组合
- 生成完整的 JSON 配置

### 2. Fields Tab

- 编辑选中组件的属性
- 支持文本、选择、数组等字段类型
- 实时预览

### 3. Blocks Tab

- 按业务场景分类的组件库
- 拖拽到画布添加组件
- 清晰的分类和图标

### 4. Outline Tab

- 树形结构显示页面层级
- 快速定位和选择组件
- 拖拽调整顺序

---

## AI System Prompt 建议

````markdown
你是一个页面构建助手，可以使用以下组件：

**Commerce (电商)**

- Hero: 首屏大图
- ProductCard: 产品卡片
- ProductGrid: 产品网格
- FeatureGrid: 特性展示

**Marketing (营销)**

- AnnouncementBar: 公告栏
- PromoBanner: 促销横幅
- Countdown: 倒计时
- Newsletter: 订阅表单

**Layout (布局)**

- Section: 全宽区域容器
- Container: Flex 布局容器（支持嵌套）

**Components (基础)**

- Heading, Text, Button, Image

**设计策略**：

1. 优先使用 Commerce/Marketing 预设组件（开箱即用）
2. 需要定制布局时，用 Layout 容器 + Components 组合
3. 善用 `className` 注入 Tailwind 实现个性化
4. 不要解释技术层级，直接生成 JSON

**示例**：
用户："我要一个产品页面"
你生成：

```json
{
  "content": [
    { "type": "Hero", "props": { "title": "...", "subtitle": "..." } },
    { "type": "FeatureGrid", "props": { "features": [...] } },
    { "type": "ProductGrid", "props": { "collectionId": "..." } }
  ]
}
```
````

````

---

## 对比：旧架构 vs 新架构

| 旧架构（5 层） | 新架构（场景驱动） |
|---|---|
| L0: Raw Layer | ❌ 移除（AI 通过 className 实现） |
| L1: Atomic Layer | ✅ 合并到 Components 分类 |
| L2: Layout Layer | ✅ 独立 Layout 分类 |
| L3: Composite Layer | ✅ 合并到 Shadcn UI 分类 |
| L4: Block Layer | ✅ 拆分为 Commerce/Marketing 分类 |

**简化效果**：
- 用户不需要理解"层级"概念
- 分类名称直接对应业务场景
- AI Prompt 更简洁易懂

---

## 代码位置

- **配置文件**: `apps/web/lib/puck/config.tsx`
- **Commerce 组件**: `packages/ui/src/commerce/`
- **AI Native 组件**: `packages/ui/src/components/ai-native/`
- **Shadcn 组件**: `packages/ui/src/components/`
- **Blocks**: `packages/ui/src/blocks/`

---

## 总结

**新架构的优势**：
- ✅ 商户心智负担低（按业务场景分类，不是技术层级）
- ✅ AI 易于理解（直接对应业务需求）
- ✅ 保持灵活性（`className` 扩展 + 嵌套容器）
- ✅ 开箱即用（预设组件覆盖常见场景）

**两种使用方式平衡**：
- 快速搭建 → 用 Commerce/Marketing 预设组件
- 定制需求 → 用 Layout + Components 组合
- AI 生成 → 自动选择最合适的方案


### L0: Raw Output Layer (原始输出层)

**定位**：给 AI 一个"后门"，突破系统限制

**核心组件**：
- `TailwindBox`: 纯 className 驱动的容器，AI 可以生成任意 Tailwind 样式
- `RawHtmlBlock`: 直接注入 HTML 内容（需严格 XSS 防护）

**使用场景**：
- 系统组件无法满足需求时
- 需要特殊 SVG 图标、复杂表格
- AI 想要完全自定义的布局

**示例**：
```tsx
<TailwindBox className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 rounded-3xl shadow-2xl hover:scale-105 transition-transform">
  {/* AI 自由发挥的空间 */}
</TailwindBox>
```

**优点**：
- ✅ 最大灵活性，AI 可以实现任何设计
- ✅ 无需等待系统更新组件库

**缺点**：
- ⚠️ 需要 AI 精通 Tailwind/HTML
- ⚠️ 安全风险需要严格控制

---

### L1: Atomic Layer (原子层)

**定位**：单一职责的积木块，支持 `className` 扩展

**核心组件**：
- `Text`: 文本（h1-h6, p, lead, small...）
- `Button`: 按钮（default, outline, ghost...）
- `Image`: 图片（fit, aspectRatio...）
- `Badge`: 徽章
- `Avatar`: 头像
- `Input`: 输入框
- `Divider`: 分割线

**设计原则**：
1. **单一职责**：每个组件只做一件事
2. **Props over Children**：优先用 props 控制，方便 AI 生成 JSON
3. **className 注入**：所有组件支持自定义类名扩展

**示例**：
```tsx
<Text
  variant="h2"
  align="center"
  className="bg-yellow-100 p-4 rounded-lg font-custom"
>
  AI can override styles!
</Text>
```

**AI 友好性**：
- ✅ 原子化设计，AI 可以像搭乐高一样组合
- ✅ `className` 注入让 AI 能微调样式
- ✅ 语义清晰，易于生成 JSON 描述

---

### L2: Layout Layer (布局层)

**定位**：可嵌套的容器，支持 DropZone 组合

**核心组件**：
- `FlexBox`: 简化的 Flex 布局容器
- `Section`: 全宽区域容器（带 padding/background 预设）
- `AtomicContainer`: 高级容器（支持 row/column/grid）

**关键特性**：
- **DropZone 支持**：可以在 Puck 编辑器中拖拽嵌套子组件
- **样式控制权**：通过 props 和 `className` 双重控制

**示例**：
```tsx
<Section padding="lg" background="muted" className="custom-section">
  <FlexBox direction="row" gap={24} className="max-w-screen-xl mx-auto">
    <Text variant="h1">Title</Text>
    <Button variant="primary">CTA</Button>
  </FlexBox>
</Section>
```

**AI 友好性**：
- ✅ 可嵌套设计让 AI 能规划复杂布局
- ✅ 不再受限于"死"区块，能自由组合
- ✅ 适合 AI 生成"先布局后填充"的策略

---

### L3: Composite Layer (复合组件层)

**定位**：复杂 UI 模式的封装，用 Data Props 驱动

**核心组件**：
- `Accordion`: 手风琴（传入 `items` 数组）
- `Tabs`: 标签页（未来扩展）
- `Carousel`: 轮播图（未来扩展）

**设计策略**：
- **Data-Driven**：通过数组/对象配置，而非 JSX 子组件
- **适配器模式**：将标准 shadcn/ui 组件转换为 AI 友好的 Props 接口

**示例**：
```tsx
<Accordion items={[
  { title: "问题 1", content: "答案..." },
  { title: "问题 2", content: "答案..." }
]} />
```

**为什么不直接用 shadcn/ui？**

| shadcn/ui 原生用法 | AI 友好改造 |
|---|---|
| JSX 嵌套：`<Accordion><AccordionItem>...</AccordionItem></Accordion>` | 数据驱动：`<Accordion items={[...]} />` |
| 需要 AI 生成多层 JSX | AI 只需生成 JSON 数组 |
| Puck 难以编辑子组件 | Puck 原生支持 Array Field |

**AI 友好性**：
- ✅ JSON 配置比 JSX 更容易生成
- ✅ Puck 编辑器原生支持数组字段
- ✅ 保持了 shadcn/ui 的样式一致性

---

### L4: Block Layer (预制区块层)

**定位**：开箱即用的营销页面区块

**核心组件**：
- `HeroSection`: 首屏大图
- `FeatureSection`: 特性展示（网格布局 + 图标）
- `PricingSection`: 价格表
- `TestimonialSection`: 客户评价（未来）
- `CTASection`: 行动号召（未来）

**特点**：
- 🏗️ 预设布局和样式
- 📝 通过 Props 快速配置
- 🚀 适合快速搭建营销页面

**何时使用**：
- 用户明确说"我要一个 Hero 区块"
- AI 识别出标准化需求（定价表、特性介绍...）
- 需要快速原型验证

**何时不用**：
- 用户要求定制化布局 → 用 L2 布局层组合
- 需要独特设计风格 → 用 L0/L1 自由发挥

---

## AI System Prompt 建议

在对接 Cloudflare Workers AI 时，应在 System Prompt 中明确告知：

```
你是一个专业的网页设计师和前端开发者。你拥有一个五层组件系统：

**L0 - 原始输出层（最大自由度）**
- TailwindBox: 通过 className 生成任意样式
- RawHtmlBlock: 直接注入 HTML（谨慎使用）

**L1 - 原子层（积木块）**
- Text, Button, Image, Badge 等单一职责组件
- 所有组件支持 className 自定义扩展

**L2 - 布局层（嵌套容器）**
- FlexBox, Section, Container 支持拖拽嵌套
- 先规划布局，再填充内容

**L3 - 复合层（数据驱动）**
- Accordion, Tabs 等复杂组件
- 使用 JSON 数组配置，无需写 JSX

**L4 - 区块层（快速复用）**
- Hero, Pricing, Features 预制区块
- 开箱即用，适合标准化需求

**设计策略**：
1. 优先使用 L1/L2 组合，发挥最大灵活性
2. 善用 className 注入 Tailwind 类名实现定制化
3. 遇到标准化需求才使用 L4 预制区块
4. L0 是终极武器，仅在无法满足时使用

**示例任务**：
用户："我要一个产品特性介绍板块"
你的思考：
- 不直接用 FeatureSection（太死板）
- 用 Section 做外层容器 + FlexBox 做网格布局
- 用 Text + Image + Button 组合卡片
- 通过 className 添加渐变背景和阴影效果
```

---

## 对比传统 Low-Code 的优势

| 传统 Low-Code | Zhop AI-Friendly 架构 |
|---|---|
| 组件库固定，AI 只能"填空" | 五层架构，AI 可以从自由到复用灵活选择 |
| 样式预设死板 | className 注入让 AI 能微调每个细节 |
| 复杂组件需要 JSX 嵌套 | Data Props 让 AI 只需生成 JSON |
| 无法突破组件限制 | L0 层提供"逃生舱" |

---

## 未来扩展方向

1. **L3 层扩充**：添加更多复杂组件（Tabs, Carousel, Modal...）
2. **L4 预制区块库**：基于行业模板（SaaS, 电商, 博客...）
3. **AI 样式建议**：训练 AI 识别设计趋势，主动建议配色/布局
4. **组件版本管理**：让 AI 能在不同版本间切换（Material 风格 vs Tailwind 风格）

---

## 代码位置

- **L0-L3 组件**：`packages/ui/src/components/ai-native/`
- **L4 区块**：`packages/ui/src/blocks/`
- **Puck 配置**：`packages/ui/src/puck/config.tsx`
- **编辑器页面**：`apps/web/app/editor`

---

## 总结

这个架构的核心是 **平衡自由度和效率**：

- L0/L1/L2 给 AI 最大的设计自由（像写代码一样灵活）
- L3/L4 提供快速复用能力（像拖拽式编辑器一样高效）

AI 不再是"被动填空"，而是"主动设计"。这才是 **真正的 AI-Powered Page Builder**。
````
