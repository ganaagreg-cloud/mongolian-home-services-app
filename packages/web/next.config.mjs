import { resolve } from 'path'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: resolve(import.meta.dirname, '../..'),
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['pg'],
  output: 'standalone',
}

export default withBundleAnalyzer(nextConfig)
