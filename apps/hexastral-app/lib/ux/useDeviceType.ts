/**
 * 设备类型 & 响应式布局工具
 *
 * 检测 iPad vs iPhone，提供自适应尺寸。
 */

import { Platform, useWindowDimensions } from 'react-native'

export type DeviceType = 'phone' | 'tablet'

/** 判断是否为 iPad / 大屏 */
export function useDeviceType(): {
  deviceType: DeviceType
  isTablet: boolean
  screenWidth: number
  screenHeight: number
  /** 内容最大宽度 — iPad 上限制宽度避免过宽 */
  contentMaxWidth: number
  /** Luopan / 飞星盘等正方形组件的尺寸 */
  squareSize: number
  /** 卡片列数 */
  columns: number
} {
  const { width, height } = useWindowDimensions()
  const isTablet = Platform.OS === 'ios' && Math.min(width, height) >= 600

  return {
    deviceType: isTablet ? 'tablet' : 'phone',
    isTablet,
    screenWidth: width,
    screenHeight: height,
    // iPad 上内容最大 640px，居中显示
    contentMaxWidth: isTablet ? 640 : width,
    // 正方形组件：iPad 上 400px，iPhone 上留 48px 边距
    squareSize: isTablet ? 400 : Math.min(width - 48, 360),
    // iPad 横屏可以显示 2 列
    columns: isTablet && width > height ? 2 : 1,
  }
}

/** 包裹容器 — iPad 上居中限宽 */
export function responsiveContainerStyle(maxWidth: number, screenWidth: number) {
  if (screenWidth <= maxWidth) return {}
  return {
    maxWidth,
    alignSelf: 'center' as const,
    width: '100%' as const,
  }
}
