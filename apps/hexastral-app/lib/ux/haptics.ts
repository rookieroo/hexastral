/**
 * 触觉反馈工具
 *
 * 集中管理 haptics 类型，方便全局调用
 */

import * as Haptics from 'expo-haptics'

/** 轻触反馈 — 选择、切换 */
export function hapticLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

/** 中等反馈 — 按钮确认 */
export function hapticMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
}

/** 重度反馈 — 重要操作 */
export function hapticHeavy() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
}

/** 成功反馈 — 完成、保存 */
export function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}

/** 警告反馈 — 配额用完 */
export function hapticWarning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
}

/** 选择变化反馈 — segment、picker */
export function hapticSelection() {
  Haptics.selectionAsync()
}
