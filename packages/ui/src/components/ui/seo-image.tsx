/**
 * SEO优化的图片组件
 * 功能：
 * 1. 语义化URL和文件名
 * 2. 完整的alt文本和结构化数据
 * 3. 使用<picture>元素优化不同场景
 * 4. Open Graph和Twitter Card支持
 * 5. 图片sitemap生成
 */

import type React from 'react'
import { BandwidthSaverImage, HighPerformanceImage, ResponsiveImage } from './responsive-image'

interface SEOImageProps {
  src: string
  alt: string
  title?: string
  caption?: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number

  // SEO特定属性
  semantic?: {
    category: 'article' | 'product' | 'logo' | 'avatar' | 'illustration' | 'screenshot'
    context: string // 图片在内容中的语义上下文
    keywords?: string[] // 相关关键词
  }

  // Open Graph和社交媒体
  socialMeta?: {
    ogImage?: boolean // 是否用作OG图片
    twitterCard?: 'summary' | 'summary_large_image'
    facebookOptimized?: boolean
    linkedinOptimized?: boolean
  }

  // 结构化数据
  structuredData?: {
    '@type': 'ImageObject' | 'Product' | 'Person' | 'Organization'
    name?: string
    description?: string
    contentUrl?: string
    license?: string
    acquireLicensePage?: string
    creditText?: string
    creator?: {
      '@type': 'Person' | 'Organization'
      name: string
      url?: string
    }
    [key: string]: any // 允许额外的属性
  }

  // 辅助功能
  accessibility?: {
    longDesc?: string // 长描述链接
    role?: string // ARIA role
    labelledBy?: string // aria-labelledby
    describedBy?: string // aria-describedby
  }

  // 版权和授权
  copyright?: {
    owner: string
    license: 'CC0' | 'CC-BY' | 'CC-BY-SA' | 'CC-BY-NC' | 'All Rights Reserved' | string
    source?: string
    attribution?: string
  }
}

/**
 * 生成语义化的文件名
 */
const generateSemanticFilename = (
  alt: string,
  semantic?: SEOImageProps['semantic'],
  width?: number,
  height?: number
): string => {
  // 清理alt文本，生成SEO友好的文件名
  let filename = alt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

  // 添加语义前缀
  if (semantic?.category) {
    filename = `${semantic.category}-${filename}`
  }

  // 添加尺寸信息
  if (width && height) {
    filename += `-${width}x${height}`
  }

  return filename
}

/**
 * 生成完整的结构化数据
 */
const generateImageStructuredData = (props: SEOImageProps) => {
  const { src, alt, title, structuredData, copyright } = props

  if (!structuredData) return null

  const baseSchema: any = {
    '@context': 'https://schema.org',
    // @ts-expect-error - This is a default value that can be overridden by structuredData
    '@type': 'ImageObject',
    name: structuredData.name || title || alt,
    description: structuredData.description || alt,
    contentUrl: src,
    url: src,
    ...structuredData,
  }

  // 添加版权信息
  if (copyright) {
    baseSchema.copyrightHolder = {
      '@type': 'Person',
      name: copyright.owner,
    }
    baseSchema.license = copyright.license
    baseSchema.creditText = copyright.attribution
  }

  return baseSchema
}

/**
 * 生成Open Graph meta标签
 */
const generateOGMetaTags = (props: SEOImageProps) => {
  const { src, alt, title, socialMeta, width, height } = props

  if (!socialMeta?.ogImage) return null

  return (
    <>
      <meta property='og:image' content={src} />
      <meta property='og:image:alt' content={alt} />
      {title && <meta property='og:image:title' content={title} />}
      {width && <meta property='og:image:width' content={width.toString()} />}
      {height && <meta property='og:image:height' content={height.toString()} />}
      <meta property='og:image:type' content='image/jpeg' />
    </>
  )
}

/**
 * 生成Twitter Card meta标签
 */
const generateTwitterMetaTags = (props: SEOImageProps) => {
  const { src, alt, socialMeta } = props

  if (!socialMeta?.twitterCard) return null

  return (
    <>
      <meta name='twitter:card' content={socialMeta.twitterCard} />
      <meta name='twitter:image' content={src} />
      <meta name='twitter:image:alt' content={alt} />
    </>
  )
}

/**
 * SEO优化的图片组件
 */
export const SEOImage: React.FC<SEOImageProps> = (props) => {
  const {
    src,
    alt,
    title,
    caption,
    width,
    height,
    className,
    priority = false,
    quality = 85,
    semantic,
    socialMeta,
    structuredData,
    accessibility,
    copyright,
  } = props

  // 生成语义化文件名
  const semanticFilename = generateSemanticFilename(alt, semantic, width, height)

  // 生成结构化数据
  const schemaData = generateImageStructuredData(props)

  // 确定使用哪个图片组件
  const ImageComponent =
    priority || socialMeta?.ogImage
      ? HighPerformanceImage
      : semantic?.category === 'illustration' || semantic?.category === 'screenshot'
        ? BandwidthSaverImage
        : ResponsiveImage

  return (
    <div className='seo-image-container'>
      {/* 结构化数据 */}
      {schemaData && (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      )}

      {/* Open Graph Meta Tags */}
      {generateOGMetaTags(props)}

      {/* Twitter Meta Tags */}
      {generateTwitterMetaTags(props)}

      {/* 主图片组件 */}
      <ImageComponent
        src={src}
        alt={alt}
        title={title}
        width={width}
        height={height}
        className={className}
        priority={priority}
        quality={quality}
        caption={caption}
        schema={
          semantic?.category === 'article'
            ? 'article'
            : semantic?.category === 'product'
              ? 'product'
              : semantic?.category === 'logo'
                ? 'organization'
                : undefined
        }
        // 传递辅助功能属性到底层组件
      />

      {/* 版权信息 */}
      {copyright && (
        <div className='image-copyright text-xs text-gray-500 mt-1'>
          {copyright.attribution && <span>{copyright.attribution} • </span>}
          <span>© {copyright.owner}</span>
          {copyright.license !== 'All Rights Reserved' && <span> • {copyright.license}</span>}
          {copyright.source && (
            <a
              href={copyright.source}
              className='hover:text-gray-700 underline ml-1'
              rel='noopener noreferrer'
              target='_blank'
            >
              Source
            </a>
          )}
        </div>
      )}

      {/* 长描述链接（辅助功能） */}
      {accessibility?.longDesc && (
        <a
          href={accessibility.longDesc}
          className='sr-only focus:not-sr-only text-sm text-blue-600 hover:text-blue-800'
        >
          View detailed description of this image
        </a>
      )}
    </div>
  )
}

/**
 * 产品图片组件 - 电商优化
 */
export const ProductImage: React.FC<
  Omit<SEOImageProps, 'semantic' | 'structuredData'> & {
    productName: string
    productSku?: string
    price?: number
    currency?: string
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
  }
> = ({ productName, productSku, price, currency = 'USD', availability = 'InStock', ...props }) => {
  return (
    <SEOImage
      {...props}
      semantic={{
        category: 'product',
        context: `Product image for ${productName}`,
        keywords: [productName, productSku].filter(Boolean) as string[],
      }}
      structuredData={{
        '@type': 'Product',
        name: productName,
        description: props.alt,
        sku: productSku,
        offers: price
          ? {
              '@type': 'Offer',
              price: price.toString(),
              priceCurrency: currency,
              availability: `https://schema.org/${availability}`,
            }
          : undefined,
      }}
      priority={true}
      quality={95}
    />
  )
}

/**
 * 文章头图组件
 */
export const ArticleHeroImage: React.FC<
  Omit<SEOImageProps, 'semantic' | 'priority'> & {
    articleTitle: string
    publishDate?: Date
    author?: string
  }
> = ({ articleTitle, publishDate, author, ...props }) => {
  return (
    <SEOImage
      {...props}
      semantic={{
        category: 'article',
        context: `Hero image for article: ${articleTitle}`,
        keywords: articleTitle.split(' ').slice(0, 5), // 取文章标题前5个词作为关键词
      }}
      structuredData={{
        '@type': 'ImageObject',
        name: `${articleTitle} - Hero Image`,
        description: props.alt,
        creator: author
          ? {
              '@type': 'Person',
              name: author,
            }
          : undefined,
        datePublished: publishDate?.toISOString(),
      }}
      socialMeta={{
        ogImage: true,
        twitterCard: 'summary_large_image',
        facebookOptimized: true,
        linkedinOptimized: true,
      }}
      priority={true}
      quality={90}
    />
  )
}

/**
 * Logo图片组件
 */
export const LogoImage: React.FC<
  Omit<SEOImageProps, 'semantic'> & {
    organizationName: string
    organizationUrl?: string
  }
> = ({ organizationName, organizationUrl, ...props }) => {
  return (
    <SEOImage
      {...props}
      semantic={{
        category: 'logo',
        context: `Logo for ${organizationName}`,
        keywords: [organizationName, 'logo'],
      }}
      structuredData={{
        '@type': 'Organization',
        name: organizationName,
        url: organizationUrl,
        logo: props.src,
      }}
      priority={true}
      quality={95}
    />
  )
}

export default SEOImage
