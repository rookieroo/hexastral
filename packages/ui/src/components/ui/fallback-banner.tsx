/**
 * 备用横幅组件
 * 使用统一的 fallback-banner.webp 图片，简洁美观
 */

'use client'

import Image from 'next/image'
import React from 'react'
import { cn } from '@/lib/utils'

interface FallbackBannerProps {
  title: string
  type?: 'blog' | 'docs' | 'system' | 'platform'
  category?: string
  locale?: string
  className?: string
  height?: 'sm' | 'md' | 'lg'
  showTitle?: boolean
}

export function FallbackBanner({
  title,
  type = 'blog',
  category,
  locale = 'en',
  className,
  height = 'md',
  showTitle = false,
}: FallbackBannerProps) {
  // 获取高度类 - 只在没有传入高度相关className时使用默认高度
  const getHeightClass = () => {
    // 如果传入了高度相关的className，不使用默认高度
    if (
      className &&
      (className.includes('h-full') || className.includes('h-') || className.includes('aspect-'))
    ) {
      return ''
    }

    switch (height) {
      case 'sm':
        return 'h-32 md:h-40'
      case 'md':
        return 'h-48 md:h-64'
      case 'lg':
        return 'h-64 md:h-80'
      default:
        return 'h-48 md:h-64'
    }
  }

  return (
    <div className={cn('relative w-full overflow-hidden rounded-lg', getHeightClass(), className)}>
      {/* 背景图片 */}
      <Image
        src='/fallback-banner.webp'
        alt={`Fallback banner for ${title}`}
        fill
        className='object-cover'
        sizes='(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'
        priority={false}
        unoptimized
      />

      {/* 遮罩层 */}
      <div className='absolute inset-0 bg-black/20 dark:bg-black/40' />

      {/* 标题覆盖层（可选） */}
      {showTitle && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='text-center px-6'>
            <h2 className='text-lg md:text-xl font-semibold text-white drop-shadow-lg line-clamp-3'>
              {title}
            </h2>
            {category && (
              <p className='text-sm text-white/80 mt-2 capitalize drop-shadow'>{category}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 预设配置
export const FallbackBannerPresets = {
  blog: {
    height: 'md' as const,
    showTitle: false,
  },
  docs: {
    height: 'md' as const,
    showTitle: false,
  },
  system: {
    height: 'sm' as const,
    showTitle: false,
  },
  card: {
    height: 'sm' as const,
    showTitle: false,
  },
  hero: {
    height: 'lg' as const,
    showTitle: true,
  },
}
