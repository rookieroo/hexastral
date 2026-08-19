import { useTheme } from '@zhop/core-ui'
import { Pressable, Text, View } from 'react-native'

import type { CareNote } from '@/lib/care-notes'

export function CareNotes({
  notes,
  onPressNote,
}: {
  notes: CareNote[]
  onPressNote: (note: CareNote) => void
}) {
  const { colors, spacing } = useTheme()
  if (notes.length === 0) return null

  return (
    <View style={{ gap: spacing.sm }}>
      {notes.map((note) => (
        <Pressable
          key={note.id}
          onPress={() => onPressNote(note)}
          accessibilityRole='button'
          style={{
            borderWidth: 0.5,
            borderColor: colors.separator,
            backgroundColor: colors.card,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            gap: 4,
          }}
        >
          <Text
            style={{
              fontFamily: 'IBMPlexMono',
              color: colors.dim,
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {note.label}
          </Text>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{note.body}</Text>
        </Pressable>
      ))}
    </View>
  )
}
