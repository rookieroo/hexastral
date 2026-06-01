'use client'

import {
  Film,
  Image as ImageIcon,
  Link2,
  Loader2,
  Search,
  ShoppingBag,
  Upload as UploadIcon,
  X,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { ScrollArea } from '../ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

/**
 * MediaPicker - Notion-style media selection component
 *
 * Features 5 entry points:
 * 1. Upload: Local file upload to Cloudflare R2
 * 2. Embed Link: Manual URL input
 * 3. Unsplash: Free stock photos
 * 4. GIPHY: Animated GIFs
 * 5. Shopify: Product images from store
 */

export interface MediaPickerProps {
  value?: string
  onChange: (url: string) => void
  onClose?: () => void
  /**
   * CDN upload endpoint (e.g., https://cdn.yoursite.com/upload)
   */
  uploadEndpoint?: string
  /**
   * Unsplash API access key
   */
  unsplashAccessKey?: string
  /**
   * GIPHY API key
   */
  giphyApiKey?: string
  /**
   * Shopify store domain
   */
  shopifyDomain?: string
  /**
   * Shopify access token
   */
  shopifyAccessToken?: string
}

interface UnsplashImage {
  id: string
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  alt_description: string | null
  user: {
    name: string
    username: string
  }
}

interface GiphyImage {
  id: string
  title: string
  images: {
    original: { url: string }
    fixed_height: { url: string }
  }
}

interface ShopifyImage {
  id: string
  src: string
  alt: string | null
  product_id: string
  product_title: string
}

export function MediaPicker({
  value,
  onChange,
  onClose,
  uploadEndpoint = '/api/cdn/upload',
  unsplashAccessKey,
  giphyApiKey,
  shopifyDomain,
  shopifyAccessToken,
}: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState('upload')
  const [embedUrl, setEmbedUrl] = useState(value || '')

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Unsplash state
  const [unsplashQuery, setUnsplashQuery] = useState('')
  const [unsplashResults, setUnsplashResults] = useState<UnsplashImage[]>([])
  const [unsplashLoading, setUnsplashLoading] = useState(false)

  // GIPHY state
  const [giphyQuery, setGiphyQuery] = useState('')
  const [giphyResults, setGiphyResults] = useState<GiphyImage[]>([])
  const [giphyLoading, setGiphyLoading] = useState(false)

  // Shopify state
  const [shopifyResults, setShopifyResults] = useState<ShopifyImage[]>([])
  const [shopifyLoading, setShopifyLoading] = useState(false)

  /**
   * Handle local file upload
   */
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      setUploadError(null)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(uploadEndpoint, {
          method: 'PUT',
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Upload failed')
        }

        const data = await response.json()
        onChange(data.url || data.key)
        onClose?.()
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [uploadEndpoint, onChange, onClose]
  )

  /**
   * Handle embed link submission
   */
  const handleEmbedSubmit = useCallback(() => {
    if (!embedUrl.trim()) return
    onChange(embedUrl.trim())
    onClose?.()
  }, [embedUrl, onChange, onClose])

  /**
   * Search Unsplash
   */
  const searchUnsplash = useCallback(async () => {
    if (!unsplashQuery.trim() || !unsplashAccessKey) return

    setUnsplashLoading(true)
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashQuery)}&per_page=24&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${unsplashAccessKey}`,
          },
        }
      )

      const data = await response.json()
      setUnsplashResults(data.results || [])
    } catch (error) {
      console.error('Unsplash search failed:', error)
    } finally {
      setUnsplashLoading(false)
    }
  }, [unsplashQuery, unsplashAccessKey])

  /**
   * Search GIPHY
   */
  const searchGiphy = useCallback(async () => {
    if (!giphyQuery.trim() || !giphyApiKey) return

    setGiphyLoading(true)
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(giphyQuery)}&limit=24&rating=g`
      )

      const data = await response.json()
      setGiphyResults(data.data || [])
    } catch (error) {
      console.error('GIPHY search failed:', error)
    } finally {
      setGiphyLoading(false)
    }
  }, [giphyQuery, giphyApiKey])

  /**
   * Load Shopify product images
   */
  const loadShopifyImages = useCallback(async () => {
    if (!shopifyDomain || !shopifyAccessToken) return

    setShopifyLoading(true)
    try {
      const response = await fetch(`https://${shopifyDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyAccessToken,
        },
        body: JSON.stringify({
          query: `
              {
                products(first: 50) {
                  edges {
                    node {
                      id
                      title
                      images(first: 5) {
                        edges {
                          node {
                            id
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            `,
        }),
      })

      const data = await response.json()
      const images: ShopifyImage[] = []

      data.data?.products?.edges?.forEach((productEdge: any) => {
        const product = productEdge.node
        product.images?.edges?.forEach((imageEdge: any) => {
          const image = imageEdge.node
          images.push({
            id: image.id,
            src: image.url,
            alt: image.altText,
            product_id: product.id,
            product_title: product.title,
          })
        })
      })

      setShopifyResults(images)
    } catch (error) {
      console.error('Shopify load failed:', error)
    } finally {
      setShopifyLoading(false)
    }
  }, [shopifyDomain, shopifyAccessToken])

  return (
    <div className='w-full max-w-4xl bg-background rounded-lg border shadow-lg'>
      <div className='flex items-center justify-between p-4 border-b'>
        <h3 className='font-semibold text-lg'>Select Media</h3>
        {onClose && (
          <Button variant='ghost' size='icon' onClick={onClose}>
            <X className='h-4 w-4' />
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='w-full justify-start rounded-none border-b bg-transparent p-0 h-auto'>
          <TabsTrigger
            value='upload'
            className='rounded-none border-b-2 border-transparent data-[state=active]:border-primary'
          >
            <UploadIcon className='h-4 w-4 mr-2' />
            Upload
          </TabsTrigger>
          <TabsTrigger
            value='embed'
            className='rounded-none border-b-2 border-transparent data-[state=active]:border-primary'
          >
            <Link2 className='h-4 w-4 mr-2' />
            Embed Link
          </TabsTrigger>
          <TabsTrigger
            value='unsplash'
            className='rounded-none border-b-2 border-transparent data-[state=active]:border-primary'
            disabled={!unsplashAccessKey}
          >
            <ImageIcon className='h-4 w-4 mr-2' />
            Unsplash
          </TabsTrigger>
          <TabsTrigger
            value='giphy'
            className='rounded-none border-b-2 border-transparent data-[state=active]:border-primary'
            disabled={!giphyApiKey}
          >
            <Film className='h-4 w-4 mr-2' />
            GIPHY
          </TabsTrigger>
          <TabsTrigger
            value='shopify'
            className='rounded-none border-b-2 border-transparent data-[state=active]:border-primary'
            disabled={!shopifyDomain || !shopifyAccessToken}
          >
            <ShoppingBag className='h-4 w-4 mr-2' />
            Shopify
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value='upload' className='p-6 space-y-4'>
          <div className='border-2 border-dashed rounded-lg p-12 text-center space-y-4'>
            <div className='flex justify-center'>
              <UploadIcon className='h-12 w-12 text-muted-foreground' />
            </div>
            <div>
              <Label htmlFor='file-upload' className='cursor-pointer'>
                <span className='text-primary font-medium hover:underline'>Click to upload</span> or
                drag and drop
              </Label>
              <p className='text-sm text-muted-foreground mt-1'>PNG, JPG, GIF up to 10MB</p>
            </div>
            <Input
              id='file-upload'
              type='file'
              accept='image/*'
              className='hidden'
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </div>

          {uploading && (
            <div className='flex items-center justify-center gap-2 text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Uploading...
            </div>
          )}

          {uploadError && <p className='text-sm text-destructive text-center'>{uploadError}</p>}
        </TabsContent>

        {/* Embed Link Tab */}
        <TabsContent value='embed' className='p-6 space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='embed-url'>Image URL</Label>
            <Input
              id='embed-url'
              type='url'
              placeholder='https://example.com/image.jpg'
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEmbedSubmit()
                }
              }}
            />
          </div>
          <Button onClick={handleEmbedSubmit} disabled={!embedUrl.trim()} className='w-full'>
            Embed Image
          </Button>
        </TabsContent>

        {/* Unsplash Tab */}
        <TabsContent value='unsplash' className='p-6 space-y-4'>
          <div className='flex gap-2'>
            <Input
              placeholder='Search free photos...'
              value={unsplashQuery}
              onChange={(e) => setUnsplashQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchUnsplash()
                }
              }}
            />
            <Button onClick={searchUnsplash} disabled={unsplashLoading}>
              {unsplashLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Search className='h-4 w-4' />
              )}
            </Button>
          </div>

          <ScrollArea className='h-100'>
            <div className='grid grid-cols-3 gap-4'>
              {unsplashResults.map((image) => (
                <button
                  key={image.id}
                  type='button'
                  onClick={() => {
                    onChange(image.urls.regular)
                    onClose?.()
                  }}
                  className='relative aspect-video overflow-hidden rounded-lg border hover:border-primary transition-colors group'
                >
                  <img
                    src={image.urls.small}
                    alt={image.alt_description || 'Unsplash image'}
                    className='object-cover w-full h-full group-hover:scale-105 transition-transform'
                  />
                  <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2'>
                    <p className='text-white text-xs'>by {image.user.name}</p>
                  </div>
                </button>
              ))}
            </div>
            {unsplashResults.length === 0 && !unsplashLoading && (
              <div className='text-center py-12 text-muted-foreground'>
                Search for beautiful free photos from Unsplash
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* GIPHY Tab */}
        <TabsContent value='giphy' className='p-6 space-y-4'>
          <div className='flex gap-2'>
            <Input
              placeholder='Search animated GIFs...'
              value={giphyQuery}
              onChange={(e) => setGiphyQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchGiphy()
                }
              }}
            />
            <Button onClick={searchGiphy} disabled={giphyLoading}>
              {giphyLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Search className='h-4 w-4' />
              )}
            </Button>
          </div>

          <ScrollArea className='h-100'>
            <div className='grid grid-cols-3 gap-4'>
              {giphyResults.map((gif) => (
                <button
                  key={gif.id}
                  type='button'
                  onClick={() => {
                    onChange(gif.images.original.url)
                    onClose?.()
                  }}
                  className='relative aspect-video overflow-hidden rounded-lg border hover:border-primary transition-colors'
                >
                  <img
                    src={gif.images.fixed_height.url}
                    alt={gif.title}
                    className='object-cover w-full h-full'
                  />
                </button>
              ))}
            </div>
            {giphyResults.length === 0 && !giphyLoading && (
              <div className='text-center py-12 text-muted-foreground'>
                Search for animated GIFs from GIPHY
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Shopify Tab */}
        <TabsContent value='shopify' className='p-6 space-y-4'>
          {shopifyResults.length === 0 && !shopifyLoading && (
            <Button onClick={loadShopifyImages} className='w-full'>
              Load Product Images
            </Button>
          )}

          {shopifyLoading && (
            <div className='flex items-center justify-center gap-2 py-12'>
              <Loader2 className='h-6 w-6 animate-spin' />
              <span className='text-muted-foreground'>Loading products...</span>
            </div>
          )}

          {shopifyResults.length > 0 && (
            <ScrollArea className='h-100'>
              <div className='grid grid-cols-3 gap-4'>
                {shopifyResults.map((image) => (
                  <button
                    key={image.id}
                    type='button'
                    onClick={() => {
                      onChange(image.src)
                      onClose?.()
                    }}
                    className='relative aspect-square overflow-hidden rounded-lg border hover:border-primary transition-colors group'
                  >
                    <img
                      src={image.src}
                      alt={image.alt || image.product_title}
                      className='object-cover w-full h-full group-hover:scale-105 transition-transform'
                    />
                    <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2'>
                      <p className='text-white text-xs line-clamp-2'>{image.product_title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
