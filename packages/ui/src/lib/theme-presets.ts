export interface ThemePresetConfig {
  themeBase: 'zinc' | 'slate' | 'stone' | 'gray' | 'neutral'
  brandColor: string
  radius: string
  typography: {
    heading: 'sans' | 'serif' | 'mono' | 'display'
    body: 'sans' | 'serif' | 'mono'
  }
  reasoning?: string
}

/**
 * Industry-specific theme presets for quick onboarding
 * These serve as fallbacks or starting points before AI generation
 */
export const industryPresets: Record<string, ThemePresetConfig> = {
  coffee: {
    themeBase: 'stone',
    brandColor: '#6F4E37', // Coffee brown
    radius: '0.5rem',
    typography: {
      heading: 'serif',
      body: 'sans',
    },
    reasoning: 'Warm, earthy tones perfect for coffee shops with elegant serif headings',
  },
  tech: {
    themeBase: 'zinc',
    brandColor: '#0066FF', // Tech blue
    radius: '0.3rem',
    typography: {
      heading: 'sans',
      body: 'sans',
    },
    reasoning: 'Modern, clean design with sharp edges for tech startups',
  },
  fashion: {
    themeBase: 'neutral',
    brandColor: '#000000', // Classic black
    radius: '0rem',
    typography: {
      heading: 'serif',
      body: 'sans',
    },
    reasoning: 'High-fashion minimalism with sharp lines and elegant typography',
  },
  organic: {
    themeBase: 'stone',
    brandColor: '#7CB342', // Organic green
    radius: '0.75rem',
    typography: {
      heading: 'sans',
      body: 'sans',
    },
    reasoning: 'Warm, natural palette with friendly rounded corners',
  },
  luxury: {
    themeBase: 'neutral',
    brandColor: '#C9A961', // Gold
    radius: '0rem',
    typography: {
      heading: 'serif',
      body: 'serif',
    },
    reasoning: 'Premium positioning with sharp edges and elegant serif fonts',
  },
  kids: {
    themeBase: 'neutral',
    brandColor: '#FF6B9D', // Playful pink
    radius: '1rem',
    typography: {
      heading: 'display',
      body: 'sans',
    },
    reasoning: 'Vibrant, friendly design with maximum roundness and playful fonts',
  },
  healthcare: {
    themeBase: 'slate',
    brandColor: '#00897B', // Medical teal
    radius: '0.5rem',
    typography: {
      heading: 'sans',
      body: 'sans',
    },
    reasoning: 'Professional, trustworthy blue tones with standard readability',
  },
  food: {
    themeBase: 'stone',
    brandColor: '#E53935', // Appetite red
    radius: '0.5rem',
    typography: {
      heading: 'display',
      body: 'sans',
    },
    reasoning: 'Warm background with appetite-stimulating red and friendly curves',
  },
}

/**
 * Get a preset by industry keyword matching
 */
export function getPresetByIndustry(description: string): ThemePresetConfig | null {
  const lowerDesc = description.toLowerCase()

  const keywords: Record<string, string> = {
    coffee: 'coffee|cafe|espresso|barista',
    tech: 'tech|software|saas|ai|startup|digital',
    fashion: 'fashion|clothing|apparel|boutique|style',
    organic: 'organic|natural|eco|sustainable|green',
    luxury: 'luxury|premium|high-end|exclusive|upscale',
    kids: 'kids|children|baby|toy|family',
    healthcare: 'health|medical|clinic|hospital|wellness',
    food: 'food|restaurant|dining|cuisine|meal',
  }

  for (const [industry, pattern] of Object.entries(keywords)) {
    if (new RegExp(pattern, 'i').test(lowerDesc)) {
      return industryPresets[industry] ?? null
    }
  }

  return null
}
