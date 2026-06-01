/**
 * 响应式图片组件 - 支持自动生成不同尺寸和格式
 * 功能：
 * 1. 自动生成 srcset 和 sizes
 * 2. 支持 WebP/AVIF 格式优化
 * 3. 懒加载和 IntersectionObserver
 * 4. SEO 优化（alt、schema.org）
 * 5. 热门/冷门图片策略
 * 6. 媒体代理URL支持
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'

// These utilities should be provided by the consuming app
// or imported directly if available
const isExternalUrl = (url: string) => /^https?:\/\//.test(url)
const getOptimizedImageUrl = (...args: any[]) => args[0] as string // Fallback
const generateResponsiveSrcSet = (...args: any[]) => '' // Fallback

// 预定义的响应式断点和尺寸 - 标准分档宽度体系
export const RESPONSIVE_BREAKPOINTS = [
  { width: 320, suffix: 'mobile' },
  { width: 480, suffix: 'mobile-md' },
  { width: 640, suffix: 'mobile-lg' },
  { width: 768, suffix: 'tablet' },
  { width: 1024, suffix: 'desktop' },
  { width: 1280, suffix: 'desktop-lg' },
  { width: 1536, suffix: 'desktop-xl' },
  { width: 1920, suffix: 'desktop-2xl' },
]

const IMAGE_FORMATS = ['avif', 'webp', 'jpeg'] as const

interface ResponsiveImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean // 高优先级图片不懒加载
  quality?: number
  sizes?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'

  // SEO 相关
  title?: string
  caption?: string
  schema?: 'article' | 'product' | 'person' | 'organization'

  // 热门/冷门策略
  popularity?: 'hot' | 'warm' | 'cold'

  // 懒加载配置
  lazyLoad?: boolean
  threshold?: number // IntersectionObserver 阈值
  rootMargin?: string

  // 媒体代理参数
  workspaceId?: string
  pageId?: string
  filename?: string

  // 回调函数
  onLoad?: () => void
  onError?: () => void
  onInView?: () => void
}

/**
 * 响应式图片组件
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  width = 800,
  height,
  className,
  priority = false,
  quality = 80,
  sizes = '(max-width: 480px) 100vw, (max-width: 768px) 80vw, (max-width: 1024px) 50vw, 33vw',
  objectFit = 'contain',
  title,
  caption,
  schema,
  popularity = 'warm',
  lazyLoad = true,
  threshold = 0.1,
  rootMargin = '50px',
  workspaceId,
  pageId,
  filename,
  onLoad,
  onError,
  onInView,
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(!lazyLoad || priority)
  const [hasError, setHasError] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  // 生成响应式 srcset
  const generateSrcSet = (baseUrl: string, format: (typeof IMAGE_FORMATS)[number] = 'webp') => {
    // 如果是外部 URL，直接返回
    if (isExternalUrl(baseUrl)) {
      return baseUrl
    }

    // 使用媒体代理生成响应式 srcset
    if (workspaceId && pageId && filename) {
      return generateResponsiveSrcSet(workspaceId, pageId, filename, {
        format,
        quality: popularity === 'hot' ? quality : Math.max(70, quality - 10),
      })
    }

    // 如果 baseUrl 已经是 /media/ 路径，尝试解析workspace信息
    if (baseUrl.startsWith('/media/')) {
      const mediaPathMatch = baseUrl.match(/\/media\/([^\/]+)\/([^\/]+)\/([^\/]+)(?:\?|$)/)
      if (mediaPathMatch) {
        const [, extractedWorkspaceId, extractedPageId, extractedFilename] = mediaPathMatch
        return generateResponsiveSrcSet(extractedWorkspaceId, extractedPageId, extractedFilename, {
          format,
          quality: popularity === 'hot' ? quality : Math.max(70, quality - 10),
        })
      }
    }

    // 回退到原始图片
    return baseUrl
  }

  // 生成单个优化URL
  const generateOptimizedUrl = (baseUrl: string, targetWidth?: number, format?: string) => {
    // 如果是外部 URL，直接返回
    if (isExternalUrl(baseUrl)) {
      return baseUrl
    }

    // 使用媒体代理生成优化URL
    if (workspaceId && pageId && filename) {
      return getOptimizedImageUrl(baseUrl, workspaceId, pageId, filename, {
        width: targetWidth || width,
        format: (format as any) || 'auto',
        quality: popularity === 'hot' ? quality : Math.max(70, quality - 10),
      })
    }

    // 如果 baseUrl 已经是 /media/ 路径，尝试解析并使用代理
    if (baseUrl.startsWith('/media/')) {
      return getOptimizedImageUrl(baseUrl, undefined, undefined, undefined, {
        width: targetWidth || width,
        format: (format as any) || 'auto',
        quality: popularity === 'hot' ? quality : Math.max(70, quality - 10),
      })
    }

    // 回退到原始图片
    return baseUrl
  }

  // IntersectionObserver 懒加载
  useEffect(() => {
    if (!lazyLoad || priority || isInView) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true)
          onInView?.()
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    if (imageRef.current) {
      observer.observe(imageRef.current)
    }

    return () => observer.disconnect()
  }, [lazyLoad, priority, isInView, threshold, rootMargin, onInView])

  // 处理图片加载
  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // 生成不同格式的 source 元素
  const generateSources = () => {
    if (!isInView) return null

    return IMAGE_FORMATS.slice(0, -1).map((format) => {
      const srcSet = generateSrcSet(src, format)
      return <source key={format} srcSet={srcSet} sizes={sizes} type={`image/${format}`} />
    })
  }

  // 生成结构化数据
  const generateStructuredData = () => {
    if (!schema) return null

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      url: src,
      width: width?.toString(),
      height: height?.toString(),
      caption: caption || alt,
    }

    return (
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    )
  }

  // 如果还没有进入视口，显示占位符
  if (!isInView) {
    return (
      <div
        ref={imageRef}
        className={cn('bg-muted/30 animate-pulse relative', className)}
        style={{
          width: '100%',
          aspectRatio: width && height ? `${width} / ${height}` : '3 / 4',
          minHeight: '200px',
          maxHeight: height ? `${height}px` : undefined,
        }}
        aria-label={`Loading image: ${alt}`}
      />
    )
  }

  // 错误状态显示
  if (hasError) {
    return (
      <div
        className={cn(
          'bg-muted/20 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-muted-foreground/20',
          className
        )}
        style={{
          width: '100%',
          aspectRatio: width && height ? `${width} / ${height}` : '3 / 4',
          minHeight: '200px',
          maxHeight: height ? `${height}px` : undefined,
        }}
      >
        <svg
          className='w-12 h-12 mb-2 text-muted-foreground/40'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
        <span className='text-sm'>图片加载失败</span>
      </div>
    )
  }

  // JPEG fallback srcset（确保兼容性）
  const fallbackSrcSet = generateSrcSet(src, 'jpeg')

  return (
    <div
      className='relative overflow-hidden'
      style={{
        aspectRatio: width && height ? `${width} / ${height}` : undefined,
        minHeight: !isLoaded ? '200px' : undefined,
      }}
    >
      {generateStructuredData()}

      {/* 加载中背景 */}
      {!isLoaded && <div className='absolute inset-0 bg-muted/20 animate-pulse' />}

      <picture>
        {generateSources()}

        <img
          ref={imageRef}
          src={isInView ? generateOptimizedUrl(src, width, 'auto') : undefined}
          srcSet={isInView ? fallbackSrcSet : undefined}
          sizes={sizes}
          alt={alt}
          title={title}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding='async'
          className={cn(
            'transition-opacity duration-300 relative z-10',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          style={{
            objectFit,
            width: '100%',
            height: height ? 'auto' : undefined,
          }}
          onLoad={handleLoad}
          onError={handleError}
        />
      </picture>

      {/* {caption && (
        <figcaption className="mt-2 text-sm text-gray-600 text-center">
          {caption}
        </figcaption>
      )} */}
    </div>
  )
}

/**
 * 高性能图片组件 - 用于热门内容
 */
export const HighPerformanceImage: React.FC<ResponsiveImageProps> = (props) => {
  return (
    <ResponsiveImage
      {...props}
      popularity='hot'
      quality={props.quality || 90}
      priority={props.priority || true}
      lazyLoad={false}
    />
  )
}

/**
 * 节约带宽图片组件 - 用于冷门内容
 */
export const BandwidthSaverImage: React.FC<ResponsiveImageProps> = (props) => {
  return (
    <ResponsiveImage
      {...props}
      popularity='cold'
      quality={props.quality || 70}
      lazyLoad={true}
      threshold={0.3} // 更晚加载
    />
  )
}

export default ResponsiveImage
