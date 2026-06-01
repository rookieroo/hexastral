# Puck Blocks 快速开始指南

## 5 分钟上手

### 1️⃣ 安装依赖

```bash
cd packages/ui
bun install
```

### 2️⃣ 导入配置

```typescript
// 在你的 Puck Editor 中导入配置
import { puckConfig } from '@zhop/ui/puck.config'
import { Render } from '@measured/puck'

function MyEditor() {
  return (
    <Puck
      config={puckConfig}
      data={initialData}
      onChange={handleChange}
    />
  )
}
```

### 3️⃣ 配置广告归因

在 `.env` 或 Cloudflare Secrets 中添加：

```bash
# 必需 (Meta)
META_PIXEL_ID=123456789
META_CAPI_ACCESS_TOKEN=your_token

# 必需 (TikTok)
TIKTOK_PIXEL_CODE=ABC123
TIKTOK_ACCESS_TOKEN=your_token

# 必需 (Google)
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=your_secret
```

### 4️⃣ 部署 API 端点

确保 `/api/jump/route.ts` 已部署到生产环境：

```bash
cd apps/web
bun run deploy
```

### 5️⃣ 测试组件

在 Puck Editor 中添加 Hero 组件：

1. 点击 "Add Component" → 选择 "Hero"
2. 设置标题、图片、CTA 文字
3. 启用 Tracking 开关
4. 选择广告平台（Meta/TikTok/GA4）
5. 保存并预览

---

## 常见用例

### 用例 1: 电商落地页

```typescript
const landingPageData = {
  content: [
    {
      type: 'Hero',
      props: {
        title: 'Black Friday Sale - 50% Off',
        imageUrl: 'https://...',
        ctaText: 'Shop Now',
        ctaUrl: 'https://shop.com/sale',
        tracking: {
          enableTracking: true,
          eventType: 'InitiateCheckout',
          value: 99.99,
          destinations: { meta: true, tiktok: true, ga4: true }
        }
      }
    },
    {
      type: 'ProductGrid',
      props: {
        heading: 'Best Sellers',
        products: [...],
        tracking: {
          enableTracking: true,
          eventType: 'AddToCart',
          destinations: { meta: true, tiktok: true }
        }
      }
    },
    {
      type: 'CallToAction',
      props: {
        headline: 'Limited Time Offer!',
        primaryButtonText: 'Claim Discount',
        tracking: {
          enableTracking: true,
          eventType: 'Lead'
        }
      }
    }
  ]
}
```

### 用例 2: 邮件营销活动

```typescript
import { render } from '@react-email/render'
import { HeroEmail } from '@zhop/ui/blocks/Hero'

const emailHtml = render(
  <HeroEmail
    title="Summer Sale"
    imageUrl="https://..."
    ctaText="Shop Now"
    ctaUrl="https://shop.com"
    tracking={{
      enableTracking: true,
      eventType: 'ViewContent',
      destinations: { meta: true, klaviyo: true }
    }}
  />
)

// 发送邮件
await sendEmail({
  to: 'customer@example.com',
  subject: 'Summer Sale is Here!',
  html: emailHtml
})
```

### 用例 3: 多渠道统一追踪

```typescript
// 同一个配置，同时用于 Web 和 Email
const sharedTrackingConfig = {
  enableTracking: true,
  eventType: 'InitiateCheckout',
  value: 49.99,
  currency: 'USD',
  destinations: {
    meta: true,      // Meta CAPI
    tiktok: true,    // TikTok Events API
    ga4: true,       // Google Analytics 4
    pinterest: true, // Pinterest Conversions API
    klaviyo: true,   // Klaviyo CRM
  }
}

// Web 落地页
<Hero tracking={sharedTrackingConfig} />

// Email 营销
<HeroEmail tracking={sharedTrackingConfig} />

// 两者都通过 /api/jump 统一归因！
```

---

## 高级配置

### 自定义按钮样式

```typescript
// Web 端使用 Shadcn Button variants
<Button variant="outline" size="lg" className="custom-class">
  Click Me
</Button>

// Email 端使用 EmailButton
<EmailButton variant="primary" size="lg">
  Click Me
</EmailButton>
```

### 动态产品数据

```typescript
// 从 API 获取产品数据
const products = await fetch('/api/products').then(r => r.json())

const productGridProps = {
  products: products.map(p => ({
    id: p.id,
    title: p.title,
    imageUrl: p.image,
    price: p.price,
    url: `/products/${p.handle}`,
  })),
  tracking: {
    enableTracking: true,
    eventType: 'AddToCart',
    contentType: 'product',
  }
}
```

### A/B 测试

```typescript
// 在 /api/jump 中添加变体参数
const variantUrl = buildTrackingUrl(baseUrl, tracking, {
  componentType: 'Hero',
  // 添加自定义参数
  variant: isVariantA ? 'A' : 'B'
})

// 在服务端记录变体性能
await db.insert('ab_tests', {
  variant: searchParams.get('variant'),
  conversions: 1
})
```

---

## 故障排查速查表

| 问题 | 可能原因 | 解决方案 |
|---|---|---|
| 归因数据未显示在 Meta Ads Manager | API Token 错误 | 检查 `META_CAPI_ACCESS_TOKEN` |
| Email 按钮不显示 | 使用了 Flex 布局 | 改用 `<table>` 布局 |
| /api/jump 返回 404 | 端点未部署 | 运行 `bun run deploy` |
| 跳转延迟 > 1s | API 请求超时 | 添加 2s 超时限制 |
| Outlook 显示异常 | 缺少 VML Fallback | 使用 `EmailButtonTable` |

---

## 性能优化建议

### 1. 预连接优化

```tsx
{tracking.enableTracking && (
  <link rel="preconnect" href="https://your-api.com" />
)}
```

### 2. 并行发送转化事件

```typescript
await Promise.allSettled([
  fireMetaConversion(...),
  fireTikTokConversion(...),
  fireGA4Conversion(...)
])
```

### 3. 设置请求超时

```typescript
await Promise.race([
  apiCall(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 2000)
  )
])
```

---

## 下一步

1. 📚 阅读完整文档: [PUCK_BLOCKS_ARCHITECTURE.md](./PUCK_BLOCKS_ARCHITECTURE.md)
2. 🎨 查看 shadcn/ui 组件: [ui.shadcn.com](https://ui.shadcn.com)
3. 📧 学习 React Email: [react.email](https://react.email)
4. 🔧 配置广告平台 API: 
   - [Meta CAPI](https://developers.facebook.com/docs/marketing-api/conversions-api)
   - [TikTok Events API](https://business-api.tiktok.com/portal/docs)
   - [GA4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)

---

## 获取帮助

- 🐛 报告 Bug: [GitHub Issues](#)
- 💬 讨论功能: [GitHub Discussions](#)
- 📖 查看示例: [/examples](#)

---

**祝你构建顺利！🚀**
