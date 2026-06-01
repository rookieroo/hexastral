/**
 * ☽ Karma Contacts — 业力联系人
 *
 * Co‑Star brutalist aesthetic applied to Eastern destiny (Natal / Stellar).
 * Each contact is rendered as a sleek dark‑mode ticket: ultra‑thin hairline
 * border, cryptic five‑element geometric badge, monospace resonance score,
 * and a dashed perforation line separating header from detail.
 *
 * Design language:
 *   · Deep‑space black (#09090B) background
 *   · Hairline 0.5px borders — no corner radius (raw / industrial)
 *   · All‑caps micro‑labels with extreme letter-spacing
 *   · All colour through element accent — nothing else
 *   · No shadows, no gradients, no glow — pure flatness
 */

import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { ArrowLeft, ChevronRight, Plus, X } from 'lucide-react-native'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import type { FiveElement } from '@/components/social/KarmaContactIcon'
import { ELEMENT_COLORS, KarmaContactIcon } from '@/components/social/KarmaContactIcon'
import { useAuth } from '@/lib/auth'
import type { BondData } from '@/lib/domain/bonds'
import { useBondsQuery } from '@/lib/hooks/useBondsQuery'
import { theme } from '@/lib/theme'

type ThemeColors = typeof theme.dark | typeof theme.light

// ─── Types ───────────────────────────────────────────────────────────────────

type KarmaAxis =
  | 'WEALTH PALACE'
  | 'CAREER PALACE'
  | 'ROMANCE PALACE'
  | 'DESTINY PALACE'
  | 'HEALTH AXIS'
  | 'CLASH AXIS'

interface KarmaContact {
  id: string
  name: string
  chineseName?: string
  element: FiveElement
  heavenlyStem: string // e.g. "丁"
  earthlyBranch: string // e.g. "亥"
  animalSign: string // e.g. "Pig"
  resonanceScore: number
  karmaAxis: KarmaAxis
  addedDaysAgo: number
}

// ─── Bond → KarmaContact mapper ──────────────────────────────────────────────

const ARCHETYPE_TO_AXIS: Record<string, KarmaAxis> = {
  harmony: 'ROMANCE PALACE',
  tension: 'CLASH AXIS',
  growth: 'CAREER PALACE',
  karmic: 'DESTINY PALACE',
  volatile: 'CLASH AXIS',
}

/** Deterministic element from bond id (last char determines element) */
function elementFromId(id: string): FiveElement {
  const elements: FiveElement[] = ['金', '木', '水', '火', '土']
  const code = id.charCodeAt(id.length - 1) % 5
  return elements[code]!
}

function bondToKarmaContact(bond: BondData): KarmaContact {
  const daysAgo = Math.floor(
    (Date.now() - new Date(bond.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  return {
    id: bond.id,
    name: bond.targetName,
    element: elementFromId(bond.id),
    heavenlyStem: '—',
    earthlyBranch: '—',
    animalSign: '—',
    resonanceScore: bond.score ?? 0,
    karmaAxis: bond.archetypeCategory
      ? (ARCHETYPE_TO_AXIS[bond.archetypeCategory] ?? 'DESTINY PALACE')
      : 'DESTINY PALACE',
    addedDaysAgo: daysAgo,
  }
}

const AXIS_LABELS: Record<KarmaAxis, string> = {
  'WEALTH PALACE': '财帛宫',
  'CAREER PALACE': '官禄宫',
  'ROMANCE PALACE': '夫妻宫',
  'DESTINY PALACE': '命宫',
  'HEALTH AXIS': '疾厄宫',
  'CLASH AXIS': '六冲轴',
}

const ELEMENT_NAMES: Record<FiveElement, string> = {
  金: 'METAL',
  木: 'WOOD',
  水: 'WATER',
  火: 'FIRE',
  土: 'EARTH',
}

// ─── Score colour — ternary system (no gradients, pure brutalism) ─────────────

function scoreColor(score: number, colors: ThemeColors): string {
  if (score >= 80) return colors.primary // '#9B59B6' celestial
  if (score >= 65) return colors.accent // '#D4AF37' harmonious
  return '#616175' // discordant
}

// ─── Dashed Perforator ────────────────────────────────────────────────────────

function Perforator({ color }: { color: string }) {
  return (
    <View style={styles.perforatorRow}>
      {Array.from({ length: 26 }).map((_, i) => (
        <View key={i} style={[styles.perforatorDot, { backgroundColor: color }]} />
      ))}
    </View>
  )
}

// ─── Individual Contact Ticket ────────────────────────────────────────────────

function ContactTicket({
  contact,
  colors,
  isDark,
}: {
  contact: KarmaContact
  colors: ThemeColors
  isDark: boolean
}) {
  const pressAnim = useRef(new Animated.Value(1)).current
  const elementColor = ELEMENT_COLORS[contact.element]
  const dotColor = isDark ? '#2A2A4E' : '#D4C9E6'
  const sc = scoreColor(contact.resonanceScore, colors)

  const onPressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start()
    Haptics.selectionAsync()
  }, [pressAnim])

  const onPressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start()
  }, [pressAnim])

  const daysLabel =
    contact.addedDaysAgo === 0
      ? 'TODAY'
      : contact.addedDaysAgo === 1
        ? '1 DAY AGO'
        : contact.addedDaysAgo < 30
          ? `${contact.addedDaysAgo} DAYS AGO`
          : `${Math.floor(contact.addedDaysAgo / 30)} MO AGO`

  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.ticket, { borderColor: colors.border }]}
      >
        {/* ── TOP HALF: icon + name + score ─────────────────────────────── */}
        <View style={styles.ticketTop}>
          {/* Geometric icon in an element‑tinted thin‑bordered box */}
          <View style={[styles.iconBox, { borderColor: `${elementColor}55` }]}>
            <KarmaContactIcon element={contact.element} size={36} />
            {/* Element glyph beneath icon */}
            <Text style={[styles.elementGlyph, { color: elementColor }]}>{contact.element}</Text>
          </View>

          {/* Name + metadata column */}
          <View style={styles.nameColumn}>
            <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
              {contact.name}
            </Text>
            {contact.chineseName && (
              <Text style={[styles.chineseName, { color: colors.textSecondary }]}>
                {contact.chineseName}
              </Text>
            )}
            <Text style={[styles.metaBadge, { color: elementColor }]}>
              {contact.heavenlyStem}
              {contact.earthlyBranch}
              {'  ·  '}
              {contact.animalSign.toUpperCase()}
              {'  ·  '}
              {ELEMENT_NAMES[contact.element]}
            </Text>
          </View>

          {/* Resonance score — right side */}
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreNumber, { color: sc }]}>{contact.resonanceScore}</Text>
            <Text style={[styles.scorePct, { color: sc }]}>%</Text>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>RESONANCE</Text>
          </View>
        </View>

        {/* ── PERFORATION ───────────────────────────────────────────────── */}
        <Perforator color={dotColor} />

        {/* ── BOTTOM HALF: axis + added date + chevron ──────────────────── */}
        <View style={styles.ticketBottom}>
          <View style={styles.ticketBottomLeft}>
            <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>KARMA AXIS</Text>
            <Text style={[styles.axisValue, { color: colors.text }]}>
              {contact.karmaAxis}
              {'  '}
              <Text style={{ color: colors.textSecondary, fontSize: 9 }}>
                {AXIS_LABELS[contact.karmaAxis]}
              </Text>
            </Text>
          </View>
          <View style={styles.ticketBottomRight}>
            <Text style={[styles.addedLabel, { color: colors.textSecondary }]}>ADDED</Text>
            <Text style={[styles.addedValue, { color: colors.textSecondary }]}>{daysLabel}</Text>
            <ChevronRight
              size={12}
              color={colors.textSecondary}
              strokeWidth={1}
              style={{ marginTop: 2 }}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ colors }: { colors: ThemeColors }) {
  return (
    <View style={styles.emptyContainer}>
      {/* Cross‑hatch geometric marker */}
      <View style={[styles.emptyIcon, { borderColor: colors.border }]}>
        <Text style={[styles.emptyGlyph, { color: colors.border }]}>✦</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>NO KARMA CONTACTS</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        YOUR CELESTIAL NETWORK AWAITS.{'\n'}
        ADD SOMEONE TO REVEAL YOUR SHARED DESTINY.
      </Text>
    </View>
  )
}

// ─── Add Contact Modal ────────────────────────────────────────────────────────

function AddContactModal({
  visible,
  colors,
  isDark,
  onClose,
  onAdd,
}: {
  visible: boolean
  colors: ThemeColors
  isDark: boolean
  onClose: () => void
  onAdd: () => void
}) {
  function handleConfirm() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onAdd()
  }

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <View style={[styles.modalRoot, { backgroundColor: isDark ? '#18181B' : '#FAFAFA' }]}>
        <View style={styles.modalScroll}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>ADD KARMA CONTACT</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              配置业力联系人
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} hitSlop={12}>
              <X size={18} color={colors.textSecondary} strokeWidth={1} />
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View
            style={[
              styles.futurePlaceholder,
              { borderColor: colors.border, backgroundColor: `${colors.surface}44` },
            ]}
          >
            <Text style={[styles.futurePlaceholderText, { color: colors.textSecondary }]}>
              ◈ KARMA CONTACTS ARE DERIVED FROM YOUR BONDS.{'\n'}
              CREATE A BOND TO SEE DEEP KARMIC ANALYSIS.
            </Text>
          </View>

          {/* Confirm */}
          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.addButton, { borderColor: colors.text }]}
          >
            <Text style={[styles.addButtonText, { color: colors.text }]}>CREATE NEW BOND</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function KarmaContactsScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = isDark ? theme.dark : theme.light
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { userId } = useAuth()

  const { data: bonds = [] } = useBondsQuery(userId)
  const contacts = useMemo(
    () => bonds.filter((b) => b.status === 'active' && b.score != null).map(bondToKarmaContact),
    [bonds]
  )

  const [showAddModal, setShowAddModal] = useState(false)

  const handleAdd = useCallback(() => {
    setShowAddModal(false)
    router.push('/bond-create')
  }, [router])

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.textSecondary} strokeWidth={1} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>KARMA CONTACTS</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>业力联系人</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            setShowAddModal(true)
          }}
          style={[styles.addIconBtn, { borderColor: colors.border }]}
          hitSlop={8}
        >
          <Plus size={16} color={colors.textSecondary} strokeWidth={1} />
        </TouchableOpacity>
      </View>

      {/* ── CONNECTION COUNT ─────────────────────────────────────────────── */}
      <View style={[styles.countRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {contacts.length} ACTIVE CONNECTION{contacts.length !== 1 ? 'S' : ''}
        </Text>
        <View style={[styles.countDivider, { borderColor: colors.border }]} />
        <Text style={[styles.countHint, { color: colors.textSecondary }]}>
          ◈ KARMIC NETWORK MAP IN V2
        </Text>
      </View>

      {/* ── CONTACT LIST ─────────────────────────────────────────────────── */}
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          contacts.length === 0 && styles.listEmpty,
          { paddingBottom: insets.bottom + 24 },
        ]}
        ListEmptyComponent={<EmptyState colors={colors} />}
        renderItem={({ item }) => <ContactTicket contact={item} colors={colors} isDark={isDark} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
      />

      {/* ── ADD MODAL — navigate to bond-create flow ─────────────────── */}
      <AddContactModal
        visible={showAddModal}
        colors={colors}
        isDark={isDark}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 32,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 1,
  },
  addIconBtn: {
    width: 28,
    height: 28,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Count bar
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  countText: {
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: '300',
  },
  countDivider: {
    width: 0.5,
    height: 10,
    borderLeftWidth: 0.5,
  },
  countHint: {
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: '300',
    flex: 1,
  },

  // ── List
  listContent: {
    padding: 16,
    gap: 10,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  // ── Ticket
  ticket: {
    borderWidth: 0.5,
    // No border radius — brutalist raw edges
  },
  ticketTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 52,
    height: 58,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  elementGlyph: {
    fontSize: 10,
    letterSpacing: 1,
  },
  nameColumn: {
    flex: 1,
    gap: 3,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  chineseName: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  metaBadge: {
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '400',
    marginTop: 2,
  },
  scoreBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '100',
    letterSpacing: -1,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
  },
  scorePct: {
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 1,
    marginTop: -4,
    alignSelf: 'flex-end',
  },
  scoreLabel: {
    fontSize: 7,
    letterSpacing: 2.5,
    fontWeight: '300',
    marginTop: 2,
  },

  // ── Perforation
  perforatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 2,
  },
  perforatorDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    flex: 1,
  },

  // ── Ticket bottom
  ticketBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  ticketBottomLeft: {
    flex: 1,
    gap: 2,
  },
  axisLabel: {
    fontSize: 7,
    letterSpacing: 3,
    fontWeight: '300',
  },
  axisValue: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '300',
  },
  ticketBottomRight: {
    alignItems: 'flex-end',
    gap: 1,
  },
  addedLabel: {
    fontSize: 7,
    letterSpacing: 3,
    fontWeight: '300',
  },
  addedValue: {
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: '300',
  },

  // ── Empty
  emptyContainer: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGlyph: {
    fontSize: 28,
    fontWeight: '100',
  },
  emptyTitle: {
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '300',
  },
  emptySubtitle: {
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── Modal
  modalRoot: {
    flex: 1,
  },
  modalScroll: {
    padding: 24,
    gap: 24,
  },
  modalHeader: {
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    gap: 4,
  },
  modalTitle: {
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '300',
  },
  modalSubtitle: {
    fontSize: 10,
    letterSpacing: 2,
  },
  modalClose: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 8,
    letterSpacing: 3,
    fontWeight: '300',
  },
  inputWrapper: {
    borderWidth: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInput: {
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
    padding: 0,
    margin: 0,
  },
  elementPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  elementChip: {
    flex: 1,
    borderWidth: 0.5,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 5,
  },
  elementChipLabel: {
    fontSize: 12,
    fontWeight: '300',
  },
  elementChipName: {
    fontSize: 6,
    letterSpacing: 1.5,
    fontWeight: '300',
  },
  futurePlaceholder: {
    borderWidth: 0.5,
    padding: 16,
  },
  futurePlaceholderText: {
    fontSize: 8.5,
    letterSpacing: 2,
    lineHeight: 16,
    fontWeight: '300',
    textAlign: 'center',
  },
  addButton: {
    borderWidth: 0.5,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '300',
  },
})
