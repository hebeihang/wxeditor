import type { QuickCommandPersisted } from '@/stores/quickCommands'

export const EXPAND_COMMANDS: QuickCommandPersisted[] = [
  { id: 'expand-mode:cases', label: '补充案例', template: '为文章补充真实或合理的行业案例、场景案例、历史案例，以增强说服力。\n\n{{sel}}' },
  { id: 'expand-mode:data', label: '补充数据', template: '为文章加入合理的趋势数据、数量级估计、统计信息，提高专业度（不虚构精确数字）。\n\n{{sel}}' },
  { id: 'expand-mode:depict', label: '丰富描写', template: '在叙事性内容中扩展细节、场景、动作、情绪与意象，使表达更生动。\n\n{{sel}}' },
  { id: 'expand-mode:concept', label: '概念解释', template: '为专业概念、背景知识提供补充说明，让内容更完整易懂。\n\n{{sel}}' },
  { id: 'expand-mode:logic', label: '逻辑扩展', template: '进一步展开因果关系、推论链条、逻辑支撑，使论述更严谨。\n\n{{sel}}' },
  { id: 'expand-mode:contrast', label: '增强对比', template: '加入正反对比、行业对比、历史对比、区域对比等，让观点更鲜明。\n\n{{sel}}' },
  { id: 'expand-mode:citation', label: '增强引用', template: '加入来自常识、研究结论、机构观点的权威性说明（不虚构具体信息来源）。\n\n{{sel}}' },
  { id: 'expand-mode:scenario', label: '场景补充', template: '添加假设场景、角色视角或具体应用场景，使内容更贴近读者。\n\n{{sel}}' },
  { id: 'expand-mode:structure', label: '结构增强', template: '自动添加过渡句、逻辑衔接、结构优化，让扩写后的文章自然流畅。\n\n{{sel}}' },
  { id: 'expand-mode:counter', label: '补充反方观点', template: '加入潜在风险、限制因素或反对意见，使文章更平衡专业。\n\n{{sel}}' },
]
