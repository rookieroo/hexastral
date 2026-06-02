import { StyleSheet } from 'react-native'
import { C } from './constants'

export const onboardingStyles = StyleSheet.create({
  // Progress
  progressTrack: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 0,
  },
  progressFill: {
    height: 1,
    backgroundColor: C.primary,
  },

  // CTA
  cta: {
    borderWidth: 0.5,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 2,
  },
  ctaDisabled: {
    opacity: 0.35,
  },
  ctaLabel: {
    fontSize: 10,
    letterSpacing: 5,
    fontWeight: '300',
  },

  // Skip link
  skipLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipText: {
    fontSize: 8,
    letterSpacing: 3,
    color: C.muted,
    fontWeight: '300',
  },

  // Hero

  // Step shared
  stepWrap: {
    flex: 1,
    paddingTop: 16,
  },
  stepHeader: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 8,
  },
  stepQuestion: {
    fontSize: 30,
    fontWeight: '100',
    color: C.text,
    letterSpacing: 0.5,
    lineHeight: 38,
  },
  stepHint: {
    fontSize: 9,
    letterSpacing: 3.5,
    color: C.muted,
    fontWeight: '300',
  },
  stepFooter: {
    paddingHorizontal: 28,
    paddingBottom: 36,
    gap: 0,
    marginTop: 'auto',
  },

  // Date picker box
  pickerBox: {
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: C.border,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // Time list (Birth Hour step)
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  timeBranch: {
    fontSize: 22,
    fontWeight: '100',
    width: 28,
    textAlign: 'center',
  },
  timeCenter: {
    flex: 1,
  },
  timeName: {
    fontSize: 13,
    letterSpacing: 2.5,
    fontWeight: '300',
    textTransform: 'uppercase',
  },
  timeRange: {
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: '300',
  },
  timeCheck: {
    fontSize: 14,
    fontWeight: '300',
    marginLeft: 4,
  },

  // Gender (stacked cards)
  genderList: {
    flex: 1,
    paddingHorizontal: 28,
    gap: 12,
    paddingTop: 8,
  },
  genderCard: {
    borderWidth: 0.5,
    paddingVertical: 28,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  genderSymbol: {
    fontSize: 36,
    fontWeight: '100',
    width: 36,
    textAlign: 'center',
  },
  genderLabel: {
    flex: 1,
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '300',
  },
  genderRadio: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 0.5,
  },

  // City search
  citySearchBox: {
    marginHorizontal: 28,
    borderBottomWidth: 1,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  citySearchInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '200',
    letterSpacing: 0.3,
    padding: 0,
  },
  citySelectedBadge: {
    fontSize: 18,
    fontWeight: '300',
  },
  cityResultsWrap: {
    marginHorizontal: 28,
    marginTop: 4,
    borderWidth: 0.5,
  },
  cityResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  cityResultName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '200',
    letterSpacing: 0.3,
  },
  cityResultCountry: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '300',
  },
  cityNoResults: {
    paddingHorizontal: 28,
    paddingTop: 20,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '300',
    textAlign: 'center',
  },
  cityNote: {
    fontSize: 7.5,
    letterSpacing: 2.5,
    color: `${C.muted}88`,
    lineHeight: 14,
    fontWeight: '300',
  },

  // Bridge

  // Auth
  appleBtn: {
    borderWidth: 0.5,
    borderColor: C.white,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 2,
  },
  appleBtnText: {
    fontSize: 15,
    fontWeight: '300',
    color: C.white,
    letterSpacing: 1,
  },
  authDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  authDividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: C.border,
  },
  authDividerText: {
    fontSize: 8,
    letterSpacing: 4,
    color: C.muted,
    fontWeight: '300',
  },
  authNote: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: `${C.muted}88`,
    textAlign: 'center',
    lineHeight: 13,
    fontWeight: '300',
    paddingTop: 14,
  },

  // Notify
  notifyCardWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 20,
  },
  notifyCard: {
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 16,
    width: '100%',
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0,
  },
  notifyTitle: {
    fontSize: 11,
    fontWeight: '300',
    color: C.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notifyBody: {
    fontSize: 12,
    fontWeight: '200',
    color: C.muted,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  notifyTime: {
    fontSize: 10,
    color: C.muted,
    fontWeight: '300',
    marginLeft: 8,
  },
  notifyLabel: {
    fontSize: 7.5,
    letterSpacing: 2.5,
    color: `${C.muted}88`,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '300',
  },

  // Social

  // ─── CTA light (outline on light-bg steps — Ink Brutalism) ────────────────
  ctaLight: {
    borderWidth: 0.5,
    borderColor: '#0F0F0F',
    backgroundColor: 'transparent',
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 2,
  },
  ctaLightLabel: {
    fontSize: 10,
    letterSpacing: 5,
    fontWeight: '300',
    color: '#0F0F0F',
  },

  // ─── Skip link light (underlined variant) ──────────────────────────────────
  skipTextLight: {
    fontSize: 12,
    letterSpacing: 1,
    color: '#8A8A8A',
    fontWeight: '300',
    textDecorationLine: 'underline',
  },

  // ─── Bridge step ───────────────────────────────────────────────────────────

  // ─── Auth — solid black Apple button (works on any background) ────────────────
  appleBtnSolid: {
    backgroundColor: '#000000',
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 2,
  },
  appleBtnSolidText: {
    fontSize: 15,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  appleBtnLight: {
    backgroundColor: '#0F0F0F',
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 2,
  },
  appleBtnLightText: {
    fontSize: 15,
    fontWeight: '300',
    color: '#FAFAFA',
    letterSpacing: 1,
  },
  guestLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  guestLinkText: {
    fontSize: 13,
    fontWeight: '300',
    color: C.muted,
    textDecorationLine: 'underline',
    letterSpacing: 0.5,
  },

  // ─── Notify (iOS lockscreen card style) ────────────────────────────────────
  notifyHeading: {
    fontSize: 28,
    fontWeight: '300',
    color: C.text,
    letterSpacing: 0.3,
    lineHeight: 36,
  },
  notifyMockWrap: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  notifyMockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  notifyMockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  notifyMockIcon: {
    width: 36,
    height: 36,
    borderRadius: 0,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  notifyMockAppName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333333',
  },
  notifyMockTime: {
    fontSize: 11,
    color: '#AAAAAA',
    fontWeight: '400',
  },
  notifyMockTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    marginTop: 2,
    marginBottom: 2,
  },
  notifyMockBody: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 18,
    fontWeight: '400',
  },

  // ─── Social pre-label ──────────────────────────────────────────────────────
})
