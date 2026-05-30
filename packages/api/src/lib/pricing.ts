import type { ServiceType, PriceBreakdown } from '@homeservices/shared'

export interface PlatformSettings {
  commission: number       // fraction, e.g. 0.15
  damage_fund: number      // fraction, e.g. 0.02
  urgent_surcharge: number // fraction, e.g. 0.20
}

export function calculatePrice(input: {
  serviceType: ServiceType
  settings: PlatformSettings
  quantity?: number      // м² or unit count (required for area/unit models)
  quoteAmount?: number   // approved quote amount for inspection model (integer MNT)
  isUrgent?: boolean
}): PriceBreakdown {
  const { serviceType, settings, quantity = 0, quoteAmount, isUrgent = false } = input

  let subtotal: number
  switch (serviceType.pricingModel) {
    case 'area':
    case 'unit':
      subtotal = Math.max(
        Math.round(quantity * serviceType.baseRate),
        serviceType.minCharge,
      )
      break
    case 'inspection':
      subtotal = serviceType.baseRate + (quoteAmount ?? 0)
      break
    case 'survey':
      subtotal = quoteAmount ?? 0
      break
    default: {
      const _: never = serviceType.pricingModel
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
