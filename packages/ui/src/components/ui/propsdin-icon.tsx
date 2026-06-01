import React from 'react'

export function notionflareIcon({
  className = '',
  width = 80,
  height = 80,
  fill = 'currentColor',
}: {
  className?: string
  width?: number
  height?: number
  fill?: string
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 100 100'
      className={className}
      xmlns='http://www.w3.org/2000/svg'
    >
      {/* 基础圆形背景 */}
      <circle
        cx='50'
        cy='50'
        r='48'
        fill='url(#notionflare-gradient)'
        stroke={fill}
        strokeWidth='2'
      />

      {/* Props 字母 P */}
      <g fill={fill} transform='translate(20, 25)'>
        <path d='M0 0 L0 50 L4 50 L4 26 L18 26 Q28 26 28 16 Q28 6 18 6 L4 6 L4 0 Z M4 10 L16 10 Q20 10 20 16 Q20 22 16 22 L4 22 Z' />
      </g>

      {/* Din 装饰元素 */}
      <g fill={fill} transform='translate(50, 35)'>
        <circle cx='8' cy='8' r='3' />
        <circle cx='20' cy='8' r='3' />
        <circle cx='14' cy='20' r='3' />
      </g>

      {/* 渐变定义 */}
      <defs>
        <linearGradient id='notionflare-gradient' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='rgba(59, 130, 246, 0.1)' />
          <stop offset='50%' stopColor='rgba(139, 92, 246, 0.2)' />
          <stop offset='100%' stopColor='rgba(236, 72, 153, 0.1)' />
        </linearGradient>
      </defs>
    </svg>
  )
}
