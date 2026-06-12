// Pricing moved to @homeservices/shared (RN2 — mobile needs it too).
// Re-export keeps existing '@/lib/pricing' imports working.
export {
  calculatePrice,
  DEFAULT_PLATFORM_SETTINGS,
  type PlatformSettings,
} from '@homeservices/shared'
