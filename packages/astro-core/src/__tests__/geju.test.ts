import { describe, expect, it } from 'bun:test'
import { recommendFavorableElement } from '../geju'

// 甲 = 木. 木生火(食伤) · 木克土(财) · 水生木(印) · 金克木(官杀).
describe('recommendFavorableElement — 专旺格 (顺旺神, not the normal 制衡)', () => {
  it('曲直格 (木专旺): 用神 木 (旺神本气), 忌神 金 (克木之官杀)', () => {
    expect(recommendFavorableElement('甲', '极强', '曲直格')).toEqual({
      favorable: '木',
      unfavorable: '金',
    })
  })

  it('润下格 (水专旺): 用神 水, 忌神 土 (克水)', () => {
    expect(recommendFavorableElement('壬', '极强', '润下格')).toEqual({
      favorable: '水',
      unfavorable: '土',
    })
  })
})

describe('recommendFavorableElement — 从格 (顺所从之神, 忌印绶生身破从)', () => {
  it('从财格: 用神 土 (我克=财), 忌神 水 (生我=印)', () => {
    expect(recommendFavorableElement('甲', '极弱', '从财格')).toEqual({
      favorable: '土',
      unfavorable: '水',
    })
  })

  it('从杀格: 用神 金 (克我=官杀), 忌神 水 (印)', () => {
    expect(recommendFavorableElement('甲', '极弱', '从杀格')).toEqual({
      favorable: '金',
      unfavorable: '水',
    })
  })

  it('从儿格: 用神 火 (我生=食伤), 忌神 水 (最忌印绶)', () => {
    expect(recommendFavorableElement('甲', '极弱', '从儿格')).toEqual({
      favorable: '火',
      unfavorable: '水',
    })
  })
})

describe('recommendFavorableElement — 正格/普通格 (按强弱平衡, 行为不变)', () => {
  it('日主偏强 → 喜泄 (食伤=火), 忌同类 (木)', () => {
    expect(recommendFavorableElement('甲', '偏强', '正官格')).toEqual({
      favorable: '火',
      unfavorable: '木',
    })
  })

  it('日主偏弱 → 喜生扶 (印=水), 忌财耗身 (土) — normal logic unchanged', () => {
    expect(recommendFavorableElement('甲', '偏弱', '普通格')).toEqual({
      favorable: '水',
      unfavorable: '土',
    })
  })

  it('中和 → 喜财 (我克=土)', () => {
    expect(recommendFavorableElement('甲', '中和', '正官格')).toEqual({
      favorable: '土',
      unfavorable: '木',
    })
  })
})
