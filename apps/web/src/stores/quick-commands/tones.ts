import type { QuickCommandPersisted } from '../quickCommands'

export const TONE_HUMOROUS: QuickCommandPersisted = { id: `tone:humorous`, label: `幽默`, template: `添加幽默语气，保持礼貌，不冒犯。` }
export const TONE_SERIOUS: QuickCommandPersisted = { id: `tone:serious`, label: `严肃`, template: `语气严谨、正式。` }
export const TONE_SAD: QuickCommandPersisted = { id: `tone:sad`, label: `悲伤`, template: `语气略带悲伤与共情。` }
export const TONE_ENTHUSIASTIC: QuickCommandPersisted = { id: `tone:enthusiastic`, label: `热情`, template: `语气热情、鼓舞。` }

export const TONE_COMMANDS: QuickCommandPersisted[] = [
  TONE_HUMOROUS,
  TONE_SERIOUS,
  TONE_SAD,
  TONE_ENTHUSIASTIC,
]
