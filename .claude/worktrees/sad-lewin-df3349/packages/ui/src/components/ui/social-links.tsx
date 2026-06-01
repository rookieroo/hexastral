'use client'

import Link from 'next/link'
import {
  TwitterIcon,
  RedditIcon,
  YouTubeIcon,
  BlueskyIcon,
  XiaoHongShuIcon,
  DiscordIcon,
} from '@zhop/ui/components/social-icons'

interface SocialLink {
  platform: string
  url: string
  username?: string
}

interface SocialLinksProps {
  links: SocialLink[]
  className?: string
  iconSize?: number
}

const iconMap = {
  twitter: TwitterIcon,
  reddit: RedditIcon,
  youtube: YouTubeIcon,
  bluesky: BlueskyIcon,
  xiaohongshu: XiaoHongShuIcon,
  discord: DiscordIcon,
}

const platformTitles = {
  twitter: 'X (Twitter)',
  reddit: 'Reddit',
  youtube: 'YouTube',
  bluesky: 'Bluesky',
  xiaohongshu: '小红书',
  discord: 'Discord',
}

export function SocialLinks({ links, className = '', iconSize = 18 }: SocialLinksProps) {
  if (!links || links.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 md:gap-3 flex-shrink-0 ${className}`}>
      {links.map((link) => {
        const IconComponent = iconMap[link.platform as keyof typeof iconMap]
        const title = platformTitles[link.platform as keyof typeof platformTitles] || link.platform

        if (!IconComponent) return null

        return (
          <Link
            key={link.platform}
            href={link.url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-fd-muted-foreground hover:text-fd-foreground transition-colors p-1'
            title={title}
          >
            <IconComponent size={iconSize} className='md:w-5 md:h-5' />
          </Link>
        )
      })}
    </div>
  )
}
