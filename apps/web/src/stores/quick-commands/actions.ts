import type { QuickCommandPersisted } from '../quickCommands'

export const ACTION_OPTIMIZE: QuickCommandPersisted = { id: `action:optimize`, label: `润色`, template: `请优化以下内容，使其更通顺易读，保持原意不变。必要时提供替代表达与简洁化建议：\n\n{{sel}}` }
export const ACTION_EXPAND: QuickCommandPersisted = { id: `action:expand`, label: `扩展`, template: `请根据上下文扩展以下内容，增加细节与示例，重要处以“示例：”标注：\n\n{{sel}}` }
export const ACTION_CONNECT: QuickCommandPersisted = { id: `action:connect`, label: `衔接`, template: `请改善以下文本的逻辑衔接，使转折与过渡自然，必要时补全隐含前提或因果说明：\n\n{{sel}}` }
export const ACTION_SUMMARIZE: QuickCommandPersisted = { id: `action:summarize`, label: `摘要`, template: `请对以下内容进行摘要，先给一句话总括，再列出3-6个要点：\n\n{{sel}}` }
export const ACTION_GRAMMAR: QuickCommandPersisted = { id: `action:grammar`, label: `纠错`, template: `请检查并纠正以下内容中的错别字、语法、标点与风格不一致问题，并给出修正后的版本：\n\n{{sel}}` }
export const ACTION_CONTINUE: QuickCommandPersisted = { id: `action:continue`, label: `续写`, template: `请从以下内容的末尾继续写作，保持语境与文风一致：\n\n{{sel}}` }
export const ACTION_OUTLINE: QuickCommandPersisted = { id: `action:outline`, label: `大纲`, template: `请根据以下思路生成层级化写作大纲，使用 Markdown 标题与要点：\n\n{{sel}}` }

export const ACTION_COMMANDS: QuickCommandPersisted[] = [
  ACTION_OPTIMIZE,
  ACTION_EXPAND,
  ACTION_CONNECT,
  ACTION_SUMMARIZE,
  ACTION_GRAMMAR,
  ACTION_CONTINUE,
  ACTION_OUTLINE,
]
