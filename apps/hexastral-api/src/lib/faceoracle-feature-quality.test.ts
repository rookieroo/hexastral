import { describe, expect, it } from 'bun:test'
import { assessFaceoracleFeatureQuality } from './faceoracle-feature-quality'

describe('assessFaceoracleFeatureQuality', () => {
  it('accepts a dense face extract', () => {
    const r = assessFaceoracleFeatureQuality('face', {
      tianTing: '宽润',
      yinTang: '平满',
      shanGen: '不断',
      foreheadWidth: '适中',
      eyebrowType: '清秀',
      eyeType: '有神',
      noseShape: '准头圆',
      cheekBones: '中等',
      nasolabialFolds: '浅',
      mouthType: '棱角清晰',
      chin: '地阁稳',
      earLobes: '厚',
      complexion: '润泽',
      boneStructure: '骨相清',
      overallAssessment: '形气清楚',
    })
    expect(r.ok).toBe(true)
  })

  it('rejects mostly unclear palm', () => {
    const r = assessFaceoracleFeatureQuality('palm_l', {
      handShape: 'unclear',
      lifeLine: 'unclear',
      headLine: 'unclear',
      heartLine: 'unclear',
      fateLine: 'unclear',
      mounts: 'unclear',
      fingerRatio: 'unclear',
      specialMarks: 'unclear',
      overallAssessment: 'unclear',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('photo_quality_low')
  })

  it('rejects face payload that looks like palm keys', () => {
    const r = assessFaceoracleFeatureQuality('face', {
      lifeLine: '深长',
      headLine: '平直',
      heartLine: '清晰',
      fateLine: '断续',
      mounts: '金星丘丰',
      handShape: '方掌',
      overallAssessment: '掌纹可见',
      tianTing: 'unclear',
      yinTang: 'unclear',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('modality_mismatch')
  })
})
