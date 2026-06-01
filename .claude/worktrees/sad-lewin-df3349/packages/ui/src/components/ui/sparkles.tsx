'use client'
import React from 'react'

export const SparklesCore = (props: {
  background?: string
  minSize?: number
  maxSize?: number
  particleDensity?: number
  className?: string
  particleColor?: string
  id?: string
}) => {
  return <div className={props.className} />
}
