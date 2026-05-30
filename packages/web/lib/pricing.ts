import type { PriceBreakdown, PricingModel } from '@/lib/types'

interface ServicePricingInput {
  pricing_model: PricingModel
  base_rate: number   // MNT per unit/м², or call-out fee for inspection
  min_charge: number  // MNT floor
}

export interface PlatformSettings {
  commission: number        // fraction, e.g. 0.15
  damage_fund: number       // fraction, e.g. 0.02
  urgent_surcharge: number  // fraction, e.g. 0.20
}

// Defaults match the DB seed values (app_settings table)
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  commission:       0.15,
  damage_fund:      0.02,
  urgent_surcharge: 0.0,
}

export function calculatePrice(input: {
  service: ServicePricingInput
  settings: PlatformSettings
  quantity?: number      // м² or unit count; required for area/unit models
  quoteAmount?: number   // approved quote amount for inspection model (integer MNT)
  isUrgent?: boolean
}): PriceBreakdown {
  const { service, settings, quantity = 0, quoteAmount, isUrgent = false } = input

  let subtotal: number
  switch (service.pricing_model) {
    case 'area':
    case 'unit':
      subtotal = Math.max(
        Math.round(quantity * service.base_rate),
        service.min_charge,
      )
      break
    case 'inspection':
      subtotal = service.base_rate + (quoteAmount ?? 0)
      break
    case 'survey':
      subtotal = quoteAmount ?? 0
      break
    default: {
      const _: never = service.pricing_model
      throw new Error(`Unknown pricing model: ${_}`)
    }
  }

  const platformFee     = Math.round(subtotal * settings.commission)
  const damageFund      = Math.round(subtotal * settings.damage_fund)
  const urgentSurcharge = isUrgent ? Math.round(subtotal * settings.urgent_surcharge) : 0
  const total           = subtotal + urgentSurcharge
  const workerReceives  = subtotal - platformFee - damageFund

  return { subtotal, platformFee, damageFund, urgentSurcharge, total, workerReceives }
}
