# Variant vs Theme: Architecture Guide

## 核心概念区分

### Variant (变体) - 功能层级
**定义：** 决定组件的**功能层级**、**结构形式**或**语义状态**

**特征：**
- 与业务逻辑相关（主按钮 vs 次按钮）
- 在任何主题下都应存在
- 影响组件的语义和可访问性

**Button 组件的 Variant 示例：**
```typescript
variant: {
  default: "bg-primary text-primary-foreground",     // 主按钮（最重要的操作）
  secondary: "bg-secondary text-secondary-foreground", // 次按钮
  outline: "border border-input bg-background",      // 边框按钮（次要操作）
  ghost: "hover:bg-accent",                          // 幽灵按钮（最低优先级）
  link: "text-primary underline",                    // 链接样式
  destructive: "bg-destructive text-destructive-foreground" // 危险操作
}
```

### Theme (主题) - 视觉风格
**定义：** 决定组件的**气质**、**形状**、**字体**、**动效**

**特征：**
- 与品牌/场景相关（运动风 vs 奢华风）
- 横跨所有组件的统一视觉语言
- 不影响组件的功能层级

**Button 组件的 Theme 示例：**
```typescript
theme: {
  default: "font-medium rounded-md",                 // 标准样式
  athletic: "font-black uppercase border-2 shadow-brutal", // 运动风
  minimal: "font-light rounded-none border-b",       // 极简风
  tech: "font-mono uppercase backdrop-blur",         // 科技风
  fashion: "font-serif italic rounded-full",         // 时尚风
  luxury: "font-serif tracking-widest border-foreground", // 奢华风
  amazon: "bg-[#FFD814] text-black rounded-md",      // 平台定制
}
```

## 正交组合

Variant 和 Theme 是**正交**的，可以任意组合：

```tsx
// 运动风主按钮
<Button variant="default" theme="athletic">Buy Now</Button>

// 奢华风边框按钮
<Button variant="outline" theme="luxury">Learn More</Button>

// 亚马逊风次按钮
<Button variant="secondary" theme="amazon">Add to Cart</Button>
```

**形象比喻：**
- **Variant：** 你是穿西装（正式）还是穿T恤（休闲）
- **Theme：** 你穿的是"耐克牌"（运动风）还是"古驰牌"（奢侈风）
- **组合：** 耐克牌的西装 = `Athletic Theme + Primary Variant`

## 实现策略

### 1. 原子组件 (必须全实现)

**需要完整实现所有 Theme 的组件：**
- `Button` - 最强烈的视觉载体
- `Badge` - 标签和状态
- `Card` - 容器组件
- `Input` - 表单组件
- `Table` - 数据展示

**实现方式：** 在 CVA 中定义完整的 theme variants

```typescript
// button.tsx
const buttonVariants = cva("base-classes", {
  variants: {
    variant: { /* 功能层级 */ },
    theme: { 
      default: "...",
      athletic: "theme-athletic-border theme-athletic-font ...",
      minimal: "theme-minimal-border theme-minimal-font ...",
      // ... 全部 8-14 种主题
    }
  }
})
```

### 2. 复合组件 (透传即可)

**复合业务组件不需要自己定义主题样式：**
- `ProductCard`
- `Hero`
- `CTASection`
- `PricingTable`

**正确做法：** 通过 props 透传给内部的原子组件

```tsx
// ✅ 正确：复合组件只负责布局
const ProductCard = ({ theme }) => (
  <Card theme={theme}>
    <div className="p-4">
      <Badge theme={theme}>New</Badge>
      <Text theme={theme} variant="h3">Product Name</Text>
      <Button theme={theme}>Buy Now</Button>
    </div>
  </Card>
)

// ❌ 错误：不要在复合组件里重新定义样式
const ProductCard = ({ theme }) => {
  if (theme === 'athletic') return <div className="border-4 ...">...</div>
}
```

## 代码复用：提取 Theme Tokens

为了避免在每个组件里重复写相同的 Tailwind 类，将主题特征提取为 CSS Token：

### 方式 1：Tailwind 自定义类 (推荐)

```css
/* theme-tokens.css */
.theme-athletic-border { @apply border-2 border-primary; }
.theme-athletic-shadow { @apply shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]; }
.theme-athletic-font { @apply font-black uppercase tracking-tight; }
```

```typescript
// 在多个组件中复用
// button.tsx
athletic: "theme-athletic-border theme-athletic-shadow theme-athletic-font",

// card.tsx
athletic: "theme-athletic-border theme-athletic-shadow p-6",

// badge.tsx
athletic: "theme-athletic-border theme-athletic-font px-2",
```

### 方式 2：Tailwind Config 插件

```js
// tailwind.config.js
module.exports = {
  plugins: [
    function({ addComponents }) {
      addComponents({
        '.btn-athletic': {
          '@apply border-2 border-primary font-black uppercase': {},
        }
      })
    }
  ]
}
```

## Puck 编辑器配置

在 Puck ComponentConfig 中，将 Variant 和 Theme 分开展示以提升用户体验：

```typescript
export const ctaButtonConfig: ComponentConfig = {
  fields: {
    // 功能层级（必选）
    variant: {
      type: "select",
      label: "Button Type (Hierarchy)", // 明确标注是层级选择
      options: [
        { label: "Primary (Solid)", value: "default" },
        { label: "Secondary", value: "secondary" },
        { label: "Outline", value: "outline" },
        { label: "Ghost (Minimal)", value: "ghost" },
      ]
    },
    
    // 视觉风格（可选）
    theme: {
      type: "select",
      label: "Theme Style (Visual)", // 明确标注是风格选择
      options: [
        { label: "Use Global Theme", value: undefined }, // 默认继承全局
        { label: "Athletic (Gym)", value: "athletic" },
        { label: "Minimal (Clean)", value: "minimal" },
        { label: "Amazon", value: "amazon" },
        // ...
      ]
    }
  }
}
```

### 特殊处理：平台风格

对于强平台风格（Amazon/TikTok），通常只有一个 Variant 有意义。可以在 Puck 中做联动：

```typescript
// 如果选了 Amazon theme，自动隐藏/禁用 Variant 选项
// 或者自动将 Variant 设为 default
```

## 错误示例与修正

### ❌ 错误 1：混淆 Variant 和 Theme

```typescript
// 不要这样做
variant: {
  amazon: "bg-[#FFD814] ...",  // Amazon 是主题不是变体！
  tiktok: "bg-[#FE2C55] ...",  // TikTok 是主题不是变体！
}
```

**修正：**
```typescript
theme: {
  amazon: "bg-[#FFD814] ...",
  tiktok: "bg-[#FE2C55] ...",
}
```

### ❌ 错误 2：复合组件重新定义样式

```typescript
// ProductCard.tsx - 不要这样做
const ProductCard = ({ theme }) => {
  const styles = {
    athletic: "border-4 border-black uppercase",
    minimal: "border-b font-light"
  }
  return <div className={styles[theme]}>...</div>
}
```

**修正：**
```typescript
const ProductCard = ({ theme }) => (
  <Card theme={theme}>  {/* 让原子组件负责样式 */}
    <Badge theme={theme}>...</Badge>
    <Button theme={theme}>...</Button>
  </Card>
)
```

### ❌ 错误 3：每个组件都写一遍相同的类

```typescript
// button.tsx
athletic: "border-2 border-primary font-black uppercase ...",

// card.tsx
athletic: "border-2 border-primary font-black uppercase ...",

// badge.tsx
athletic: "border-2 border-primary font-black uppercase ...",
```

**修正：**
```typescript
// 提取为 theme-tokens.css
.theme-athletic-base { 
  @apply border-2 border-primary font-black uppercase; 
}

// 然后复用
athletic: "theme-athletic-base rounded-sm",
```

## 最佳实践总结

1. **明确区分：** Variant 是层级，Theme 是风格
2. **实现范围：** 只有原子组件需要完整实现所有 Theme
3. **复合组件：** 只传递 theme prop，不自己写样式
4. **代码复用：** 提取 theme tokens 为 CSS 类
5. **用户体验：** 在 Puck 中分开展示 Variant 和 Theme 选项
6. **命名规范：** 
   - Variant: `primary`, `secondary`, `outline`, `ghost`
   - Theme: `athletic`, `minimal`, `amazon`, `tech`

## 扩展阅读

- [CVA Documentation](https://cva.style/docs)
- [Radix UI Theming](https://www.radix-ui.com/themes/docs/theme/overview)
- [Tailwind CSS Plugins](https://tailwindcss.com/docs/plugins)
