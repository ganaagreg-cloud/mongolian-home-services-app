import type { PricingModel } from '@homeservices/shared'

// Wire shape of GET /api/service-types — the route returns raw snake_case rows
export interface ServiceTypeRow {
  id: number
  name_mn: string
  icon: string
  sort_order: number
  pricing_model: PricingModel
  base_rate: number
  min_charge: number
  unit_label: string
  requires_property_type: boolean
}
