# Puck Blocks 双模渲染架构 - 文件清单

本文件列出了完整实现中创建的所有文件及其用途。

## 📂 核心架构文件

### 归因系统 (Tracking System)
```
packages/ui/src/lib/
├── tracking-schema.ts       # 广告归因配置 Schema (Zod v4)
└── tracking-utils.ts        # 归因 URL 构建和解析工具
```

**功能**:
- 定义统一的归因配置接口（Meta/TikTok/GA4/Pinterest/Klaviyo）
- 生成 `/api/jump` 跳转链接
- 解析查询参数还原归因配置

### 双模渲染框架 (Dual-Mode Rendering)
```
packages/ui/src/lib/
└── create-block.tsx         # 工厂函数 - 创建双模 Puck Block
```

**功能**:
- 统一 Block 定义接口
- 自动分发到 Web/Email 渲染器
- Zod Schema → Puck Fields 自动转换
- 类型安全保障

---

## 🎨 UI 原子组件

### Email 原子组件
```
packages/email/components/atoms/
└── EmailButton.tsx          # Email 兼容按钮 (VML Fallback)
```

**功能**:
- Outlook 兼容的 VML 按钮
- 3 种变体（primary/secondary/outline）
- 3 种尺寸（sm/md/lg）
- Table-based 备用方案

---

## 🧩 业务组件 (Blocks)

### Hero 组件
```
packages/ui/src/blocks/Hero/
├── index.tsx               # Schema + Block 定义
├── Hero.web.tsx            # Web 实现 (Shadcn UI)
└── Hero.email.tsx          # Email 实现 (React Email)
```

**功能**:
- 全屏营销首屏
- 支持背景图片/视频
- 响应式布局（16:9 → 21:9）
- CTA 按钮跟踪

### CallToAction 组件
```
packages/ui/src/blocks/CallToAction/
├── index.tsx               # Schema + Block 定义
├── CallToAction.web.tsx    # Web 实现
└── CallToAction.email.tsx  # Email 实现
```

**功能**:
- 转化漏斗组件
- 双 CTA 按钮（主/次）
- 渐变背景支持（Web）
- 纯色背景降级（Email）

### ProductGrid 组件
```
packages/ui/src/blocks/ProductGrid/
├── index.tsx               # Schema + Block 定义
├── ProductGrid.web.tsx     # Web 实现
└── ProductGrid.email.tsx   # Email 实现
```

**功能**:
- 商品网格展示
- Hover 切换图（Web）
- Sale 徽章显示
- 2-4 列响应式布局

---

## ⚙️ 配置与导出

### Puck 配置
```
packages/ui/src/
├── puck.config.tsx         # Puck Editor 配置
└── blocks/
    ├── index.ts            # 统一导出入口
    └── examples.ts         # 示例数据（落地页 + Email）
```

**功能**:
- 注册所有 Blocks 到 Puck
- 组件分类（Marketing/E-commerce/Content）
- 导出类型定义

---

## 🚀 API 端点

### 广告归因中间件
```
apps/web/app/api/jump/
└── route.ts                # Server-Side Redirect + 归因上报
```

**功能**:
- 接收跟踪参数
- 并行发送转化事件到多个平台
- 302 重定向到目标 URL
- 超时保护（2s）

**支持平台**:
- Meta Conversions API (CAPI)
- TikTok Events API
- Google Analytics 4 (GA4)
- Pinterest Conversions API
- Klaviyo CRM Events

---

## 📚 文档

### 设计文档
```
packages/ui/
├── README_BLOCKS.md                # 项目 README
├── PUCK_BLOCKS_ARCHITECTURE.md     # 完整架构文档
└── QUICK_START.md                  # 快速开始指南
```

**内容**:
- 架构原则和设计理念
- 完整组件列表和对比表
- 使用指南和代码示例
- 故障排查和最佳实践

---

## 🧪 测试

### 单元测试
```
packages/ui/src/__tests__/
└── blocks.test.ts          # 集成测试（Vitest）
```

**测试覆盖**:
- ✅ 归因 URL 生成和解析
- ✅ Block 配置验证
- ✅ Email Button 渲染

---

## 📊 文件统计

| 类型 | 数量 | 说明 |
|:---|:---:|:---|
| **核心框架** | 3 | tracking-schema/utils + create-block |
| **原子组件** | 1 | EmailButton |
| **业务组件** | 9 | Hero/CTA/ProductGrid (各3个文件) |
| **配置文件** | 3 | puck.config + index + examples |
| **API 端点** | 1 | /api/jump |
| **文档** | 3 | README + Architecture + QuickStart |
| **测试** | 1 | blocks.test.ts |
| **总计** | **21** | 完整实现 |

---

## 🗂️ 目录树视图

```
zhop/
├── apps/
│   └── web/
│       └── app/
│           └── api/
│               └── jump/
│                   └── route.ts                    # API 端点
│
└── packages/
    ├── email/
    │   └── components/
    │       └── atoms/
    │           └── EmailButton.tsx                 # Email 原子组件
    │
    └── ui/
        ├── README_BLOCKS.md                        # 项目 README
        ├── PUCK_BLOCKS_ARCHITECTURE.md             # 架构文档
        ├── QUICK_START.md                          # 快速开始
        │
        └── src/
            ├── lib/
            │   ├── create-block.tsx                # 双模渲染框架
            │   ├── tracking-schema.ts              # 归因 Schema
            │   └── tracking-utils.ts               # 归因工具
            │
            ├── blocks/
            │   ├── index.ts                        # 统一导出
            │   ├── examples.ts                     # 示例数据
            │   │
            │   ├── Hero/
            │   │   ├── index.tsx                   # Hero 定义
            │   │   ├── Hero.web.tsx                # Hero Web
            │   │   └── Hero.email.tsx              # Hero Email
            │   │
            │   ├── CallToAction/
            │   │   ├── index.tsx                   # CTA 定义
            │   │   ├── CallToAction.web.tsx        # CTA Web
            │   │   └── CallToAction.email.tsx      # CTA Email
            │   │
            │   └── ProductGrid/
            │       ├── index.tsx                   # Grid 定义
            │       ├── ProductGrid.web.tsx         # Grid Web
            │       └── ProductGrid.email.tsx       # Grid Email
            │
            ├── puck.config.tsx                     # Puck 配置
            │
            └── __tests__/
                └── blocks.test.ts                  # 单元测试
```

---

## 🎯 下一步行动

### 立即可用
- ✅ Hero, CallToAction, ProductGrid 已完整实现
- ✅ 广告归因系统已就绪
- ✅ API 端点已创建

### 需要配置
1. 在 `.env` 中添加广告平台 API Token
2. 部署 `/api/jump` 端点到生产环境
3. 在 Puck Editor 中启用 Tracking 开关

### 待实现组件 (优先级排序)
1. **P0**: NewsletterForm, FeaturedProduct, Countdown
2. **P1**: TrustBadge, CollectionList, Testimonial
3. **P2**: RichText, ImageWithText, Video, Accordion

---

## 📞 技术支持

- 📖 查看完整文档: [PUCK_BLOCKS_ARCHITECTURE.md](./PUCK_BLOCKS_ARCHITECTURE.md)
- ⚡ 快速上手: [QUICK_START.md](./QUICK_START.md)
- 💡 查看示例: [blocks/examples.ts](./src/blocks/examples.ts)
- 🐛 报告问题: GitHub Issues

---

**Created**: 2026-01-22  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
