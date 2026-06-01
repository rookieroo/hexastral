import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

export default function Home() {
  return (
    <main className='flex min-h-screen flex-col items-center p-6 md:p-24 bg-white text-gray-900'>
      <div className='z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12'>
        <div className='flex w-full justify-center border-b border-gray-300 bg-linear-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30 flex-col items-center lg:items-start gap-2 text-center lg:text-left'>
          <div className='flex items-center gap-4 mb-2'>
            <div className='relative w-12 h-12 overflow-hidden rounded-full bg-white'>
              <Image
                src='/logo.png'
                alt='UseONE Tech Logo'
                fill
                className='object-contain p-1'
                priority
              />
            </div>
            <span className='font-bold text-xl'>UseONE Tech</span>
          </div>
          <span className='font-bold text-base'>All-in-one platform for online growth.</span>
          <span>Build, distribute, and market your digital presence — in one place.</span>
        </div>
        <div className='flex w-full items-center justify-center lg:static lg:h-auto lg:w-auto lg:bg-none mt-6 lg:mt-0 shrink-0'>
          <div className='flex place-items-center gap-2 p-2 lg:p-0 text-gray-500'>
            <span>By UseONE, LLC</span>
          </div>
        </div>
      </div>

      <div className='mb-16 grid text-center lg:max-w-6xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left gap-6'>
        <a
          href='https://notionflare.com'
          className='group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/30 border-gray-100 border lg:border-transparent'
          target='_blank'
          rel='noopener noreferrer'
        >
          <h2 className={'mb-3 text-2xl font-semibold'}>
            NotionFlare{' '}
            <span className='inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none'>
              -&gt;
            </span>
          </h2>
          <p className={'m-0 max-w-[30ch] text-sm opacity-50 mx-auto lg:mx-0'}>
            Secure, self-hosted personal knowledge base with paid subscription options.
          </p>
        </a>

        <a
          href='https://useone.online'
          className='group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/30 border-gray-100 border lg:border-transparent'
          target='_blank'
          rel='noopener noreferrer'
        >
          <h2 className={'mb-3 text-2xl font-semibold'}>
            Notion Charts{' '}
            <span className='inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none'>
              -&gt;
            </span>
          </h2>
          <p className={'m-0 max-w-[30ch] text-sm opacity-50 mx-auto lg:mx-0'}>
            Power up Notion with charts, custom widgets, and Readwise sync.
          </p>
        </a>

        <div className='rounded-lg border border-dashed border-gray-300 px-5 py-4 bg-gray-50 opacity-75'>
          <h2 className={'mb-3 text-2xl font-semibold text-gray-400'}>
            Zhop Pages{' '}
            <span className='text-xs font-normal bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full ml-2 align-middle'>
              Coming Soon
            </span>
          </h2>
          <p className={'m-0 max-w-[30ch] text-sm opacity-50 mx-auto lg:mx-0'}>
            AI-powered page builder for Shopify merchants. Describe your product, get a publishable
            page.
          </p>
        </div>
      </div>

      <div className='mb-16 grid text-center lg:max-w-6xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left gap-6 mt-6'>
        <div className='rounded-lg border border-dashed border-gray-300 px-5 py-4 bg-gray-50 opacity-75'>
          <h2 className={'mb-3 text-2xl font-semibold text-gray-400'}>
            Podify{' '}
            <span className='text-xs font-normal bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full ml-2 align-middle'>
              Coming Soon
            </span>
          </h2>
          <p className={'m-0 max-w-[30ch] text-sm opacity-50 mx-auto lg:mx-0'}>
            Turn newsletters into AI-generated podcasts. Listen to your reading list on the go.
          </p>
        </div>
      </div>

      <div className='w-full max-w-5xl mt-16 mb-8 rounded-xl border border-gray-200 bg-gray-50 p-8'>
        <h2 className='text-xl font-bold mb-2'>About UseONE, LLC</h2>
        <p className='text-sm text-gray-600 leading-relaxed'>
          UseONE, LLC is an independent software company building productivity and creator tools for
          individuals and small businesses. We are incorporated in the United States and develop all
          products in-house. Our mission is to make powerful digital infrastructure accessible to
          everyone — from personal knowledge management to AI-powered content creation and
          e-commerce.
        </p>
        <p className='text-sm text-gray-500 mt-3'>
          For support, billing inquiries, or any questions about our products, please contact us at{' '}
          <a
            href='mailto:support@useone.tech'
            className='underline hover:text-gray-900 transition-colors'
          >
            support@useone.tech
          </a>
          . We typically respond within 1–2 business days.
        </p>
      </div>

      <footer className='w-full border-t border-gray-200 mt-auto py-8 flex flex-col items-center gap-4 text-sm text-gray-500'>
        <div className='flex gap-6 flex-wrap justify-center'>
          <Link href='/privacy' className='hover:underline hover:text-gray-900 transition-colors'>
            Privacy Policy
          </Link>
          <Link href='/terms' className='hover:underline hover:text-gray-900 transition-colors'>
            Terms of Use
          </Link>
          <a
            href='mailto:support@useone.tech'
            className='hover:underline hover:text-gray-900 transition-colors'
          >
            Support
          </a>
        </div>
        <div className='text-center px-4'>
          <p>© 2026 UseONE, LLC. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
