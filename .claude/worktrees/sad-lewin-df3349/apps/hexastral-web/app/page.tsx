// next-intl middleware handles locale detection + redirect to /<locale>/
// This page should never render — it's a TS requirement for the base route.
// Safety net only: fall back to en if middleware is bypassed.
import { redirect } from 'next/navigation'

export default async function RootPage() {
  // If next-intl middleware localeDetection is false, 
  // root `/` visits hit here directly. Redirect to the default locale path (which is `/` for 'en' because of 'as-needed').
  // However, next/navigation redirect('/') from app/page.tsx will loop.
  // Instead, since next-intl handles the root rendering when localePrefix='as-needed', 
  // we actually just need to export nothing or return the localized index page content here.
  // Wait, if localeDetection is false, `next-intl` middleware STILL rewrites `/` to `/en/`.
  // So this app/page.tsx shouldn't be executed at all by Next.js if middleware runs.
  
  // Just in case it is hit directly, loop-safely redirect:
  redirect('/en') 
}
