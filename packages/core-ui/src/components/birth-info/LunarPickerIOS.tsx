/**
 * LunarPickerIOS — 农历 entry rendered with the REAL native iOS UIPickerView
 * (`@react-native-picker/picker`), three columns side by side. This is the 1:1
 * native-feel path the custom JS `Wheel` can't match (UIKit's deceleration curve,
 * 3D barrel, and tick). Mirrors how solar entry uses the native DateTimePicker
 * spinner on iOS while Android keeps the custom wheels.
 *
 * DEFENSIVE LOADING: `@react-native-picker/picker` ships a native view that only
 * exists after a prebuild / EAS rebuild that lists the package as a direct app
 * dependency. JS may still resolve (hoisted peer / monorepo) while the binary has
 * no RNCPicker — that renders the red "Unimplemented component: <RNCPicker>" box.
 * We require BOTH the JS module AND a live native view manager, otherwise fall
 * back to `LunarDateWheels`. Android never reaches here (BirthDateField branches
 * on Platform.OS).
 */

import { UIManager, View } from 'react-native'
import { useTheme } from '../../theme'
import { WHEEL_HEIGHT } from '../Wheel'
import { type LunarDateValue, LunarDateWheels, useLunarColumns } from './LunarDateWheels'

// core-ui's tsconfig doesn't pull in the RN/metro ambient globals (unlike the apps'
// expo-env.d.ts), so type the metro `require` we use to optionally load the picker.
// Module-scoped, so it never clashes with a global `require` an app's config provides.
declare const require: (id: string) => unknown

// Optional native dep — resolved once, cached. `require` (not import) so a missing
// module degrades to the custom wheel instead of breaking the bundle (Metro treats a
// try/catch require as an optional dependency).
type PickerModule = { Picker: any }
let pickerMod: PickerModule | null | undefined
function getPickerModule(): PickerModule | null {
  if (pickerMod !== undefined) return pickerMod
  try {
    pickerMod = require('@react-native-picker/picker') as PickerModule
  } catch {
    pickerMod = null
  }
  return pickerMod
}

/** True only when the binary actually linked RNCPicker (not merely JS present). */
function hasNativeRncPicker(): boolean {
  try {
    const ui = UIManager as {
      getViewManagerConfig?: (name: string) => unknown
      hasViewManagerConfig?: (name: string) => boolean
    }
    if (typeof ui.hasViewManagerConfig === 'function') {
      return ui.hasViewManagerConfig('RNCPicker')
    }
    return ui.getViewManagerConfig?.('RNCPicker') != null
  } catch {
    return false
  }
}

export function LunarPickerIOS(props: {
  year: number
  month: number
  day: number
  isLeap: boolean
  accent: string
  onChange: (next: LunarDateValue) => void
}) {
  const { colors } = useTheme()
  const mod = getPickerModule()
  const { year, month, day, isLeap, onChange } = props
  // Hooks run unconditionally (keep the shared leap/clamp behaviour identical) —
  // the early fallback below is decided AFTER, so hook order stays stable.
  const { years, months, days, safeDay, safeLeap } = useLunarColumns(
    { year, month, day, isLeap },
    onChange
  )

  // JS present but native absent → Unimplemented <RNCPicker>; use custom wheels.
  if (!mod?.Picker || !hasNativeRncPicker()) return <LunarDateWheels {...props} />
  const Picker = mod.Picker

  const itemStyle = { color: colors.text, fontSize: 20 }
  const monthKey = `${month}-${safeLeap}`

  return (
    <View
      style={{
        flexDirection: 'row',
        height: WHEEL_HEIGHT,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: colors.separator,
      }}
    >
      <Picker
        style={{ flex: 1 }}
        itemStyle={itemStyle}
        selectedValue={String(year)}
        onValueChange={(v: string) =>
          onChange({ year: Number(v), month, day: safeDay, isLeap: safeLeap })
        }
      >
        {years.map((y) => (
          <Picker.Item key={y} label={`${y}`} value={String(y)} color={colors.text} />
        ))}
      </Picker>
      <Picker
        style={{ flex: 1 }}
        itemStyle={itemStyle}
        selectedValue={monthKey}
        onValueChange={(v: string) => {
          const [mv, leap] = v.split('-')
          onChange({ year, month: Number(mv), day: safeDay, isLeap: leap === 'true' })
        }}
      >
        {months.map((m) => (
          <Picker.Item
            key={`${m.value}-${m.isLeap}`}
            label={m.label}
            value={`${m.value}-${m.isLeap}`}
            color={colors.text}
          />
        ))}
      </Picker>
      <Picker
        style={{ flex: 1 }}
        itemStyle={itemStyle}
        selectedValue={String(safeDay)}
        onValueChange={(v: string) => onChange({ year, month, day: Number(v), isLeap: safeLeap })}
      >
        {days.map((d) => (
          <Picker.Item key={d.value} label={d.label} value={String(d.value)} color={colors.text} />
        ))}
      </Picker>
    </View>
  )
}
