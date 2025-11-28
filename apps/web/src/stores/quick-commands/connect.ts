import type { QuickCommandPersisted } from '@/stores/quickCommands'

export const CONNECT_COMMANDS: QuickCommandPersisted[] = [
  { id: 'connect-mode:logic', label: '逻辑衔接', template: '根据上下文自动添加因果、递进、转折、对比、总结等逻辑连接，使段落间逻辑关系清晰自然。\n\n{{sel}}' },
  { id: 'connect-mode:transition', label: '过渡句生成', template: '为相邻段落生成自然的过渡句，避免内容跳跃或生硬衔接。\n\n{{sel}}' },
  { id: 'connect-mode:order', label: '顺序优化', template: '在不改变用户原意的前提下，自动调整句子或段落顺序，让内容结构更合理。\n\n{{sel}}' },
  { id: 'connect-mode:coref', label: '指代一致性', template: '处理主语、代词、引用对象的前后一致，避免歧义或断裂。\n\n{{sel}}' },
  { id: 'connect-mode:theme', label: '主题统一', template: '确保段落衔接时围绕同一主题，必要时补一句让内容回归主线。\n\n{{sel}}' },
  { id: 'connect-mode:carry', label: '信息承接', template: '识别上文未展开的信息点，并在下文自然延伸，使内容流动更顺畅。\n\n{{sel}}' },
]
