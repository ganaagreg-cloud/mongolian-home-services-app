import { resolve } from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: resolve(import.meta.dirname, '../..'),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
