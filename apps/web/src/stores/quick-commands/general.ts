import type { QuickCommandPersisted } from '../quickCommands'

export const GENERAL_CONSISTENT: QuickCommandPersisted = {
  id: 'general-style:consistent',
  label: '保持一致',
  template: '在后续生成中，请尽量保持整体风格、情绪与格式与原文一致或相近，允许少量调整，不要出现明显偏差。',
}

export const GENERAL_COMMANDS: QuickCommandPersisted[] = [
  GENERAL_CONSISTENT,
]
