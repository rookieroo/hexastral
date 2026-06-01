/**
 * 新手引导 — 东方水墨极简顺序流
 *
 * 步骤:
 *   HERO       → 透视网格 + 星球 Logo + GET STARTED   (始终深空黑)
 *   BIRTHDATE  → 出生日期 (日期选择器)
 *   BIRTHTIME  → 出生时辰 (十二地支鼓轮)
 *   GENDER     → 性别 (两个大按钮)
 *   BIRTHCITY  → 出生城市 (文本输入 + 实时搜索)
 *   AUTH       → Apple 登录 / 访客
 *   NOTIFY     → 推送通知权限
 *   BRIDGE     → 个性化命盘预览 + 收尾过渡页               (始终深空黑)
 *
 * 设计语言: Ink Brutalism
 *   · Hero / Bridge 步骤保持深空黑 #09090B 背景
 *   · 数据录入步骤跟随系统 Light / Dark 自适应
 *   · 墨色强调 (ink accent) 替代纯冷黑白
 *   · 全大写微字标签, letterSpacing 4-6
 *   · 0.5px 发丝边框, 零圆角
 *   · 标题字重 500-600, 正文 300, 无阴影, 无渐变
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import RNDateTimePicker from '@react-native-community/datetimepicker'
import { useQueryClient } from '@tanstack/react-query'
import { solarToLunar } from '@zhop/astro-core/lunar'
import { getLunarPhase } from '@zhop/hexastral-tokens/lunar'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, Line, Mask } from 'react-native-svg'
import { AuthButtons } from '@/components/auth/AuthButtons'
import { BRAND_PHASE, HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { AndroidDatePicker, DateWheelColumn, WHEEL_H } from '@/components/ui/DateWheelPicker'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { getBirthInfo, saveBirthInfo } from '@/lib/domain/birthInfo'
import { formatShichenLabel } from '@/lib/format'
import type { TranslationKeys } from '@/lib/i18n'

const FATE_GENERATING_KEY = 'fate_generating_at'

import { useI18n } from '@/lib/i18n'
import { storage } from '@/lib/storage'
import { theme, useTheme } from '@/lib/theme'
import { searchCity } from '@/lib/ux/geocode'
import { registerPushToken, requestPushPermission } from '@/lib/ux/pushNotifications'

const ONBOARDING_KEY = 'hexastral_onboarded'

// ─── Step machine ─────────────────────────────────────────────────────────────

type Step =
  | 'birthdate'
  | 'birthtime'
  | 'gender'
  | 'birthcity'
  | 'auth'
  | 'notify'

const STEP_ORDER: Step[] = [
  'birthdate',
  'birthtime',
  'gender',
  'birthcity',
  'auth',
  'notify',
]

// ─── 时辰 (12 Earthly Branch hours) ──────────────────────────────────────────

const SHICHEN = [
  { index: 0, label: '子时', sub: '23:00 – 01:00', branch: '子' },
  { index: 1, label: '丑时', sub: '01:00 – 03:00', branch: '丑' },
  { index: 2, label: '寅时', sub: '03:00 – 05:00', branch: '寅' },
  { index: 3, label: '卯时', sub: '05:00 – 07:00', branch: '卯' },
  { index: 4, label: '辰时', sub: '07:00 – 09:00', branch: '辰' },
  { index: 5, label: '巳时', sub: '09:00 – 11:00', branch: '巳' },
  { index: 6, label: '午时', sub: '11:00 – 13:00', branch: '午' },
  { index: 7, label: '未时', sub: '13:00 – 15:00', branch: '未' },
  { index: 8, label: '申时', sub: '15:00 – 17:00', branch: '申' },
  { index: 9, label: '酉时', sub: '17:00 – 19:00', branch: '酉' },
  { index: 10, label: '戌时', sub: '19:00 – 21:00', branch: '戌' },
  { index: 11, label: '亥时', sub: '21:00 – 23:00', branch: '亥' },
  { index: 12, label: '子时', sub: '23:00 – 01:00', branch: '子' }, // alias for late night
]

// ─── International city database ──────────────────────────────────────────────

interface CityOption {
  name: string
  country: string
  lat: number
  lng: number
  timezone?: string | null
}

const WORLD_CITIES: CityOption[] = [
  // United States
  { name: 'New York', country: 'US', lat: 40.7128, lng: -74.006 },
  { name: 'Los Angeles', country: 'US', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298 },
  { name: 'Houston', country: 'US', lat: 29.7604, lng: -95.3698 },
  { name: 'San Francisco', country: 'US', lat: 37.7749, lng: -122.4194 },
  { name: 'Seattle', country: 'US', lat: 47.6062, lng: -122.3321 },
  { name: 'Miami', country: 'US', lat: 25.7617, lng: -80.1918 },
  { name: 'Boston', country: 'US', lat: 42.3601, lng: -71.0589 },
  { name: 'Denver', country: 'US', lat: 39.7392, lng: -104.9903 },
  { name: 'Atlanta', country: 'US', lat: 33.749, lng: -84.388 },
  { name: 'Dallas', country: 'US', lat: 32.7767, lng: -96.797 },
  { name: 'San Diego', country: 'US', lat: 32.7157, lng: -117.1611 },
  { name: 'Las Vegas', country: 'US', lat: 36.1699, lng: -115.1398 },
  { name: 'Portland', country: 'US', lat: 45.5231, lng: -122.6765 },
  { name: 'Phoenix', country: 'US', lat: 33.4484, lng: -112.074 },
  { name: 'Minneapolis', country: 'US', lat: 44.9778, lng: -93.265 },
  { name: 'San Jose', country: 'US', lat: 37.3382, lng: -121.8863 },
  // Canada
  { name: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832 },
  { name: 'Vancouver', country: 'CA', lat: 49.2827, lng: -123.1207 },
  { name: 'Montreal', country: 'CA', lat: 45.5017, lng: -73.5673 },
  { name: 'Calgary', country: 'CA', lat: 51.0447, lng: -114.0719 },
  { name: 'Ottawa', country: 'CA', lat: 45.4215, lng: -75.6972 },
  // UK
  { name: 'London', country: 'GB', lat: 51.5074, lng: -0.1278 },
  { name: 'Manchester', country: 'GB', lat: 53.4808, lng: -2.2426 },
  { name: 'Edinburgh', country: 'GB', lat: 55.9533, lng: -3.1883 },
  // Europe
  { name: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin', country: 'DE', lat: 52.52, lng: 13.405 },
  { name: 'Munich', country: 'DE', lat: 48.1351, lng: 11.582 },
  { name: 'Amsterdam', country: 'NL', lat: 52.3676, lng: 4.9041 },
  { name: 'Madrid', country: 'ES', lat: 40.4168, lng: -3.7038 },
  { name: 'Barcelona', country: 'ES', lat: 41.3851, lng: 2.1734 },
  { name: 'Rome', country: 'IT', lat: 41.9028, lng: 12.4964 },
  { name: 'Milan', country: 'IT', lat: 45.4642, lng: 9.19 },
  { name: 'Zürich', country: 'CH', lat: 47.3769, lng: 8.5417 },
  { name: 'Vienna', country: 'AT', lat: 48.2082, lng: 16.3738 },
  { name: 'Stockholm', country: 'SE', lat: 59.3293, lng: 18.0686 },
  { name: 'Oslo', country: 'NO', lat: 59.9139, lng: 10.7522 },
  { name: 'Copenhagen', country: 'DK', lat: 55.6761, lng: 12.5683 },
  { name: 'Helsinki', country: 'FI', lat: 60.1699, lng: 24.9384 },
  { name: 'Dublin', country: 'IE', lat: 53.3498, lng: -6.2603 },
  { name: 'Prague', country: 'CZ', lat: 50.0755, lng: 14.4378 },
  { name: 'Warsaw', country: 'PL', lat: 52.2297, lng: 21.0122 },
  { name: 'Lisbon', country: 'PT', lat: 38.7169, lng: -9.1395 },
  { name: 'Brussels', country: 'BE', lat: 50.8503, lng: 4.3517 },
  { name: 'Athens', country: 'GR', lat: 37.9838, lng: 23.7275 },
  { name: 'Budapest', country: 'HU', lat: 47.4979, lng: 19.0402 },
  { name: 'Moscow', country: 'RU', lat: 55.7558, lng: 37.6176 },
  { name: 'Istanbul', country: 'TR', lat: 41.0082, lng: 28.9784 },
  // East Asia
  { name: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503 },
  { name: 'Osaka', country: 'JP', lat: 34.6937, lng: 135.5023 },
  { name: 'Kyoto', country: 'JP', lat: 35.0116, lng: 135.7681 },
  { name: 'Seoul', country: 'KR', lat: 37.5665, lng: 126.978 },
  { name: 'Busan', country: 'KR', lat: 35.1796, lng: 129.0756 },
  { name: 'Hong Kong', country: 'HK', lat: 22.3193, lng: 114.1694 },
  { name: 'Taipei', country: 'TW', lat: 25.033, lng: 121.5654 },
  { name: 'Macau', country: 'MO', lat: 22.1987, lng: 113.5439 },
  // Southeast Asia
  { name: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198 },
  { name: 'Bangkok', country: 'TH', lat: 13.7563, lng: 100.5018 },
  { name: 'Kuala Lumpur', country: 'MY', lat: 3.139, lng: 101.6869 },
  { name: 'Jakarta', country: 'ID', lat: -6.2088, lng: 106.8456 },
  { name: 'Manila', country: 'PH', lat: 14.5995, lng: 120.9842 },
  { name: 'Ho Chi Minh City', country: 'VN', lat: 10.8231, lng: 106.6297 },
  { name: 'Hanoi', country: 'VN', lat: 21.0285, lng: 105.8542 },
  { name: 'Chiang Mai', country: 'TH', lat: 18.7061, lng: 98.9817 },
  { name: 'Danang', country: 'VN', lat: 16.0544, lng: 108.2022 },
  { name: 'Phnom Penh', country: 'KH', lat: 11.5564, lng: 104.9282 },
  { name: 'Yangon', country: 'MM', lat: 16.8661, lng: 96.1951 },
  { name: 'Vientiane', country: 'LA', lat: 17.9757, lng: 102.6331 },
  { name: 'Surabaya', country: 'ID', lat: -7.2575, lng: 112.7521 },
  { name: 'Penang', country: 'MY', lat: 5.4164, lng: 100.3327 },
  // Taiwan
  { name: 'Kaohsiung', country: 'TW', lat: 22.6273, lng: 120.3014 },
  { name: 'Taichung', country: 'TW', lat: 24.1477, lng: 120.6736 },
  { name: 'Tainan', country: 'TW', lat: 22.9998, lng: 120.227 },
  { name: '台北', country: 'TW', lat: 25.033, lng: 121.5654 },
  { name: '高雄', country: 'TW', lat: 22.6273, lng: 120.3014 },
  { name: '台中', country: 'TW', lat: 24.1477, lng: 120.6736 },
  { name: '台南', country: 'TW', lat: 22.9998, lng: 120.227 },
  // Chinese Mainland
  { name: '北京', country: 'CN', lat: 39.9042, lng: 116.4074 },
  { name: '上海', country: 'CN', lat: 31.2304, lng: 121.4737 },
  { name: '广州', country: 'CN', lat: 23.1291, lng: 113.2644 },
  { name: '深圳', country: 'CN', lat: 22.5431, lng: 114.0579 },
  { name: '成都', country: 'CN', lat: 30.5728, lng: 104.0668 },
  { name: '重庆', country: 'CN', lat: 29.563, lng: 106.5516 },
  { name: '杭州', country: 'CN', lat: 30.2741, lng: 120.1551 },
  { name: '武汉', country: 'CN', lat: 30.5928, lng: 114.3055 },
  { name: '西安', country: 'CN', lat: 34.3416, lng: 108.9398 },
  { name: '南京', country: 'CN', lat: 32.0603, lng: 118.7969 },
  { name: '天津', country: 'CN', lat: 39.3434, lng: 117.3616 },
  { name: '苏州', country: 'CN', lat: 31.2989, lng: 120.5853 },
  { name: '长沙', country: 'CN', lat: 28.2282, lng: 112.9388 },
  { name: '郑州', country: 'CN', lat: 34.7466, lng: 113.6254 },
  { name: '青岛', country: 'CN', lat: 36.0671, lng: 120.3826 },
  { name: '厦门', country: 'CN', lat: 24.4798, lng: 118.0894 },
  { name: '哈尔滨', country: 'CN', lat: 45.8038, lng: 126.5349 },
  { name: '昆明', country: 'CN', lat: 25.0389, lng: 102.7183 },
  { name: '大连', country: 'CN', lat: 38.914, lng: 121.6147 },
  { name: '宁波', country: 'CN', lat: 29.8683, lng: 121.544 },
  { name: '沈阳', country: 'CN', lat: 41.8057, lng: 123.4315 },
  { name: '合肥', country: 'CN', lat: 31.8639, lng: 117.2808 },
  { name: '济南', country: 'CN', lat: 36.6512, lng: 117.1201 },
  { name: '贵阳', country: 'CN', lat: 26.647, lng: 106.6302 },
  { name: '南宁', country: 'CN', lat: 22.817, lng: 108.3665 },
  { name: '南昌', country: 'CN', lat: 28.682, lng: 115.8579 },
  { name: '福州', country: 'CN', lat: 26.0745, lng: 119.2965 },
  { name: '太原', country: 'CN', lat: 37.8706, lng: 112.5489 },
  { name: '石家庄', country: 'CN', lat: 38.0428, lng: 114.5149 },
  { name: '无锡', country: 'CN', lat: 31.4912, lng: 120.3119 },
  { name: '长春', country: 'CN', lat: 43.8171, lng: 125.3235 },
  { name: '兰州', country: 'CN', lat: 36.0617, lng: 103.8318 },
  { name: '海口', country: 'CN', lat: 20.0442, lng: 110.3201 },
  { name: '三亚', country: 'CN', lat: 18.2533, lng: 109.5119 },
  { name: '乌鲁木齐', country: 'CN', lat: 43.8256, lng: 87.6168 },
  { name: '拉萨', country: 'CN', lat: 29.65, lng: 91.1 },
  { name: '呼和浩特', country: 'CN', lat: 40.8424, lng: 111.7493 },
  { name: '温州', country: 'CN', lat: 28.0, lng: 120.672 },
  { name: '佛山', country: 'CN', lat: 23.0219, lng: 113.1215 },
  { name: '东莞', country: 'CN', lat: 23.0207, lng: 113.7518 },
  { name: '珠海', country: 'CN', lat: 22.2711, lng: 113.5767 },
  { name: '香港', country: 'HK', lat: 22.3193, lng: 114.1694 },
  { name: '澳门', country: 'MO', lat: 22.1987, lng: 113.5439 },
  { name: '新加坡', country: 'SG', lat: 1.3521, lng: 103.8198 },
  { name: '曼谷', country: 'TH', lat: 13.7563, lng: 100.5018 },
  { name: '吉隆坡', country: 'MY', lat: 3.139, lng: 101.6869 },
  { name: '雅加达', country: 'ID', lat: -6.2088, lng: 106.8456 },
  { name: '马尼拉', country: 'PH', lat: 14.5995, lng: 120.9842 },
  { name: '胡志明市', country: 'VN', lat: 10.8231, lng: 106.6297 },
  { name: '河内', country: 'VN', lat: 21.0285, lng: 105.8542 },
  { name: '金边', country: 'KH', lat: 11.5564, lng: 104.9282 },
  { name: '仰光', country: 'MM', lat: 16.8661, lng: 96.1951 },
  // South Asia
  { name: 'Mumbai', country: 'IN', lat: 19.076, lng: 72.8777 },
  { name: 'New Delhi', country: 'IN', lat: 28.6139, lng: 77.209 },
  { name: 'Bangalore', country: 'IN', lat: 12.9716, lng: 77.5946 },
  { name: 'Colombo', country: 'LK', lat: 6.9271, lng: 79.8612 },
  // Middle East
  { name: 'Dubai', country: 'AE', lat: 25.2048, lng: 55.2708 },
  { name: 'Abu Dhabi', country: 'AE', lat: 24.4539, lng: 54.3773 },
  { name: 'Riyadh', country: 'SA', lat: 24.7136, lng: 46.6753 },
  { name: 'Tel Aviv', country: 'IL', lat: 32.0853, lng: 34.7818 },
  // Oceania
  { name: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', country: 'AU', lat: -37.8136, lng: 144.9631 },
  { name: 'Brisbane', country: 'AU', lat: -27.4705, lng: 153.026 },
  { name: 'Auckland', country: 'NZ', lat: -36.8485, lng: 174.7633 },
  // Latin America
  { name: 'São Paulo', country: 'BR', lat: -23.5505, lng: -46.6333 },
  { name: 'Rio de Janeiro', country: 'BR', lat: -22.9068, lng: -43.1729 },
  { name: 'Buenos Aires', country: 'AR', lat: -34.6037, lng: -58.3816 },
  { name: 'Mexico City', country: 'MX', lat: 19.4326, lng: -99.1332 },
  { name: 'Bogotá', country: 'CO', lat: 4.711, lng: -74.0721 },
  { name: 'Lima', country: 'PE', lat: -12.0464, lng: -77.0428 },
  { name: 'Santiago', country: 'CL', lat: -33.4489, lng: -70.6693 },
  // Africa
  { name: 'Cairo', country: 'EG', lat: 30.0444, lng: 31.2357 },
  { name: 'Lagos', country: 'NG', lat: 6.5244, lng: 3.3792 },
  { name: 'Johannesburg', country: 'ZA', lat: -26.2041, lng: 28.0473 },
  { name: 'Nairobi', country: 'KE', lat: -1.2921, lng: 36.8219 },
  { name: 'Casablanca', country: 'MA', lat: 33.5731, lng: -7.5898 },
]

// ─── Colour tokens (always dark regardless of system setting) ─────────────────

const C = {
  bg: '#09090B',
  surface: '#18181B',
  text: '#FAFAFA',
  muted: '#A1A1AA',
  border: '#3F3F46',
  primary: '#FAFAFA',
  white: '#FFFFFF',
} as const

const DARK_STEPS = new Set<Step>([])

// ─── Natal / Ganzhi helpers ──────────────────────────────────────────────────

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

function yearGanZhiInfo(year: number) {
  const idx = (((year - 4) % 60) + 60) % 60
  return {
    gan: TIAN_GAN[idx % 10],
    zhi: DI_ZHI[idx % 12],
    animal: SHENGXIAO[idx % 12],
  }
}

// ─── Celestial sphere background ──────────────────────────────────────────────
// Armillary-sphere-inspired: concentric rings + 8 compass lines + star field
// Adapts to light and dark mode.

function CelestialBackground({
  width,
  height,
  isDark,
}: {
  width: number
  height: number
  isDark: boolean
}) {
  const cx = width / 2
  const cy = height * 0.45
  const lc = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(30,20,50,0.07)'
  const lcFaint = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(30,20,50,0.03)'
  const accent = isDark ? 'rgba(155,89,182,0.18)' : 'rgba(100,60,140,0.12)'
  const sw = 0.5
  const diag = Math.sqrt(width * width + height * height)

  // 8 compass directions (cardinal + ordinal)
  const compassAngles = [0, 45, 90, 135, 180, 225, 270, 315].map((d) => (d * Math.PI) / 180)

  // Concentric rings — radii expand from innermost to screen-spanning
  const ringRadii = [0.06, 0.14, 0.24, 0.36, 0.5, 0.66, 0.84].map(
    (r) => r * Math.max(width, height)
  )

  // Fixed star-dot positions (relative to screen w/h)
  const STARS: [number, number][] = [
    [0.1, 0.07],
    [0.87, 0.12],
    [0.22, 0.28],
    [0.76, 0.19],
    [0.04, 0.52],
    [0.93, 0.45],
    [0.33, 0.71],
    [0.64, 0.76],
    [0.17, 0.88],
    [0.83, 0.92],
    [0.48, 0.1],
    [0.56, 0.6],
    [0.02, 0.35],
    [0.96, 0.68],
    [0.61, 0.04],
    [0.39, 0.95],
    [0.72, 0.37],
    [0.29, 0.47],
    [0.51, 0.82],
    [0.08, 0.73],
  ]

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFillObject} pointerEvents='none'>
      {/* Compass lines from center outward */}
      {compassAngles.map((angle, i) => (
        <Line
          key={`c${i}`}
          x1={cx}
          y1={cy}
          x2={cx + Math.cos(angle) * diag}
          y2={cy + Math.sin(angle) * diag}
          stroke={i % 2 === 0 ? lc : lcFaint}
          strokeWidth={sw}
        />
      ))}
      {/* Concentric rings — accent on mid ring */}
      {ringRadii.map((r, i) => (
        <Circle
          key={`r${i}`}
          cx={cx}
          cy={cy}
          r={r}
          fill='none'
          stroke={i === 3 ? accent : lc}
          strokeWidth={i === 3 ? 0.8 : sw}
        />
      ))}
      {/* Star field */}
      {STARS.map(([rx, ry], i) => (
        <Circle key={`s${i}`} cx={rx * width} cy={ry * height} r={0.9} fill={lc} />
      ))}
    </Svg>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function StepProgress({ step, dark }: { step: Step; dark: boolean }) {
  const { colors } = useTheme()
  const T = dark ? theme.dark : colors
  const idx = STEP_ORDER.indexOf(step)
  const pct = idx / (STEP_ORDER.length - 1)
  return (
    <View style={[ob.progressTrack, { backgroundColor: T.border }]}>
      <View
        style={[
          ob.progressFill,
          { width: `${Math.round(pct * 100)}%`, backgroundColor: T.primary },
        ]}
      />
    </View>
  )
}

// ─── Brutalist CTA button ─────────────────────────────────────────────────────

/**
 * dark=true  → thin border + accent-coloured text (dark steps)
 * dark=false → solid #0F0F0F fill + cream text (light steps, Co-Star style)
 */
function CTAButton({
  label,
  onPress,
  disabled,
  accent,
  dark = true,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  accent?: string
  dark?: boolean
}) {
  if (!dark) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[ob.ctaLight, disabled && { opacity: 0.35 }]}
      >
        <Text style={ob.ctaLightLabel}>{label}</Text>
      </TouchableOpacity>
    )
  }
  const borderColor = accent ?? C.primary
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.65}
      style={[ob.cta, { borderColor }, disabled && ob.ctaDisabled]}
    >
      <Text style={[ob.ctaLabel, { color: disabled ? C.muted : borderColor }]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ─── Skip / ghost link ───────────────────────────────────────────────────────

function SkipLink({
  onPress,
  label = 'SKIP',
  dark = true,
}: {
  onPress: () => void
  label?: string
  dark?: boolean
}) {
  return (
    <TouchableOpacity onPress={onPress} style={ob.skipLink} hitSlop={10}>
      <Text style={[ob.skipText, !dark && ob.skipTextLight]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ─── Step: HERO ───────────────────────────────────────────────────────────────
// Follows system light / dark mode.
// Brand title is locale-aware (璇玑 for CJK, HEXASTRAL for western) — no bilingual mixing.

function HeroStep({
  width,
  height,
  onNext,
}: {
  width: number
  height: number
  onNext: () => void
}) {
  const { t } = useI18n()
  const { colors, isDark } = useTheme()

  // Moon logo: light-side colour adapts so it reads on both backgrounds
  // const logoLightColor = isDark ? '#C8C0E8' : '#5C3D8F'

  return (
    <View style={{ flex: 1 }}>
      <CelestialBackground width={width} height={height} isDark={isDark} />

      {/* Editorial stack — left-aligned */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 32,
          paddingTop: height * 0.1,
          justifyContent: 'flex-start',
        }}
      >
        <HexastralPlanetLogo size={88} phase={BRAND_PHASE} strokeWidth={0.5} />
        <View style={{ marginTop: 36, gap: 10 }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: 44,
              fontWeight: '100',
              color: colors.text,
              letterSpacing: 6,
              lineHeight: 52,
            }}
          >
            {t('ob_hero_brand')}
          </Text>
          <View
            style={{
              height: 0.5,
              backgroundColor: colors.border,
              width: 40,
              marginVertical: 16,
            }}
          />
          <Text
            style={{
              fontSize: 9,
              color: colors.textSecondary,
              letterSpacing: 2.5,
              lineHeight: 16,
              fontWeight: '300',
            }}
          >
            {t('ob_hero_tagline')}
          </Text>
        </View>
      </View>

      {/* CTA at bottom */}
      <View style={ob.heroBottom}>
        <CTAButton
          label={t('ob_hero_cta')}
          onPress={onNext}
          dark={isDark}
          accent={colors.primary}
        />
        <Text style={[ob.heroDisclaimer, { color: `${colors.textSecondary}88` }]}>
          {t('ob_hero_disclaimer')}
        </Text>
      </View>
    </View>
  )
}

// ─── Calendar picker background (solar / lunar ambience) ─────────────────────

function _CalendarPickerBackground({
  bgAnim,
  width,
  height,
  tintColor,
}: {
  bgAnim: Animated.Value
  width: number
  height: number
  tintColor: string
}) {
  if (width === 0 || height === 0) return null

  const r = Math.min(width, height)

  // Shared ray angles for both modes
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (deg * Math.PI) / 180)

  // ── Solar geometry ──────────────────────────────────────────────
  const sx = width * 0.5
  const sy = height * 0.44
  const sr = r * 0.1
  const rayLen = sr * 1.8

  // ── 日月同辉 geometry ───────────────────────────────────────────
  const sx2 = width * 0.72
  const sy2 = height * 0.28
  const sr2 = r * 0.085
  const rayLen2 = sr2 * 1.6
  const mx = width * 0.24
  const my = height * 0.66
  const mr = r * 0.092
  const mShift = mr * 0.62

  // Cross-fade: solar fades out, lunar fades in
  const solarOpacity = bgAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents='none'>
      {/* ── Solar ── fades out when lunar active */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { opacity: solarOpacity }]}
        pointerEvents='none'
      >
        <Svg
          width={width}
          height={height}
          style={StyleSheet.absoluteFillObject}
          pointerEvents='none'
        >
          <Circle cx={sx} cy={sy} r={sr * 6.0} fill={tintColor} fillOpacity={0.018} />
          <Circle cx={sx} cy={sy} r={sr * 3.5} fill={tintColor} fillOpacity={0.042} />
          <Circle cx={sx} cy={sy} r={sr * 1.8} fill={tintColor} fillOpacity={0.088} />
          {rays.map((a, i) => (
            <Line
              key={i}
              x1={sx + Math.cos(a) * (sr + 4)}
              y1={sy + Math.sin(a) * (sr + 4)}
              x2={sx + Math.cos(a) * (sr + rayLen)}
              y2={sy + Math.sin(a) * (sr + rayLen)}
              stroke={tintColor}
              strokeOpacity={i % 2 === 0 ? 0.18 : 0.09}
              strokeWidth={i % 2 === 0 ? 1.2 : 0.6}
            />
          ))}
          <Circle cx={sx} cy={sy} r={sr} fill={tintColor} fillOpacity={0.32} />
        </Svg>
      </Animated.View>

      {/* ── Lunar (日月同辉) ── fades in when lunar active */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { opacity: bgAnim }]}
        pointerEvents='none'
      >
        <Svg
          width={width}
          height={height}
          style={StyleSheet.absoluteFillObject}
          pointerEvents='none'
        >
          {/* Sun upper-right */}
          <Circle cx={sx2} cy={sy2} r={sr2 * 5.5} fill={tintColor} fillOpacity={0.015} />
          <Circle cx={sx2} cy={sy2} r={sr2 * 3.0} fill={tintColor} fillOpacity={0.035} />
          <Circle cx={sx2} cy={sy2} r={sr2 * 1.7} fill={tintColor} fillOpacity={0.07} />
          {rays.map((a, i) => (
            <Line
              key={i}
              x1={sx2 + Math.cos(a) * (sr2 + 3)}
              y1={sy2 + Math.sin(a) * (sr2 + 3)}
              x2={sx2 + Math.cos(a) * (sr2 + rayLen2)}
              y2={sy2 + Math.sin(a) * (sr2 + rayLen2)}
              stroke={tintColor}
              strokeOpacity={i % 2 === 0 ? 0.14 : 0.07}
              strokeWidth={i % 2 === 0 ? 1.0 : 0.5}
            />
          ))}
          <Circle cx={sx2} cy={sy2} r={sr2} fill={tintColor} fillOpacity={0.26} />
          {/* Crescent lower-left */}
          <Circle cx={mx} cy={my} r={mr * 5.0} fill={tintColor} fillOpacity={0.015} />
          <Circle cx={mx} cy={my} r={mr * 3.0} fill={tintColor} fillOpacity={0.035} />
          <Circle cx={mx} cy={my} r={mr * 1.8} fill={tintColor} fillOpacity={0.068} />
          <Defs>
            <Mask id='crescent'>
              <Circle cx={mx} cy={my} r={mr} fill='white' />
              <Circle cx={mx + mShift} cy={my - mShift * 0.25} r={mr * 0.8} fill='black' />
            </Mask>
          </Defs>
          <Circle
            cx={mx}
            cy={my}
            r={mr}
            fill={tintColor}
            fillOpacity={0.36}
            mask='url(#crescent)'
          />
        </Svg>
      </Animated.View>
    </View>
  )
}

// ─── Step: BIRTHDATE ──────────────────────────────────────────────────────────

function getLocalizedLunarText(
  ld: ReturnType<typeof solarToLunar>,
  t: (k: TranslationKeys) => string
) {
  const animalIdx = ((((ld.year - 4) % 60) + 60) % 60) % 12
  const animal = t(`ob_animal_${animalIdx}` as TranslationKeys)
  const fmt = t((ld.isLeap ? 'ob_lunar_fmt_leap' : 'ob_lunar_fmt') as TranslationKeys)
  return fmt
    .replace('{year}', String(ld.year))
    .replace('{ganZhi}', ld.yearGanZhi ?? '')
    .replace('{animal}', animal)
    .replace('{monthName}', ld.monthName ?? String(ld.month))
    .replace('{dayName}', ld.dayName ?? String(ld.day))
    .replace('{month}', String(ld.month))
    .replace('{day}', String(ld.day))
}

function BirthDateStep({
  onNext,
  birthDate,
  setBirthDate,
  showLunar,
  setShowLunar,
}: {
  onNext: () => void
  birthDate: Date
  setBirthDate: (d: Date) => void
  showLunar: boolean
  setShowLunar: (v: boolean) => void
}) {
  const { t, locale } = useI18n()
  const { colors, isDark } = useTheme()

  // CJK locales use Year/Month/Day order; western locales use Month/Day/Year
  const columnOrder =
    locale.startsWith('zh') || locale.startsWith('ja') || locale.startsWith('ko')
      ? ('ymd' as const)
      : ('mdy' as const)

  const lunarAnnotation = useMemo(() => {
    try {
      const ld = solarToLunar(
        birthDate.getFullYear(),
        birthDate.getMonth() + 1,
        birthDate.getDate()
      )
      return getLocalizedLunarText(ld, t)
    } catch {
      return null
    }
  }, [birthDate, t])

  return (
    <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
      <View style={ob.stepHeader}>
        <Text style={[ob.stepQuestion, { color: colors.text }]}>{t('ob_birthdate_q')}</Text>
        <Text style={[ob.stepHint, { color: colors.textSecondary }]}>{t('ob_birthdate_hint')}</Text>
      </View>

      {/* Solar / Lunar text-tab toggle */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 32,
          paddingBottom: showLunar && lunarAnnotation ? 2 : 12,
          gap: 20,
        }}
      >
        {(['solar', 'lunar'] as const).map((mode) => {
          const active = (showLunar ? 'lunar' : 'solar') === mode
          return (
            <Pressable
              key={mode}
              onPress={() => setShowLunar(mode === 'lunar')}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}
            >
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontWeight: active ? '500' : '300',
                  color: active ? colors.text : colors.textSecondary,
                }}
              >
                {mode === 'solar'
                  ? t('settings_birth_calendar_solar' as TranslationKeys)
                  : t('settings_birth_calendar_lunar' as TranslationKeys)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Lunar annotation — only shown when lunar mode is active */}
      {showLunar && lunarAnnotation ? (
        <View style={{ paddingHorizontal: 32, paddingBottom: 10 }}>
          <Text style={{ fontSize: 11, letterSpacing: 0.2, color: colors.textSecondary }}>
            {lunarAnnotation}
          </Text>
        </View>
      ) : null}

      <View style={[ob.pickerBox, { borderColor: colors.border }]}>
        {Platform.OS === 'android' ? (
          <AndroidDatePicker
            value={birthDate}
            onChange={setBirthDate}
            minimumDate={new Date('1900-01-01')}
            maximumDate={new Date()}
            textColor={colors.text}
            dimColor={colors.textSecondary}
            borderColor={colors.border}
            columnOrder={columnOrder}
          />
        ) : (
          <RNDateTimePicker
            value={birthDate}
            mode='date'
            display='spinner'
            onChange={(_, date) => date && setBirthDate(date)}
            maximumDate={new Date()}
            minimumDate={new Date('1900-01-01')}
            textColor={colors.text}
            style={{ flex: 1 }}
          />
        )}
      </View>

      <View style={[ob.stepFooter, { paddingTop: 24 }]}>
        <CTAButton label={t('ob_continue')} onPress={onNext} dark={isDark} />
      </View>
    </View>
  )
}

// ─── Step: BIRTHTIME ─────────────────────────────────────────────────────────

function BirthTimeStep({
  onNext,
  timeIndex,
  setTimeIndex,
}: {
  onNext: () => void
  timeIndex: number | null
  setTimeIndex: (i: number) => void
}) {
  const { t, locale } = useI18n()
  const { colors, isDark } = useTheme()

  const shichenIndices = useMemo(() => Array.from({ length: 12 }, (_, i) => i), [])

  return (
    <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
      <View style={ob.stepHeader}>
        <Text style={[ob.stepQuestion, { color: colors.text }]}>{t('ob_birthtime_q')}</Text>
        <Text style={[ob.stepHint, { color: colors.textSecondary }]}>{t('ob_birthtime_hint')}</Text>
      </View>

      {/* 时辰 wheel — centered single column */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View
          style={[
            ob.pickerBox,
            { borderColor: colors.border, width: 260, flex: 0, height: WHEEL_H },
          ]}
        >
          <DateWheelColumn
            data={shichenIndices}
            selectedIndex={timeIndex}
            onSelect={(idx) => {
              setTimeIndex(idx)
              Haptics.selectionAsync()
            }}
            formatLabel={(v) => {
              const s = SHICHEN[v]
              const label = formatShichenLabel(v, locale)
              return `${s?.sub ?? ''}  ${label}`
            }}
            textColor={colors.text}
            dimColor={colors.textSecondary}
            borderColor={colors.border}
          />
        </View>
      </View>

      <View style={ob.stepFooter}>
        <CTAButton
          label={t('ob_continue')}
          onPress={onNext}
          disabled={timeIndex === null}
          dark={isDark}
        />
        <SkipLink onPress={onNext} label={t('ob_time_unknown')} dark={isDark} />
      </View>
    </View>
  )
}

// ─── Step: GENDER ──────────────────────────────────────────────────────────────

function GenderStep({
  onNext,
  gender,
  setGender,
}: {
  onNext: () => void
  gender: '男' | '女' | null
  setGender: (g: '男' | '女') => void
}) {
  const { t } = useI18n()
  const { colors, isDark } = useTheme()

  const opts: Array<{
    value: '男' | '女'
    labelKey: TranslationKeys
    trigram: string
  }> = [
    { value: '男', labelKey: 'ob_gender_male', trigram: '☰' },
    { value: '女', labelKey: 'ob_gender_female', trigram: '☷' },
  ]

  return (
    <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
      <View style={ob.stepHeader}>
        <Text style={[ob.stepQuestion, { color: colors.text }]}>{t('ob_gender_q')}</Text>
        <Text style={[ob.stepHint, { color: colors.textSecondary }]}>{t('ob_gender_hint')}</Text>
      </View>

      <View style={ob.genderList}>
        {opts.map(({ value, labelKey, trigram }) => {
          const sel = gender === value
          return (
            <TouchableOpacity
              key={value}
              onPress={() => {
                setGender(value)
                Haptics.selectionAsync()
              }}
              activeOpacity={0.7}
              style={[
                ob.genderCard,
                { borderColor: sel ? colors.primary : colors.border },
                sel && { backgroundColor: `${colors.primary}10` },
              ]}
            >
              {/* Trigram symbol: ☰ Qian (male) / ☷ Kun (female) */}
              <Text
                style={{
                  fontSize: 36,
                  color: sel ? colors.primary : colors.textSecondary,
                  marginBottom: 8,
                  lineHeight: 44,
                }}
              >
                {trigram}
              </Text>
              <Text style={[ob.genderLabel, { color: sel ? colors.text : colors.textSecondary }]}>
                {t(labelKey)}
              </Text>
              <View
                style={[
                  ob.genderRadio,
                  { borderColor: sel ? colors.primary : colors.border },
                  sel && { backgroundColor: colors.primary },
                ]}
              />
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={ob.stepFooter}>
        <CTAButton
          label={t('ob_continue')}
          onPress={onNext}
          disabled={gender === null}
          dark={isDark}
        />
      </View>
    </View>
  )
}

// ─── Step: NAME ───────────────────────────────────────────────────────────────

function NameStep({
  onNext,
  displayName,
  setDisplayName,
}: {
  onNext: () => void
  displayName: string
  setDisplayName: (v: string) => void
}) {
  const { t } = useI18n()
  const { colors, isDark } = useTheme()

  const trimmed = displayName.trim()

  return (
    <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
      <View style={ob.stepHeader}>
        <Text style={[ob.stepQuestion, { color: colors.text }]}>{t('ob_name_q')}</Text>
        <Text style={[ob.stepHint, { color: colors.textSecondary }]}>{t('ob_name_hint')}</Text>
      </View>

      <View style={{ paddingHorizontal: 28, gap: 8 }}>
        <TextInput
          value={displayName}
          onChangeText={(v) => setDisplayName(v.slice(0, 24))}
          placeholder={t('ob_name_placeholder')}
          placeholderTextColor={`${colors.textSecondary}99`}
          autoCapitalize='words'
          autoCorrect={false}
          maxLength={24}
          returnKeyType='done'
          onSubmitEditing={onNext}
          style={{
            borderWidth: 0.5,
            borderColor: colors.border,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 18,
            fontWeight: '300',
            color: colors.text,
            letterSpacing: 1,
          }}
        />
        <Text
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: colors.textSecondary,
            fontWeight: '300',
            textAlign: 'right',
          }}
        >
          {trimmed.length}/24
        </Text>
      </View>

      <View style={ob.stepFooter}>
        <CTAButton label={t('ob_continue')} onPress={onNext} dark={isDark} />
      </View>
    </View>
  )
}

// ─── Step: BIRTHCITY ──────────────────────────────────────────────────────────

function BirthCityStep({
  onNext,
  selectedCity,
  setSelectedCity,
}: {
  onNext: () => void
  selectedCity: CityOption | null
  setSelectedCity: (c: CityOption | null) => void
}) {
  const { t } = useI18n()
  const { colors, isDark } = useTheme()
  const [query, setQuery] = useState(selectedCity?.name ?? '')
  const [results, setResults] = useState<CityOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const liveSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text)
      setSelectedCity(null)

      if (liveSearchTimer.current) clearTimeout(liveSearchTimer.current)

      if (text.trim().length < 1) {
        setResults([])
        setIsSearching(false)
        return
      }

      const q = text.toLowerCase()

      // 1. Instant local match from static bundle
      const local = WORLD_CITIES.filter(
        (c) => c.name.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q)
      )
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
          const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
          return aStarts - bStarts || a.name.localeCompare(b.name)
        })
        .slice(0, 7)

      setResults(local)

      // 2. Live fallback via hexastral-api → svc-geocode when local returns < 3 hits
      if (text.trim().length >= 2 && local.length < 3) {
        setIsSearching(true)
        liveSearchTimer.current = setTimeout(async () => {
          try {
            const geocoded = await searchCity(text.trim(), 'zh-CN', 7)
            const live: CityOption[] = geocoded.map((g) => ({
              name: g.name,
              country: g.countryCode,
              lat: g.lat,
              lng: g.lon,
              timezone: g.timezone,
            }))
            // Merge: local results first (if any), then live, deduplicate by name
            const seen = new Set(local.map((c) => c.name.toLowerCase()))
            const merged = [...local, ...live.filter((c) => !seen.has(c.name.toLowerCase()))].slice(
              0,
              7
            )
            setResults(merged)
          } catch (e) {
            if (__DEV__) console.warn('[onboarding] city search live failed:', e)
          } finally {
            setIsSearching(false)
          }
        }, 350)
      }
    },
    [setSelectedCity]
  )

  const handleSelect = useCallback(
    (city: CityOption) => {
      setQuery(city.name)
      setSelectedCity(city)
      setResults([])
      Haptics.selectionAsync()
    },
    [setSelectedCity]
  )

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
        <View style={ob.stepHeader}>
          <Text style={[ob.stepQuestion, { color: colors.text }]}>{t('ob_city_q')}</Text>
          <Text style={[ob.stepHint, { color: colors.textSecondary }]}>{t('ob_city_hint')}</Text>
        </View>

        {/* Search input */}
        <View
          style={[
            ob.citySearchBox,
            {
              borderBottomColor: selectedCity ? colors.primary : colors.border,
            },
          ]}
        >
          <TextInput
            value={query}
            onChangeText={handleSearch}
            placeholder={t('ob_city_search_ph')}
            placeholderTextColor={`${colors.textSecondary}88`}
            style={[ob.citySearchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize='words'
            returnKeyType='search'
          />
          {selectedCity && <Text style={[ob.citySelectedBadge, { color: colors.primary }]}>✓</Text>}
          {isSearching && !selectedCity && (
            <Text style={[ob.citySelectedBadge, { color: colors.textSecondary }]}>…</Text>
          )}
        </View>

        {/* Results list */}
        {results.length > 0 && (
          <View style={[ob.cityResultsWrap, { borderColor: colors.border }]}>
            {results.map((city, idx) => (
              <TouchableOpacity
                key={`${city.name}-${city.country}-${idx}`}
                onPress={() => handleSelect(city)}
                style={[ob.cityResultRow, { borderBottomColor: colors.border }]}
                activeOpacity={0.65}
              >
                <Text style={[ob.cityResultName, { color: colors.text }]}>{city.name}</Text>
                <Text style={[ob.cityResultCountry, { color: colors.textSecondary }]}>
                  {city.country}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {query.length > 1 && !selectedCity && results.length === 0 && !isSearching && (
          <Text style={[ob.cityNoResults, { color: `${colors.textSecondary}88` }]}>
            {t('ob_city_no_results')}
          </Text>
        )}

        <View style={ob.stepFooter}>
          <Text style={[ob.cityNote, { color: `${colors.textSecondary}BB` }]}>
            {t('ob_city_note')}
          </Text>
          <CTAButton
            label={t('ob_continue')}
            onPress={onNext}
            disabled={!selectedCity}
            dark={isDark}
          />
          <SkipLink onPress={onNext} label={t('ob_city_skip')} dark={isDark} />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Step: BRIDGE ─────────────────────────────────────────────────────────────

function BridgeStep({
  onNext,
  width,
  birthDate,
  timeIndex: tIdx,
  previewData,
  previewLoading,
}: {
  onNext: () => void
  width: number
  birthDate: Date
  timeIndex: number | null
  previewData?: {
    personalityBullets: [string, string, string]
    fateTease: string
    warning: string
  } | null
  previewLoading?: boolean
}) {
  const { t } = useI18n()
  const yearIdx = (((birthDate.getFullYear() - 4) % 60) + 60) % 60
  const { gan, zhi } = yearGanZhiInfo(yearIdx)
  const animalIdx = yearIdx % 12
  const animalKey = `ob_animal_${animalIdx}` as TranslationKeys
  const timeKey = `ob_time_${Math.max(0, Math.min(11, tIdx ?? 6))}` as TranslationKeys
  const moonPhase = getLunarPhase(birthDate.getTime())

  // Use personalized preset bullets; skeleton bars while still loading with no data
  const hasBullets = !!previewData?.personalityBullets
  const bullets: [string, string, string] = previewData?.personalityBullets ?? [
    t('ob_bridge_line1'),
    t('ob_bridge_line2'),
    t('ob_bridge_line3'),
  ]

  return (
    <View style={[ob.stepWrap, { paddingTop: 0, overflow: 'hidden' }]}>
      {/* Giant sphere — cropped at top like Co-Star’s glowing sun */}
      <View style={ob.bridgeSphereWrap}>
        <HexastralPlanetLogo
          size={width * 0.88}
          lightColor='#D4D4D8'
          darkColor='#27272A'
          phase={moonPhase}
          strokeColor='rgba(255,255,255,0.08)'
        />
      </View>

      {/* Computed placements — the “☉ Pisces ☽ Pisces ↑ Libra” moment */}
      <Text style={ob.bridgePlacements}>
        {`${gan}${zhi}  ·  ${t(animalKey)}  ·  ${t(timeKey)}`}
      </Text>

      {/* Personality bullets — personalized preset; skeleton bars while loading */}
      {previewLoading && !hasBullets ? (
        <View style={[ob.bridgePersonality, { opacity: 0.25 }]}>
          {([32, 22, 28] as const).map((w, i) => (
            <View
              key={i}
              style={{ width: `${w}%`, height: 14, backgroundColor: C.muted, borderRadius: 2 }}
            />
          ))}
        </View>
      ) : (
        <View style={ob.bridgePersonality}>
          {bullets.map((line, i) => (
            <Text key={i} style={ob.bridgePersonalityLine}>
              {line}
            </Text>
          ))}
        </View>
      )}

      {/* Credibility footer */}
      <Text style={ob.bridgeCred}>{t('ob_bridge_cred')}</Text>

      <View style={ob.stepFooter}>
        <CTAButton label={t('ob_continue')} onPress={onNext} accent={C.white} />
      </View>
    </View>
  )
}

// ─── Step: AUTH ───────────────────────────────────────────────────────────────

function AuthStep({
  onApple,
  onGoogle,
  onGuest,
  appleAvailable,
  loadingType,
}: {
  onApple: () => void
  onGoogle: () => void
  onGuest: () => void
  appleAvailable: boolean
  loadingType: 'apple' | 'google' | 'guest' | null
}) {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()

  const ios = {
    text: isDark ? '#FAFAFA' : '#09090B',
    secondary: isDark ? '#A1A1AA' : '#71717A',
  }

  return (
    <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
      {/* Branding — centered vertically in the upper area */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingBottom: 24,
        }}
      >
        <HexastralPlanetLogo size={72} phase={BRAND_PHASE} withBackground />
        <Text
          style={{
            fontSize: 22,
            fontWeight: '500',
            color: ios.text,
            textAlign: 'center',
            marginTop: 28,
            lineHeight: 30,
          }}
        >
          {t('ob_auth_q')}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '300',
            color: ios.secondary,
            textAlign: 'center',
            marginTop: 10,
          }}
        >
          {t('ob_auth_hint')}
        </Text>
      </View>

      {/* Buttons pinned to bottom */}
      <View style={ob.stepFooter}>
        <AuthButtons
          onApple={onApple}
          onGoogle={onGoogle}
          onGuest={onGuest}
          loadingType={loadingType}
          appleAvailable={appleAvailable}
          showBranding={false}
        />
      </View>
    </View>
  )
}

// ─── Step: NOTIFY ─────────────────────────────────────────────────────────────

function NotifyStep({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  const { t } = useI18n()
  const { colors, isDark } = useTheme()
  return (
    <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
      <View style={[ob.stepHeader, { paddingBottom: 20 }]}>
        <Text style={[ob.notifyHeading, { color: colors.text }]}>{t('ob_notify_q')}</Text>
        <Text
          style={[
            ob.stepHint,
            {
              color: colors.textSecondary,
              marginTop: 10,
              letterSpacing: 0,
              fontSize: 13,
              fontWeight: '300',
            },
          ]}
        >
          {t('ob_notify_hint')}
        </Text>
      </View>

      {/* Notification card previews — iOS lockscreen style */}
      <View style={ob.notifyMockWrap}>
        <View
          style={[
            ob.notifyMockCard,
            {
              backgroundColor: isDark ? '#18181B' : '#FFFFFF',
              borderWidth: isDark ? 0 : 0.5,
              borderColor: isDark ? undefined : colors.border,
            },
          ]}
        >
          <View style={ob.notifyMockRow}>
            <View
              style={[
                ob.notifyMockIcon,
                { backgroundColor: isDark ? '#27272A' : '#E4E4E7', borderRadius: 8 },
              ]}
            >
              <HexastralPlanetLogo size={26} phase={BRAND_PHASE} />
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 2,
                }}
              >
                <Text style={[ob.notifyMockAppName, { color: isDark ? '#E4E4E7' : '#333333' }]}>
                  {t('app_name')}
                </Text>
                <Text style={[ob.notifyMockTime, { color: isDark ? '#71717A' : '#AAAAAA' }]}>
                  {t('ob_notify_now')}
                </Text>
              </View>
              <Text style={[ob.notifyMockTitle, { color: isDark ? '#FAFAFA' : '#111111' }]}>
                {t('ob_notify_daily_title')}
              </Text>
              <Text style={[ob.notifyMockBody, { color: isDark ? '#A1A1AA' : '#555555' }]}>
                {t('ob_notify_daily_body')}
              </Text>
            </View>
          </View>
        </View>
        <View
          style={[
            ob.notifyMockCard,
            {
              marginTop: 8,
              opacity: 0.65,
              backgroundColor: isDark ? '#18181B' : '#FFFFFF',
              borderWidth: isDark ? 0 : 0.5,
              borderColor: isDark ? undefined : colors.border,
            },
          ]}
        >
          <View style={ob.notifyMockRow}>
            <View
              style={[
                ob.notifyMockIcon,
                { backgroundColor: isDark ? '#27272A' : '#E4E4E7', borderRadius: 8 },
              ]}
            >
              <HexastralPlanetLogo size={26} phase={BRAND_PHASE} />
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 2,
                }}
              >
                <Text style={[ob.notifyMockAppName, { color: isDark ? '#E4E4E7' : '#333333' }]}>
                  {t('app_name')}
                </Text>
                <Text style={[ob.notifyMockTime, { color: isDark ? '#71717A' : '#AAAAAA' }]}>
                  {t('ob_notify_yesterday')}
                </Text>
              </View>
              <Text style={[ob.notifyMockBody, { color: isDark ? '#A1A1AA' : '#555555' }]}>
                {t('ob_notify_friend_body')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={ob.stepFooter}>
        <CTAButton label={t('ob_notify_cta')} onPress={onAllow} dark={isDark} />
        <SkipLink onPress={onSkip} label={t('ob_notify_skip')} dark={isDark} />
      </View>
    </View>
  )
}

// ─── Helpers held outside component scope ────────────────────────────────────

/** Check if onboarding has been completed */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY)
  return value === 'true'
}

/** Mark onboarding as complete programmatically (e.g., DDL bypass) */
export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { signInWithApple, signInWithGoogle, signInAsGuest, userId } = useAuth()
  const { width, height } = useWindowDimensions()
  const _insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const { locale, t } = useI18n()

  // ── Step state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('birthdate')
  const fadeAnim = useRef(new Animated.Value(1)).current

  // ── Birth info form state ───────────────────────────────────────────────
  const [birthDate, setBirthDate] = useState(new Date(1984, 0, 1))
  const [timeIndex, setTimeIndex] = useState<number | null>(null)
  const [gender, setGender] = useState<'男' | '女' | null>(null)
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar')
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null)
  const [displayName, setDisplayName] = useState<string>('')

  // ── Auth state ─────────────────────────────────────────────────────────
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [authLoading, setAuthLoading] = useState<'apple' | 'google' | 'guest' | null>(null)

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable)
  }, [])

  // ── Animated step transition ────────────────────────────────────────────
  const goTo = useCallback((next: Step) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Avoid dropping opacity to 0 to prevent flashing blank/black
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setStep(next)
  }, [])

  const advance = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step)
    const next = STEP_ORDER[idx + 1]
    if (next) goTo(next)
  }, [step, goTo])

  // Back navigation — allowed from all middle steps except hero and bridge
  const BACK_ALLOWED = new Set<Step>(['birthdate', 'birthtime', 'gender', 'birthcity'])
  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step)
    const prev = STEP_ORDER[idx - 1]
    if (prev) goTo(prev)
  }, [step, goTo])
  const canGoBack = BACK_ALLOWED.has(step)

  // ── Save birth info before bridge + fire preview prefetch ─────────────
  const handleAuthEntry = useCallback(async () => {
    const y = birthDate.getFullYear()
    const m = birthDate.getMonth() + 1
    const d = birthDate.getDate()
    await saveBirthInfo({
      solarDate: `${y}-${m}-${d}`,
      birthYear: String(y),
      timeIndex: timeIndex ?? undefined,
      gender: gender ?? '男',
      calendarType,
      birthCity: selectedCity?.name,
      latitude: selectedCity?.lat,
      longitude: selectedCity?.lng,
      timezoneId: selectedCity?.timezone ?? undefined,
      displayName: displayName.trim() || undefined,
    })
    goTo('auth')
  }, [birthDate, timeIndex, gender, displayName, calendarType, selectedCity, goTo])

  // ── Background chart + signal generation ────────────────────────────────
  // Fire after auth so the natal chart (which persists static traits used by
  // /signal/today and /report) is computed before the user reaches the Fate
  // tab. Then call /onboarding/reveal to lazily generate today's signal.
  // Fire-and-forget: errors are swallowed — Fate tab auto-fetches as fallback.
  const fireBackgroundFate = useCallback(
    async (userId: string) => {
      try {
        const info = await getBirthInfo()
        if (!info.solarDate || info.timeIndex == null) return

        // Sync birth info to server BEFORE chart generation so users.birth_*
        // columns are populated. Previously fire-and-forget silently dropped
        // writes (HMAC race / network blip) and left users with chart cache
        // but NULL birth_solar_date — breaking re-install hydration.
        try {
          const putResp = await apiClient.api.user[':userId']['birth-info'].$put({
            param: { userId },
            json: {
              birthSolarDate: info.solarDate,
              birthTimeIndex: info.timeIndex,
              birthGender: (info.gender ?? '男') as '男' | '女',
              birthCity: info.birthCity,
              birthLongitude: info.longitude != null ? String(info.longitude) : undefined,
              birthLatitude: info.latitude != null ? String(info.latitude) : undefined,
              birthTimezoneId: info.timezoneId ?? undefined,
              name: info.displayName?.trim() || undefined,
            },
          })
          if (!putResp.ok && __DEV__) {
            console.warn('[Onboarding] birth-info PUT failed', putResp.status, await putResp.text())
          }
        } catch (err) {
          if (__DEV__) console.warn('[Onboarding] birth-info PUT threw', err)
        }

        storage.set(FATE_GENERATING_KEY, String(Date.now()))

        // Atomic bootstrap — derives & writes static traits + ziwei main star,
        // builds chart skeleton (LLM-free), then generates today's first signal.
        // Idempotent server-side. Failures here are non-fatal because both the
        // signal/today route and users.GET self-heal will recover on next read.
        try {
          const resp = await apiClient.api.onboarding.bootstrap.$post({
            json: { explanationMode: 'plain' },
          })
          if (!resp.ok && __DEV__) {
            const body = await resp.text()
            console.warn('[Onboarding] bootstrap failed', resp.status, body)
          }
        } catch (err) {
          if (__DEV__) console.warn('[Onboarding] bootstrap threw (non-fatal):', err)
        }

        // Bust signal cache so Fate tab fetches fresh data
        qc.invalidateQueries({ queryKey: ['signal'] })
        qc.invalidateQueries({ queryKey: ['user', userId] })
      } catch (err) {
        if (__DEV__) console.warn('[Onboarding] Background fate failed (Fate tab will retry):', err)
      } finally {
        storage.remove(FATE_GENERATING_KEY)
      }
    },
    [locale, qc]
  )

  // ── Auth handlers ───────────────────────────────────────────────────────
  const handleApple = useCallback(async () => {
    setAuthLoading('apple')
    let success = false
    try {
      success = await signInWithApple()
    } catch (e: any) {
      Alert.alert(t('sys_error') || 'Error', e.message || 'Failed to sign in with Apple.')
    } finally {
      setAuthLoading(null)
    }
    if (success) {
      const uid = userId // userId is set synchronously by signInWithApple via SecureStore
      if (uid && !uid.startsWith('guest_')) fireBackgroundFate(uid)
      goTo('notify')
    }
  }, [signInWithApple, goTo, t, userId, fireBackgroundFate])

  const handleGoogle = useCallback(async () => {
    setAuthLoading('google')
    let success = false
    try {
      success = await signInWithGoogle()
    } catch (e: any) {
      Alert.alert(t('sys_error') || 'Error', e.message || 'Failed to sign in with Google.')
    } finally {
      setAuthLoading(null)
    }
    if (success) {
      const uid = userId
      if (uid && !uid.startsWith('guest_')) fireBackgroundFate(uid)
      goTo('notify')
    }
  }, [signInWithGoogle, goTo, t, userId, fireBackgroundFate])

  const handleGuest = useCallback(async () => {
    setAuthLoading('guest')
    let success = false
    try {
      success = await signInAsGuest()
    } catch (e: any) {
      Alert.alert(t('sys_error') || 'Error', e.message || 'Failed to continue as guest.')
    } finally {
      setAuthLoading(null)
    }
    if (success) goTo('notify')
  }, [signInAsGuest, goTo, t])

  // ── Notifications ───────────────────────────────────────────────────────
  const handleNotify = useCallback(async () => {
    const status = await requestPushPermission().catch(() => 'denied' as const)
    if (status === 'granted' && userId) {
      registerPushToken(userId, locale).catch(() => {
        /* token registration failed, non-blocking */
      })
    }
    await markOnboardingComplete()
    router.replace('/(tabs)')
  }, [userId, locale, router])

  // ── Finish ──────────────────────────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    await markOnboardingComplete()
    // Fate generation is handled by the auto-trigger in the Fate tab (index.tsx).
    // Firing it here concurrently caused a race condition that showed "分析失败".
    router.replace('/(tabs)')
  }, [router])

  // ── Render ─────────────────────────────────────────────────────────────
  const isDarkBg = DARK_STEPS.has(step)

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDarkBg ? theme.dark.background : colors.background,
      }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 28 }}>
          {canGoBack ? (
            <Pressable onPress={goBack} hitSlop={10} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
              <ChevronLeft size={20} color={isDarkBg ? C.muted : colors.textSecondary} strokeWidth={1.5} />
            </Pressable>
          ) : (
            <View style={{ width: 52 }} />
          )}
          <View style={{ flex: 1 }}>
            <StepProgress step={step} dark={isDarkBg} />
          </View>
          <View style={{ width: 52 }} />
        </View>

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {step === 'birthdate' && (
            <BirthDateStep
              onNext={advance}
              birthDate={birthDate}
              setBirthDate={setBirthDate}
              showLunar={calendarType === 'lunar'}
              setShowLunar={(v) => setCalendarType(v ? 'lunar' : 'solar')}
            />
          )}
          {step === 'birthtime' && (
            <BirthTimeStep onNext={advance} timeIndex={timeIndex} setTimeIndex={setTimeIndex} />
          )}
          {step === 'gender' && (
            <GenderStep onNext={advance} gender={gender} setGender={setGender} />
          )}
          {step === 'birthcity' && (
            <BirthCityStep
              onNext={handleAuthEntry}
              selectedCity={selectedCity}
              setSelectedCity={setSelectedCity}
            />
          )}
          {step === 'auth' && (
            <AuthStep
              onApple={handleApple}
              onGoogle={handleGoogle}
              onGuest={handleGuest}
              appleAvailable={appleAvailable}
              loadingType={authLoading}
            />
          )}
          {step === 'notify' && <NotifyStep onAllow={handleNotify} onSkip={() => void handleFinish()} />}
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────

const ob = StyleSheet.create({
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
  heroCardWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  heroCard: {
    borderWidth: 0.5,
    borderColor: C.border,
    paddingHorizontal: 32,
    paddingVertical: 36,
    alignItems: 'center',
    width: '100%',
    gap: 6,
  },
  heroLogoRing: {
    marginBottom: 16,
  },
  heroAppName: {
    fontSize: 32,
    fontWeight: '100',
    color: C.text,
    letterSpacing: 8,
  },
  heroAppLatin: {
    fontSize: 10,
    fontWeight: '300',
    color: C.muted,
    letterSpacing: 6,
  },
  heroDivider: {
    height: 0.5,
    backgroundColor: C.border,
    width: '60%',
    marginVertical: 16,
  },
  heroTagline: {
    fontSize: 9,
    letterSpacing: 2.5,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '300',
  },
  heroBottom: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    gap: 14,
  },
  heroDisclaimer: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: `${C.muted}88`,
    textAlign: 'center',
    fontWeight: '300',
  },

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
  bridgeTextWrap: {
    paddingHorizontal: 36,
    gap: 0,
    flex: 1,
  },
  bridgeLabel: {
    fontSize: 8,
    letterSpacing: 4,
    color: C.muted,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 20,
  },
  bridgeParagraph: {
    fontSize: 13,
    fontWeight: '200',
    color: C.text,
    lineHeight: 22,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  bridgeDivider: {
    height: 0.5,
    backgroundColor: C.border,
    marginVertical: 20,
  },

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
  socialList: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    gap: 1,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  socialAvatar: {
    width: 36,
    height: 36,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialAvatarGlyph: {
    fontSize: 14,
    fontWeight: '200',
  },
  socialName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '200',
    color: C.text,
    letterSpacing: 0.5,
  },
  socialScore: {
    fontSize: 20,
    fontWeight: '100',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  socialScoreLabel: {
    fontSize: 6.5,
    letterSpacing: 2,
    color: C.muted,
    fontWeight: '300',
  },
  socialNote: {
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  socialNoteText: {
    fontSize: 7.5,
    letterSpacing: 2.5,
    color: `${C.muted}88`,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '300',
  },

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
  bridgeSphereWrap: {
    alignItems: 'center',
    marginTop: -30,
    marginBottom: 0,
  },
  bridgePlacements: {
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 4,
    color: '#8B8B9E',
    fontWeight: '300',
    marginTop: 16,
    marginBottom: 28,
  },
  bridgePersonality: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 36,
    flex: 1,
  },
  bridgePersonalityLine: {
    fontSize: 18,
    fontWeight: '200',
    color: '#F0E6F3',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 26,
  },
  bridgeCred: {
    fontSize: 7,
    letterSpacing: 2.5,
    color: '#8B8B9E',
    textAlign: 'center',
    lineHeight: 13,
    fontWeight: '300',
    paddingHorizontal: 36,
    paddingBottom: 16,
  },

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
  socialPreLabel: {
    fontSize: 9,
    letterSpacing: 4,
    fontWeight: '300',
    color: C.muted,
    marginBottom: 4,
  },
})
