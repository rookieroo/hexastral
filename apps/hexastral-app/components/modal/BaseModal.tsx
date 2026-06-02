/**
 * BaseModal — shared modal scaffold
 *
 * Provides the Modal + translucent backdrop + positioning.
 * Content container styling (bg, radius, padding) is left to children.
 *
 * position='center'  — floating card, backdrop with horizontal padding
 * position='bottom'  — bottom sheet anchored to screen edge
 */

import type { ReactNode } from 'react'
import { Modal, View } from 'react-native'

interface BaseModalProps {
  visible: boolean
  onDismiss: () => void
  animationType?: 'fade' | 'slide' | 'none'
  /** center: floating card | bottom: anchored to bottom edge */
  position?: 'center' | 'bottom'
  children: ReactNode
}

export function BaseModal({
  visible,
  onDismiss,
  animationType = 'fade',
  position = 'center',
  children,
}: BaseModalProps) {
  const isCenter = position === 'center'
  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: isCenter ? 'center' : 'flex-end',
          alignItems: isCenter ? 'center' : 'stretch',
          padding: isCenter ? 24 : 0,
        }}
      >
        {children}
      </View>
    </Modal>
  )
}
