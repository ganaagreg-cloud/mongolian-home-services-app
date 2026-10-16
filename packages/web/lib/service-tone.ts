import {
  Sparkles, Droplets, Zap, Wrench, Paintbrush, Wind, Hammer, Truck, WashingMachine,
  type LucideIcon,
} from 'lucide-react'

// Each service gets its own soft tile + icon color so the grid reads at a glance.
// Keyed by service_types.icon. Category tones never replace the brand teal for actions.
export const SERVICE_ICON: Record<string, LucideIcon> = {
  sparkles:          Sparkles,
  droplets:          Droplets,
  zap:               Zap,
  wrench:            Wrench,
  paintbrush:        Paintbrush,
  wind:              Wind,
  hammer:            Hammer,
  truck:             Truck,
  'washing-machine': WashingMachine,
}

type Tone = { tile: string; icon: string }

const TONES: Record<string, Tone> = {
  sparkles:          { tile: 'bg-tone-rose-soft',   icon: 'text-tone-rose'   },
  'washing-machine': { tile: 'bg-tone-sky-soft',    icon: 'text-tone-sky'    },
  wrench:            { tile: 'bg-tone-blue-soft',   icon: 'text-tone-blue'   },
  droplets:          { tile: 'bg-tone-blue-soft',   icon: 'text-tone-blue'   },
  zap:               { tile: 'bg-tone-amber-soft',  icon: 'text-tone-amber'  },
  paintbrush:        { tile: 'bg-tone-violet-soft', icon: 'text-tone-violet' },
  wind:              { tile: 'bg-tone-teal-soft',   icon: 'text-tone-teal'   },
  hammer:            { tile: 'bg-tone-rose-soft',   icon: 'text-tone-rose'   },
  truck:             { tile: 'bg-tone-blue-soft',   icon: 'text-tone-blue'   },
}

const DEFAULT_TONE: Tone = { tile: 'bg-tone-teal-soft', icon: 'text-tone-teal' }

export function serviceIcon(key: string): LucideIcon {
  return SERVICE_ICON[key] ?? Sparkles
}

export function serviceTone(key: string): Tone {
  return TONES[key] ?? DEFAULT_TONE
}

// Avatar tints for people (workers) — picked by name so a person keeps their color.
const PERSON_TONES: Tone[] = [
  { tile: 'bg-tone-teal-soft',   icon: 'text-tone-teal'   },
  { tile: 'bg-tone-amber-soft',  icon: 'text-tone-amber'  },
  { tile: 'bg-tone-violet-soft', icon: 'text-tone-violet' },
  { tile: 'bg-tone-rose-soft',   icon: 'text-tone-rose'   },
  { tile: 'bg-tone-blue-soft',   icon: 'text-tone-blue'   },
]

export function personTone(name: string): Tone {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0
  return PERSON_TONES[h % PERSON_TONES.length]
}
