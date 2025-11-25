import type { QuickCommandPersisted } from '../quickCommands'

export const STYLE_BUSINESS: QuickCommandPersisted = { id: `style:business`, label: `商业分析`, template: `用商业分析风格改写以下文本：\n\n{{sel}}\n\n目标：清晰、数据驱动、专业。写作要点：结论优先、分点列出、给出可执行建议。` }
export const STYLE_ACADEMIC: QuickCommandPersisted = { id: `style:academic`, label: `学术`, template: `用学术风格改写以下文本：\n\n{{sel}}\n\n目标：正式、引用友好、逻辑严谨。注意使用被动语态和引用占位符。` }
export const STYLE_OFFICIAL: QuickCommandPersisted = { id: `style:official`, label: `公文 / 官样`, template: `用公文风格改写以下文本：\n\n{{sel}}\n\n目标：正式、明确、严谨，使用简洁句式与条目化表达。` }
export const STYLE_LITERARY: QuickCommandPersisted = { id: `style:literary`, label: `文艺`, template: `用文艺风格改写以下文本：\n\n{{sel}}\n\n目标：富有想象力、使用比喻与修辞，句子节奏感强。` }
export const STYLE_CLASSICAL: QuickCommandPersisted = { id: `style:classical`, label: `古风`, template: `以古风文体改写：\n\n{{sel}}\n\n目标：古雅、意象浓，适当使用文言词汇与对仗句式。` }

export const STYLE_COMMANDS: QuickCommandPersisted[] = [
  STYLE_BUSINESS,
  STYLE_ACADEMIC,
  STYLE_OFFICIAL,
  STYLE_LITERARY,
  STYLE_CLASSICAL,
]
