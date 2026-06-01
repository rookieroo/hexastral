'use client'

import type React from 'react'
import { cn } from '@/lib/utils'

interface SocialIconProps {
  className?: string
  size?: number
  title?: string
}

// 社交平台图标 URL 配置
const socialIconUrls = {
  google: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/google.svg',
  github: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/github.svg',
  notion: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/notion.svg',
  xiaohongshu: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/xiaohongshu.svg',
  devto: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/devdotto.svg',
  hashnode: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/hashnode.svg',
  wordpress: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/wordpress.svg',
  twitter: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/x.svg',
  discord: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/discord.svg',
  bluesky: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/bluesky.svg',
  reddit: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/reddit.svg',
  youtube: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/youtube.svg',
  facebook: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/facebook.svg',
  linkedin: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/linkedin.svg',
  whatsapp: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/whatsapp.svg',
  telegram: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/telegram.svg',
}

// 基础社交图标组件
function SocialIcon({
  platform,
  fallback,
  className,
  size = 24,
  title,
}: {
  platform: keyof typeof socialIconUrls
  fallback: string
  className?: string
  size?: number
  title?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 hover:scale-110',
        className
      )}
      style={{ width: size, height: size }}
      title={title}
    >
      <img
        src={socialIconUrls[platform]}
        alt={title || platform}
        className='w-full h-full object-contain transition-opacity duration-200 opacity-70 hover:opacity-100'
        style={{
          filter:
            'brightness(0) saturate(100%) invert(15%) sepia(0%) saturate(7487%) hue-rotate(183deg) brightness(95%) contrast(84%)',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          const parent = target.parentElement
          if (parent) {
            parent.innerHTML = `
              <span style="
                font-size: ${Math.max(8, size * 0.35)}px;
                font-weight: 600;
                color: oklch(0.205 0 0);
                line-height: 1;
                width: 100%;
                height: 100%;
              ">${fallback}</span>
            `
          }
        }}
      />
    </div>
  )
}

// 自定义SVG图标组件 - 用于内建SVG图标
function CustomSVGIcon({
  svgContent,
  fallback,
  className,
  size = 24,
  title,
}: {
  svgContent: React.ReactNode
  fallback: string
  className?: string
  size?: number
  title?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex justify-center items-center transition-all duration-200 hover:scale-110',
        className
      )}
      style={{ width: size, height: size }}
      title={title}
    >
      <div className='inline-flex justify-center items-center w-full h-full object-contain transition-opacity duration-200 opacity-70 hover:opacity-100'>
        {svgContent}
      </div>
    </div>
  )
}

// Google Icon
export function GoogleIcon({ className, size = 24, title = 'Google' }: SocialIconProps) {
  return (
    <SocialIcon platform='google' fallback='G' className={className} size={size} title={title} />
  )
}

// GitHub Icon
export function GitHubIcon({ className, size = 24, title = 'GitHub' }: SocialIconProps) {
  return (
    <SocialIcon platform='github' fallback='GH' className={className} size={size} title={title} />
  )
}

// Notion Icon
export function NotionIcon({ className, size = 24, title = 'Notion' }: SocialIconProps) {
  return (
    <SocialIcon platform='notion' fallback='N' className={className} size={size} title={title} />
  )
}

// 小红书 (XiaoHongShu) Icon
export function XiaoHongShuIcon({ className, size = 24, title = '小红书' }: SocialIconProps) {
  return (
    <CustomSVGIcon
      svgContent={
        <svg
          width={size}
          height={size}
          viewBox='0 0 24 24'
          fill='currentColor'
          className='w-full h-full'
          style={{
            filter:
              'brightness(0) saturate(100%) invert(15%) sepia(0%) saturate(7487%) hue-rotate(183deg) brightness(95%) contrast(84%)',
          }}
        >
          <title>{title}</title>
          <path
            d='M22.405 9.879c0.002 0.016 0.01 0.02 0.07 0.019h0.725a0.797 0.797 0 0 0 0.78 -0.972 0.794 0.794 0 0 0 -0.884 -0.618 0.795 0.795 0 0 0 -0.692 0.794c0 0.101 -0.002 0.666 0.001 0.777zm-11.509 4.808c-0.203 0.001 -1.353 0.004 -1.685 0.003a2.528 2.528 0 0 1 -0.766 -0.126 0.025 0.025 0 0 0 -0.03 0.014L7.7 16.127a0.025 0.025 0 0 0 0.01 0.032c0.111 0.06 0.336 0.124 0.495 0.124 0.66 0.01 1.32 0.002 1.981 0 0.01 0 0.02 -0.006 0.023 -0.015l0.712 -1.545a0.025 0.025 0 0 0 -0.024 -0.036zM0.477 9.91c-0.071 0 -0.076 0.002 -0.076 0.01a0.834 0.834 0 0 0 -0.01 0.08c-0.027 0.397 -0.038 0.495 -0.234 3.06 -0.012 0.24 -0.034 0.389 -0.135 0.607 -0.026 0.057 -0.033 0.042 0.003 0.112 0.046 0.092 0.681 1.523 0.787 1.74 0.008 0.015 0.011 0.02 0.017 0.02 0.008 0 0.033 -0.026 0.047 -0.044 0.147 -0.187 0.268 -0.391 0.371 -0.606 0.306 -0.635 0.44 -1.325 0.486 -1.706 0.014 -0.11 0.021 -0.22 0.03 -0.33l0.204 -2.616 0.022 -0.293c0.003 -0.029 0 -0.033 -0.03 -0.034zm7.203 3.757a1.427 1.427 0 0 1 -0.135 -0.607c-0.004 -0.084 -0.031 -0.39 -0.235 -3.06a0.443 0.443 0 0 0 -0.01 -0.082c-0.004 -0.011 -0.052 -0.008 -0.076 -0.008h-1.48c-0.03 0.001 -0.034 0.005 -0.03 0.034l0.021 0.293c0.076 0.982 0.153 1.964 0.233 2.946 0.05 0.4 0.186 1.085 0.487 1.706 0.103 0.215 0.223 0.419 0.37 0.606 0.015 0.018 0.037 0.051 0.048 0.049 0.02 -0.003 0.742 -1.642 0.804 -1.765 0.036 -0.07 0.03 -0.055 0.003 -0.112zm3.861 -0.913h-0.872a0.126 0.126 0 0 1 -0.116 -0.178l1.178 -2.625a0.025 0.025 0 0 0 -0.023 -0.035l-1.318 -0.003a0.148 0.148 0 0 1 -0.135 -0.21l0.876 -1.954a0.025 0.025 0 0 0 -0.023 -0.035h-1.56c-0.01 0 -0.02 0.006 -0.024 0.015l-0.926 2.068c-0.085 0.169 -0.314 0.634 -0.399 0.938a0.534 0.534 0 0 0 -0.02 0.191 0.46 0.46 0 0 0 0.23 0.378 0.981 0.981 0 0 0 0.46 0.119h0.59c0.041 0 -0.688 1.482 -0.834 1.972a0.53 0.53 0 0 0 -0.023 0.172 0.465 0.465 0 0 0 0.23 0.398c0.15 0.092 0.342 0.12 0.475 0.12l1.66 -0.001c0.01 0 0.02 -0.006 0.023 -0.015l0.575 -1.28a0.025 0.025 0 0 0 -0.024 -0.035zm-6.93 -4.937H3.1a0.032 0.032 0 0 0 -0.034 0.033c0 1.048 -0.01 2.795 -0.01 6.829 0 0.288 -0.269 0.262 -0.28 0.262h-0.74c-0.04 0.001 -0.044 0.004 -0.04 0.047 0.001 0.037 0.465 1.064 0.555 1.263 0.01 0.02 0.03 0.033 0.051 0.033 0.157 0.003 0.767 0.009 0.938 -0.014 0.153 -0.02 0.3 -0.06 0.438 -0.132 0.3 -0.156 0.49 -0.419 0.595 -0.765 0.052 -0.172 0.075 -0.353 0.075 -0.533 0.002 -2.33 0 -4.66 -0.007 -6.991a0.032 0.032 0 0 0 -0.032 -0.032zm11.784 6.896c0 -0.014 -0.01 -0.021 -0.024 -0.022h-1.465c-0.048 -0.001 -0.049 -0.002 -0.05 -0.049v-4.66c0 -0.072 -0.005 -0.07 0.07 -0.07h0.863c0.08 0 0.075 0.004 0.075 -0.074V8.393c0 -0.082 0.006 -0.076 -0.08 -0.076h-3.5c-0.064 0 -0.075 -0.006 -0.075 0.073v1.445c0 0.083 -0.006 0.077 0.08 0.077h0.854c0.075 0 0.07 -0.004 0.07 0.07v4.624c0 0.095 0.008 0.084 -0.085 0.084 -0.37 0 -1.11 -0.002 -1.304 0 -0.048 0.001 -0.06 0.03 -0.06 0.03l-0.697 1.519s-0.014 0.025 -0.008 0.036c0.006 0.01 0.013 0.008 0.058 0.008 1.748 0.003 3.495 0.002 5.243 0.002 0.03 -0.001 0.034 -0.006 0.035 -0.033v-1.539zm4.177 -3.43c0 0.013 -0.007 0.023 -0.02 0.024 -0.346 0.006 -0.692 0.004 -1.037 0.004 -0.014 -0.002 -0.022 -0.01 -0.022 -0.024 -0.005 -0.434 -0.007 -0.869 -0.01 -1.303 0 -0.072 -0.006 -0.071 0.07 -0.07l0.733 -0.003c0.041 0 0.081 0.002 0.12 0.015 0.093 0.025 0.16 0.107 0.165 0.204 0.006 0.431 0.002 1.153 0.001 1.153zm2.67 0.244a1.953 1.953 0 0 0 -0.883 -0.222h-0.18c-0.04 -0.001 -0.04 -0.003 -0.042 -0.04V10.21c0 -0.132 -0.007 -0.263 -0.025 -0.394a1.823 1.823 0 0 0 -0.153 -0.53 1.533 1.533 0 0 0 -0.677 -0.71 2.167 2.167 0 0 0 -1 -0.258c-0.153 -0.003 -0.567 0 -0.72 0 -0.07 0 -0.068 0.004 -0.068 -0.065V7.76c0 -0.031 -0.01 -0.041 -0.046 -0.039H17.93s-0.016 0 -0.023 0.007c-0.006 0.006 -0.008 0.012 -0.008 0.023v0.546c-0.008 0.036 -0.057 0.015 -0.082 0.022h-0.95c-0.022 0.002 -0.028 0.008 -0.03 0.032v1.481c0 0.09 -0.004 0.082 0.082 0.082h0.913c0.082 0 0.072 0.128 0.072 0.128v1.148s0.003 0.117 -0.06 0.117h-1.482c-0.068 0 -0.06 0.082 -0.06 0.082v1.445s-0.01 0.068 0.064 0.068h1.457c0.082 0 0.076 -0.006 0.076 0.079v3.225c0 0.088 -0.007 0.081 0.082 0.081h1.43c0.09 0 0.082 0.007 0.082 -0.08v-3.27c0 -0.029 0.006 -0.035 0.033 -0.035l2.323 -0.003c0.098 0 0.191 0.02 0.28 0.061a0.46 0.46 0 0 1 0.274 0.407c0.008 0.395 0.003 0.79 0.003 1.185 0 0.259 -0.107 0.367 -0.33 0.367h-1.218c-0.023 0.002 -0.029 0.008 -0.028 0.033 0.184 0.437 0.374 0.871 0.57 1.303a0.045 0.045 0 0 0 0.04 0.026c0.17 0.005 0.34 0.002 0.51 0.003 0.15 -0.002 0.517 0.004 0.666 -0.01a2.03 2.03 0 0 0 0.408 -0.075c0.59 -0.18 0.975 -0.698 0.976 -1.313v-1.981c0 -0.128 -0.01 -0.254 -0.034 -0.38 0 0.078 -0.029 -0.641 -0.724 -0.998z'
            fill='#000000'
            stroke-width='1'
          />
        </svg>
      }
      fallback='小红书'
      className={className}
      size={size}
      title={title}
    />
  )
}

// DEV.to Icon
export function DevToIcon({ className, size = 24, title = 'DEV.to' }: SocialIconProps) {
  return (
    <SocialIcon platform='devto' fallback='DEV' className={className} size={size} title={title} />
  )
}

// Hashnode Icon
export function HashnodeIcon({ className, size = 24, title = 'Hashnode' }: SocialIconProps) {
  return (
    <SocialIcon platform='hashnode' fallback='HN' className={className} size={size} title={title} />
  )
}

// WordPress Icon
export function WordPressIcon({ className, size = 24, title = 'WordPress' }: SocialIconProps) {
  return (
    <SocialIcon
      platform='wordpress'
      fallback='WP'
      className={className}
      size={size}
      title={title}
    />
  )
}

// Twitter (X) Icon
export function TwitterIcon({ className, size = 24, title = 'Twitter / X' }: SocialIconProps) {
  return (
    <SocialIcon platform='twitter' fallback='X' className={className} size={size} title={title} />
  )
}

// Discord Icon
export function DiscordIcon({ className, size = 24, title = 'Discord' }: SocialIconProps) {
  return (
    <SocialIcon platform='discord' fallback='DC' className={className} size={size} title={title} />
  )
}

// Bluesky Icon
export function BlueskyIcon({ className, size = 24, title = 'Bluesky' }: SocialIconProps) {
  return (
    <CustomSVGIcon
      svgContent={
        <svg
          width={size}
          height={size}
          viewBox='0 0 24 24'
          fill='currentColor'
          className='w-full h-full'
          style={{
            filter:
              'brightness(0) saturate(100%) invert(15%) sepia(0%) saturate(7487%) hue-rotate(183deg) brightness(95%) contrast(84%)',
          }}
        >
          <title>{title}</title>
          <path
            d='M11.261222222222221 9.053919444444444c-0.08983333333333333 -0.010888888888888889 -0.18238888888888888 -0.021777777777777778 -0.27222222222222225 -0.035388888888888886 0.09255555555555554 0.010888888888888889 0.18238888888888888 0.024499999999999997 0.27222222222222225 0.035388888888888886ZM8 7.213697222222223c-0.7104999999999999 -1.3801666666666665 -2.6432777777777776 -3.952666666666666 -4.4399444444444445 -5.221222222222222 -1.7231666666666665 -1.2168333333333332 -2.379222222222222 -1.007222222222222 -2.8120555555555553 -0.8112222222222222C0.24983333333333332 1.4071972222222222 0.15999999999999998 2.1721416666666666 0.15999999999999998 2.621308333333333s0.24772222222222218 3.691333333333333 0.40833333333333327 4.233055555555555c0.5308333333333333 1.7884999999999998 2.4255 2.392833333333333 4.170444444444444 2.196833333333333 0.08983333333333333 -0.01361111111111111 0.17966666666666667 -0.024499999999999997 0.27222222222222225 -0.03811111111111111 -0.08983333333333333 0.01361111111111111 -0.17966666666666667 0.02722222222222222 -0.27222222222222225 0.03811111111111111 -2.5561666666666665 0.3811111111111111 -4.826499999999999 1.312111111111111 -1.8483888888888889 4.625055555555556 3.2748333333333335 3.391888888888889 4.486222222222222 -0.7268333333333333 5.109611111111111 -2.8147777777777776 0.6233888888888889 2.087944444444444 1.3393333333333333 6.0569444444444445 5.052444444444444 2.8147777777777776 2.7875555555555556 -2.8147777777777776 0.7649444444444444 -4.246666666666666 -1.791222222222222 -4.625055555555556 -0.08983333333333333 -0.010888888888888889 -0.18238888888888888 -0.021777777777777778 -0.27222222222222225 -0.035388888888888886 0.09255555555555554 0.010888888888888889 0.18238888888888888 0.024499999999999997 0.27222222222222225 0.035388888888888886 1.7449444444444442 0.19327777777777777 3.6368888888888886 -0.4110555555555555 4.170444444444444 -2.196833333333333 0.1606111111111111 -0.5417222222222222 0.40833333333333327 -3.781166666666667 0.40833333333333327 -4.233055555555555s-0.08983333333333333 -1.2168333333333332 -0.588 -1.4400555555555554c-0.4301111111111111 -0.19327777777777777 -1.088888888888889 -0.4056111111111111 -2.809333333333333 0.8112222222222222 -1.799388888888889 1.2685555555555554 -3.7321666666666666 3.8410555555555552 -4.442666666666667 5.221222222222222Z'
            fill='#000000'
            stroke-width='0.0278'
          />
        </svg>
      }
      fallback='Bluesky'
      className={'flex items-center justify-center ' + className}
      size={size}
      title={title}
    />
  )
}

// Reddit Icon
export function RedditIcon({ className, size = 24, title = 'Reddit' }: SocialIconProps) {
  return (
    <SocialIcon platform='reddit' fallback='RD' className={className} size={size} title={title} />
  )
}

// YouTube Icon
export function YouTubeIcon({ className, size = 24, title = 'YouTube' }: SocialIconProps) {
  return (
    <SocialIcon platform='youtube' fallback='YT' className={className} size={size} title={title} />
  )
}

// Facebook Icon
export function FacebookIcon({ className, size = 24, title = 'Facebook' }: SocialIconProps) {
  return (
    <SocialIcon platform='facebook' fallback='FB' className={className} size={size} title={title} />
  )
}

// LinkedIn Icon
export function LinkedInIcon({ className, size = 24, title = 'LinkedIn' }: SocialIconProps) {
  return (
    <SocialIcon platform='linkedin' fallback='LI' className={className} size={size} title={title} />
  )
}

// Telegram Icon
export function TelegramIcon({ className, size = 24, title = 'Telegram' }: SocialIconProps) {
  return (
    <SocialIcon platform='telegram' fallback='TG' className={className} size={size} title={title} />
  )
}

// WhatsApp Icon
export function WhatsAppIcon({ className, size = 24, title = 'WhatsApp' }: SocialIconProps) {
  return (
    <SocialIcon platform='whatsapp' fallback='WA' className={className} size={size} title={title} />
  )
}

// Export all icons as a collection
export const SocialIcons = {
  Google: GoogleIcon,
  GitHub: GitHubIcon,
  Facebook: FacebookIcon,
  Notion: NotionIcon,
  XiaoHongShu: XiaoHongShuIcon,
  DevTo: DevToIcon,
  Hashnode: HashnodeIcon,
  WordPress: WordPressIcon,
  Twitter: TwitterIcon,
  Discord: DiscordIcon,
  Bluesky: BlueskyIcon,
  Reddit: RedditIcon,
  LinkedIn: LinkedInIcon,
  YouTube: YouTubeIcon,
  WhatsApp: WhatsAppIcon,
  Telegram: TelegramIcon,
}
