import type { Field } from '@puckeditor/core'
import { MediaField, type MediaFieldProps } from './media-field-client'

export type { MediaFieldProps }

/**
 * Factory function to create a Puck media field config
 *
 * @example
 * ```tsx
 * import { createMediaField } from '@zhop/ui/components/puck/media-field'
 *
 * const fields = {
 *   imageUrl: createMediaField({
 *     label: 'Hero Image',
 *     unsplashAccessKey: env.UNSPLASH_KEY,
 *     giphyApiKey: env.GIPHY_KEY,
 *   })
 * }
 * ```
 */
export function createMediaField(
  config: Omit<MediaFieldProps, 'value' | 'onChange'> & { label?: string }
): Field<string> {
  const { label, ...fieldProps } = config

  return {
    type: 'custom',
    label: label || 'Media',
    render: ({ value, onChange, id }) => (
      <MediaField value={value} onChange={onChange} id={id} {...fieldProps} />
    ),
  }
}
