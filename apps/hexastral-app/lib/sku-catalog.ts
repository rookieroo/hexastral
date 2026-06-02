/**
 * SKU 分类目录
 *
 * 单一数据源，驱动:
 *   - 坊(Shop) tab 分类渲染
 *   - sku-detail.tsx 展示 & CTA 状态
 *   - 购买流程 (purchaseSingleReading)
 *   - 功能路由跳转 (SKU_ROUTES)
 *
 * consumeMode:
 *   'instant'    — 占卜：起卦完成即核销（一次性消耗）
 *   'persistent' — 命理：生成报告后永久可回看，但每次购买只能生成一次报告
 */

export type SkuCategory = 'divination' | 'destiny'

export type SingleSkuId = 'divination' | 'fate_reading' | 'compatibility'
export type SkuId = SingleSkuId

export interface SkuDef {
  id: SkuId
  category: SkuCategory
  /** Expo Router target href when CTA is tapped (after access granted) */
  route: string
  /** RevenueCat product identifier. null = Coming Soon (no purchase flow) */
  iapProductId: string | null
  /** Fallback USD price string — iOS client should use RevenueCat localized price */
  fallbackPrice: string | null
  /** Type of Pro quota consumed: 'divination' | 'pair' | null for Coming Soon */
  proQuotaType: 'divination' | 'pair' | null
  /** One-time consumable (cleared on use) vs permanent report access after purchase */
  consumeMode: 'instant' | 'persistent' | null
  comingSoon: boolean
  /** Locale key prefix for title, desc, and label — e.g. 'shop_divination' → shop_divination_title, _desc, _label */
  localePrefix: string
}

export const SKU_CATALOG: SkuDef[] = [
  // ── 占卜 ──────────────────────────────────────────────────────────────────
  {
    id: 'divination',
    category: 'divination',
    route: '/(tabs)/yiching',
    iapProductId: 'hexastral_divination_single',
    fallbackPrice: '$1.99',
    proQuotaType: 'divination',
    consumeMode: 'instant',
    comingSoon: false,
    localePrefix: 'shop_divination',
  },

  // ── 命理 ──────────────────────────────────────────────────────────────────
  {
    id: 'fate_reading',
    category: 'destiny',
    route: '/(tabs)',
    iapProductId: 'hexastral_fate_reading',
    fallbackPrice: '$9.99',
    proQuotaType: 'pair',
    consumeMode: 'persistent',
    comingSoon: false,
    localePrefix: 'shop_fate_reading',
  },
  {
    id: 'compatibility',
    category: 'destiny',
    route: '/(tabs)/synastry',
    iapProductId: 'hexastral_compatibility',
    fallbackPrice: '$12.99',
    proQuotaType: 'pair',
    consumeMode: 'persistent',
    comingSoon: false,
    localePrefix: 'shop_compatibility',
  },

  // 风水功能已下架，保有 svc-astro 端点供未来独立 App 使用
  // 面相/手相已转为设置层级特征参数（非独立 SKU），通过 Settings 录入
]

export interface SkuCategoryDef {
  id: SkuCategory
  /** i18n key for the section header label */
  labelKey: string
  /** Lucide icon name */
  iconName: string
}

export const SKU_CATEGORIES: SkuCategoryDef[] = [
  { id: 'divination', labelKey: 'shop_cat_divination', iconName: 'Sparkles' },
  { id: 'destiny', labelKey: 'shop_cat_destiny', iconName: 'Star' },
]

/** Returns all SKUs belonging to a given category, in catalog order */
export function getSkusByCategory(category: SkuCategory): SkuDef[] {
  return SKU_CATALOG.filter((s) => s.category === category)
}

/** Returns a single SKU by id, throws if not found */
export function getSkuById(id: SkuId): SkuDef {
  const sku = SKU_CATALOG.find((s) => s.id === id)
  if (!sku) throw new Error(`Unknown SKU: ${id}`)
  return sku
}
