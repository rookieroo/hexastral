import * as React from 'react'
import { cn } from '../../lib/utils'

export const Section = ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <section className={cn('py-12 md:py-16 lg:py-24', className)} {...props}>
    {children}
  </section>
)
