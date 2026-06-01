# Email 原子组件库

这是专为 Email 渲染优化的原子组件集合，确保在所有主流邮件客户端（包括 Outlook）中的完美兼容性。

---

## 📧 EmailButton - 智能按钮组件

### 核心特性

✅ **智能渲染策略**
- 自动检测 props 并选择最佳实现
- 无需手动选择 Table vs Button
- 开发者只需使用一个组件

✅ **Outlook 完美兼容**
- 描边按钮自动使用 Table 布局
- 全宽按钮自动使用 Table 布局
- 实色按钮使用 React Email 原生组件（更轻量）

✅ **类型安全**
- TypeScript 类型定义完整
- Props 自动补全和验证

---

## 使用指南

### 基础用法

```tsx
import { EmailButton } from '@zhop/email/components/atoms/EmailButton'

// 示例 1: 实色按钮 (自动使用 React Email Button)
<EmailButton href="https://shop.com/sale" variant="primary" size="md">
  Shop Now
</EmailButton>

// 示例 2: 描边按钮 (自动使用 Table 渲染)
<EmailButton href="https://shop.com/learn" variant="outline" size="md">
  Learn More
</EmailButton>

// 示例 3: 全宽按钮 (自动使用 Table 渲染)
<EmailButton href="https://shop.com/checkout" fullWidth>
  Continue to Checkout
</EmailButton>
```

---

## API 文档

### Props

| Prop | 类型 | 默认值 | 说明 |
|:---|:---|:---|:---|
| `href` | `string` | **必需** | 按钮链接目标 |
| `children` | `ReactNode` | **必需** | 按钮文字内容 |
| `variant` | `'primary'` \| `'secondary'` \| `'outline'` | `'primary'` | 按钮风格 |
| `size` | `'sm'` \| `'md'` \| `'lg'` | `'md'` | 按钮尺寸 |
| `fullWidth` | `boolean` | `false` | 是否全宽显示 |

### 变体 (Variants)

#### Primary (默认)
- **背景**: 黑色 `#000000`
- **文字**: 白色
- **使用场景**: 主要 CTA（Call To Action）
- **渲染方式**: React Email Button

```tsx
<EmailButton href="/sale" variant="primary">
  Shop Now
</EmailButton>
```

#### Secondary
- **背景**: 灰色 `#f3f4f6`
- **文字**: 深灰色 `#111827`
- **使用场景**: 次要操作
- **渲染方式**: React Email Button

```tsx
<EmailButton href="/learn" variant="secondary">
  Learn More
</EmailButton>
```

#### Outline (描边)
- **背景**: 透明
- **边框**: 2px 黑色实线
- **文字**: 黑色
- **使用场景**: 轻量级操作、次要 CTA
- **渲染方式**: ⚠️ **自动使用 Table** (Outlook 兼容性)

```tsx
<EmailButton href="/terms" variant="outline">
  View Terms
</EmailButton>
```

### 尺寸 (Sizes)

| Size | Padding | Font Size | 使用场景 |
|:---|:---|:---|:---|
| `sm` | `8px 16px` | `14px` | 小型 CTA、内联按钮 |
| `md` | `12px 24px` | `16px` | 标准按钮（推荐） |
| `lg` | `16px 32px` | `18px` | 首屏 Hero、重要 CTA |

---

## 智能渲染决策树

```
EmailButton 组件
    │
    ├─ variant === 'outline' ?
    │   └─ YES → 使用 Table 渲染 ✅
    │       (Outlook 无法正确渲染 <a> 标签上的 border + padding)
    │
    ├─ fullWidth === true ?
    │   └─ YES → 使用 Table 渲染 ✅
    │       (Outlook 无法让 <a> 标签 100% 宽度)
    │
    └─ 其他情况
        └─ 使用 React Email Button ⚡
            (更轻量，性能更好)
```

---

## 为什么需要 Table 渲染？

### 问题 1: Outline 按钮在 Outlook 中崩坏

**现象**:
```tsx
// 在 Outlook (Windows) 中渲染异常
<a style="border: 2px solid #000; padding: 12px 24px;">
  Learn More
</a>
```

**结果**: 边框紧紧勒住文字，padding 被忽略。

**解决方案**:
```tsx
<table>
  <td style="border: 2px solid #000; padding: 12px 24px;">
    <a>Learn More</a>
  </td>
</table>
```

**结果**: ✅ 边框、padding、圆角都正常显示。

---

### 问题 2: 全宽按钮无法撑满

**现象**:
```tsx
// 在 Outlook 中无法真正 100% 宽度
<a style="display: block; width: 100%;">
  Continue
</a>
```

**结果**: 按钮宽度根据文字长度自适应，无法撑满容器。

**解决方案**:
```tsx
<table width="100%">
  <td><a>Continue</a></td>
</table>
```

**结果**: ✅ 按钮真正横贯整个邮件宽度。

---

## 最佳实践

### ✅ DO (推荐)

```tsx
// 1. 只使用 EmailButton，不要手动选择实现
<EmailButton variant="outline">Learn More</EmailButton>

// 2. 为重要 CTA 使用 primary + lg
<EmailButton variant="primary" size="lg" href="/sale">
  Shop Black Friday Sale
</EmailButton>

// 3. 在 Email 模板中使用居中布局
<div style={{ textAlign: 'center' }}>
  <EmailButton href="/sale">Shop Now</EmailButton>
</div>

// 4. 使用 fullWidth 创建横贯式按钮
<EmailButton href="/checkout" fullWidth>
  Complete Your Order
</EmailButton>
```

### ❌ DON'T (避免)

```tsx
// ❌ 不要直接使用内部组件
import { EmailButtonTable } from './EmailButton' // 这些是 internal 的！
import { EmailButtonNative } from './EmailButton'

// ❌ 不要在 Email 中使用渐变背景
<EmailButton style={{ background: 'linear-gradient(...)' }}>
  // 邮件客户端不支持渐变
</EmailButton>

// ❌ 不要依赖 CSS 类名
<EmailButton className="my-button">
  // Email 不支持 <style> 标签，必须内联样式
</EmailButton>

// ❌ 不要使用复杂的嵌套
<EmailButton>
  <div><span>Text</span></div> // 保持简单！
</EmailButton>
```

---

## 跨客户端兼容性

| 客户端 | Primary | Secondary | Outline | Full Width | 备注 |
|:---|:---:|:---:|:---:|:---:|:---|
| **Gmail** | ✅ | ✅ | ✅ | ✅ | 完美支持 |
| **Outlook (Web)** | ✅ | ✅ | ✅ | ✅ | 完美支持 |
| **Outlook (Windows)** | ✅ | ✅ | ✅ | ✅ | 需要 Table 渲染 |
| **Apple Mail** | ✅ | ✅ | ✅ | ✅ | 完美支持 |
| **Yahoo Mail** | ✅ | ✅ | ✅ | ✅ | 完美支持 |
| **ProtonMail** | ✅ | ✅ | ✅ | ✅ | 完美支持 |
| **Thunderbird** | ✅ | ✅ | ✅ | ✅ | 完美支持 |

✅ 已在所有主流客户端测试通过

---

## 技术细节

### 内部实现

组件内部包含两个私有实现：

1. **EmailButtonNative** (轻量级)
   - 使用 React Email 的 `<Button>` 组件
   - 适用于实色背景 + 自适应宽度
   - 渲染更快，HTML 更小

2. **EmailButtonTable** (兼容性)
   - 使用 `<table>` 布局
   - 适用于描边按钮 + 全宽按钮
   - Outlook 完美兼容

### 决策代码

```typescript
export function EmailButton(props: EmailButtonProps) {
  const { variant = 'primary', fullWidth = false } = props

  // 自动决策
  const shouldUseTable = variant === 'outline' || fullWidth

  if (shouldUseTable) {
    return <EmailButtonTable {...props} />
  }

  return <EmailButtonNative {...props} />
}
```

---

## 常见问题

### Q: 为什么不直接全部用 Table？

**A**: Table 渲染虽然兼容性更好，但会增加 HTML 体积（~30%）。对于实色按钮，React Email 的原生 `<Button>` 已经足够可靠，没必要增加复杂度。

### Q: 如何自定义按钮颜色？

**A**: 目前只支持预设的 3 种变体。如果需要自定义颜色，建议在组件层面修改 `variantStyles` 配置对象，或者创建新的变体（如 `brand`、`success`、`danger`）。

### Q: 能否支持图标按钮？

**A**: 可以，但要注意图标必须使用 `<img>` 标签（不支持 SVG 内联）。示例：

```tsx
<EmailButton href="/sale">
  <img src="https://cdn.example.com/icon.png" width="16" height="16" alt="" />
  {' '}Shop Now
</EmailButton>
```

### Q: 为什么 Outlook 中圆角消失了？

**A**: 旧版 Outlook (2007-2016) 不支持 `border-radius`。如果你的用户群体包含这些版本，建议：
1. 使用方形按钮（更简洁）
2. 或者接受降级（圆角→直角）

---

## 未来计划

- [ ] 支持自定义颜色主题
- [ ] 添加图标位置配置（左/右）
- [ ] 支持禁用状态
- [ ] 添加 loading 状态（转圈动画）
- [ ] 支持渐变背景（生成图片回退）

---

## 相关资源

- [React Email 文档](https://react.email)
- [Email Client CSS Support](https://www.caniemail.com)
- [Outlook CSS 兼容性指南](https://www.litmus.com/blog/a-guide-to-rendering-differences-in-microsoft-outlook-clients)
- [Email Button 最佳实践](https://www.goodemailcode.com/email-buttons)

---

**最后更新**: 2026-01-22  
**维护者**: Zhop Team  
**许可证**: MIT
