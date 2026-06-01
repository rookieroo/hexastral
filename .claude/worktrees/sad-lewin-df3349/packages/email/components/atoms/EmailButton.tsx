import { Button } from '@react-email/components'
import type { CSSProperties } from 'react'

/**
 * Email-safe button component with intelligent fallback
 *
 * Smart Rendering Strategy:
 * - Outline buttons → Table-based (Outlook border+padding compatibility)
 * - Full-width buttons → Table-based (Outlook 100% width support)
 * - Solid buttons → React Email native <Button> (lighter, faster)
 *
 * Features:
 * - Automatic Outlook compatibility detection
 * - Solid color background (no gradients - poor email support)
 * - Consistent padding across all email clients
 * - Click tracking via href
 *
 * @example
 * ```tsx
 * // Automatically uses React Email Button (solid + auto-width)
 * <EmailButton href="/sale" variant="primary" size="md">
 *   Shop Now
 * </EmailButton>
 *
 * // Automatically uses Table (outline variant)
 * <EmailButton href="/sale" variant="outline">
 *   Learn More
 * </EmailButton>
 *
 * // Automatically uses Table (full-width)
 * <EmailButton href="/sale" fullWidth>
 *   Continue
 * </EmailButton>
 * ```
 */

export interface EmailButtonProps {
  /**
   * Button link destination
   */
  href: string

  /**
   * Button text
   */
  children: React.ReactNode

  /**
   * Button variant
   *
   * - `primary`: Solid black background (default)
   * - `secondary`: Solid gray background
   * - `outline`: Transparent with border (auto-switches to Table rendering)
   */
  variant?: 'primary' | 'secondary' | 'outline'

  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Full width button (auto-switches to Table rendering for Outlook compatibility)
   */
  fullWidth?: boolean

  /**
   * Alignment (only used in Table mode)
   * @internal
   */
  align?: 'left' | 'center' | 'right'
}

const variantStyles: Record<
  NonNullable<EmailButtonProps['variant']>,
  { bg: string; color: string; border?: string }
> = {
  primary: {
    bg: '#000000',
    color: '#ffffff',
  },
  secondary: {
    bg: '#f3f4f6',
    color: '#111827',
  },
  outline: {
    bg: 'transparent',
    color: '#000000',
    border: '2px solid #000000',
  },
}

const sizeStyles: Record<
  NonNullable<EmailButtonProps['size']>,
  { padding: string; fontSize: string }
> = {
  sm: {
    padding: '8px 16px',
    fontSize: '14px',
  },
  md: {
    padding: '12px 24px',
    fontSize: '16px',
  },
  lg: {
    padding: '16px 32px',
    fontSize: '18px',
  },
}

/**
 * Main EmailButton component with intelligent rendering
 *
 * This is the ONLY component you should use in your Blocks.
 * It automatically chooses the best implementation based on props.
 */
export function EmailButton(props: EmailButtonProps) {
  const { variant = 'primary', fullWidth = false } = props

  /**
   * Decision Logic:
   * 1. Outline variant → MUST use Table (Outlook can't handle border+padding on <a>)
   * 2. Full-width → MUST use Table (Outlook can't make <a> truly 100% width)
   * 3. Otherwise → Use React Email Button (lighter, faster)
   */
  const shouldUseTable = variant === 'outline' || fullWidth

  if (shouldUseTable) {
    return <EmailButtonTable {...props} />
  }

  // Default: Use React Email native Button (solid + auto-width)
  return <EmailButtonNative {...props} />
}

/**
 * React Email native Button implementation
 * Used for: Solid variants (primary/secondary) + Auto-width
 *
 * @internal - Do not use directly, use EmailButton instead
 */
function EmailButtonNative({
  href,
  children,
  variant = 'primary',
  size = 'md',
}: EmailButtonProps) {
  const variantStyle = variantStyles[variant]
  const sizeStyle = sizeStyles[size]

  const buttonStyle: CSSProperties = {
    backgroundColor: variantStyle.bg,
    color: variantStyle.color,
    padding: sizeStyle.padding,
    fontSize: sizeStyle.fontSize,
    fontWeight: '600',
    textDecoration: 'none',
    borderRadius: '6px',
    display: 'inline-block',
    textAlign: 'center',
    lineHeight: '1.5',
    border: variantStyle.border ?? 'none',
    // Prevent text selection highlighting on click
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
  }

  return (
    <Button href={href} style={buttonStyle}>
      {children}
    </Button>
  )
}

/**
 * Table-based button implementation for maximum Outlook compatibility
 * Used for: Outline variant + Full-width buttons
 *
 * Why Table?
 * 1. Outlook (Windows) ignores padding on <a> tags with borders
 * 2. Outlook can't make <a> tags truly 100% width
 * 3. <td> padding and width are reliably rendered
 *
 * @internal - Do not use directly, use EmailButton instead
 */
function EmailButtonTable({
  href,
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  align = 'center',
}: EmailButtonProps) {
  const variantStyle = variantStyles[variant]
  const sizeStyle = sizeStyles[size]

  // Split padding: vertical for <td>, horizontal for <a>
  // This ensures Outlook respects the button height
  const [py, px] = sizeStyle.padding.split(' ')

  return (
    <table
      width={fullWidth ? '100%' : undefined}
      cellPadding="0"
      cellSpacing="0"
      role="presentation"
      style={{
        margin:
          align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0',
      }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              backgroundColor: variantStyle.bg,
              borderRadius: '6px',
              border: variantStyle.border ?? 'none',
              // Critical: Outlook respects padding on <td>, not <a>
              paddingTop: py,
              paddingBottom: py,
              paddingLeft: px, // 给 TD 加一点 padding 防止文字贴边
              paddingRight: px,
            }}
          >
            <a
              href={href}
              style={{
                color: variantStyle.color,
                fontSize: sizeStyle.fontSize,
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
                // 链接本身不需要 padding 了，或者只保留一点点
                // 重要的是确保它是 block 级别的
                width: fullWidth ? '100%' : 'auto',
                cursor: 'pointer',
              }}
            >
              {/* 防止 Outlook 链接颜色变蓝/带下划线 */}
              <span style={{ color: variantStyle.color }}>{children}</span>
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
