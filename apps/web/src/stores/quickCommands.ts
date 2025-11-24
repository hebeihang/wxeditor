import { ref, watch } from 'vue'
import { store } from '@/utils/storage'

export interface QuickCommandPersisted {
  id: string
  label: string
  template: string // 用 {{sel}} 占位
}

export interface QuickCommandRuntime extends QuickCommandPersisted {
  buildPrompt: (sel?: string) => string
}

const STORAGE_KEY = `quick_commands`

// 把持久化的对象转换为可执行的 buildPrompt
function hydrate(cmd: QuickCommandPersisted): QuickCommandRuntime {
  return {
    ...cmd,
    buildPrompt: (sel = ``) =>
      cmd.template.replace(/\{\{\s*sel\s*\}\}/gi, sel),
  }
}

// 4 条默认指令
const TITLE_SUGGEST_TEMPLATE = `你是一名资深中文内容编辑，请基于「全文内容」为微信公众号生成高点击率标题。务必遵循以下技巧：

一、提升吸引力的3个姿势
1）抱大腿：
- 名人热点：可将内容与高流量名人或热点事件绑定；
- 跨界类比：用知名品牌/领域比喻，传递高端、品味等调性；
- 同类比较：在某一维度上与同类头部品牌对比，制造好奇与差异化。

二、增强冲击力
1）数字数据：用具体数字增强专业与可信度（标题中不超过3个数字）。
2）标点符号：适当使用！？“”……等强化情绪，但避免过度堆砌。
3）情绪词：震惊、竟然、没想到、扎心、冲突、陷阱、刷爆、暴露、必须等，适度使用以提升张力。

三、贴标签
直接给目标受众贴上标签（如：中年人、产品经理、加班狗、吃货等），便于用户对号入座与共鸣。

要求：
- 生成10个中文标题，长度≤20字，换行分隔；
- 风格多样，但须与正文调性一致，避免无关蹭热；
- 禁止夸张失真与不当承诺；
- 不要在同一个标题中混用过多标点与数字；
- 输出仅包含标题列表，无前后解释。

全文内容如下：
{{sel}}`

const TITLE_STYLE_MIMON: QuickCommandPersisted = { id: `title-style:mimon`, label: `咪蒙体`, template: TITLE_SUGGEST_TEMPLATE }
const TITLE_STYLE_SHOCK: QuickCommandPersisted = { id: `title-style:shock`, label: `震惊体`, template: `你是资深新媒体编辑，请以“强冲击力、情绪张力”风格，为以下全文生成10个中文标题（≤20字，换行分隔）。\n- 适度使用情绪词（震惊、竟然、没想到、扎心、冲突、陷阱、刷爆等）\n- 数字不超过3个，标点适量（！？””……），避免堆砌\n- 标题需与正文调性一致，禁止失真承诺\n- 仅输出标题列表，无额外说明\n\n全文内容：\n{{sel}}` }
const TITLE_STYLE_NEWS: QuickCommandPersisted = { id: `title-style:news`, label: `新闻体`, template: `你是一位资深中文新闻编辑，请以“新闻体/资讯体”风格，为以下全文生成10个中文标题（≤20字，换行分隔）。\n- 客观克制，信息密度高，避免夸张与情绪化\n- 可包含时间、地点、主体、动作、结果等要素\n- 数字与术语适量，确保可读性\n- 仅输出标题列表，无任何前后缀说明\n\n全文内容：\n{{sel}}` }

const STYLE_BUSINESS: QuickCommandPersisted = { id: `style:business`, label: `商业分析`, template: `用商业分析风格改写以下文本：\n\n{{sel}}\n\n目标：清晰、数据驱动、专业。写作要点：结论优先、分点列出、给出可执行建议。` }
const STYLE_ACADEMIC: QuickCommandPersisted = { id: `style:academic`, label: `学术`, template: `用学术风格改写以下文本：\n\n{{sel}}\n\n目标：正式、引用友好、逻辑严谨。注意使用被动语态和引用占位符。` }
const STYLE_OFFICIAL: QuickCommandPersisted = { id: `style:official`, label: `公文 / 官样`, template: `用公文风格改写以下文本：\n\n{{sel}}\n\n目标：正式、明确、严谨，使用简洁句式与条目化表达。` }
const STYLE_LITERARY: QuickCommandPersisted = { id: `style:literary`, label: `文艺`, template: `用文艺风格改写以下文本：\n\n{{sel}}\n\n目标：富有想象力、使用比喻与修辞，句子节奏感强。` }
const STYLE_CLASSICAL: QuickCommandPersisted = { id: `style:classical`, label: `古风`, template: `以古风文体改写：\n\n{{sel}}\n\n目标：古雅、意象浓，适当使用文言词汇与对仗句式。` }

const TONE_HUMOROUS: QuickCommandPersisted = { id: `tone:humorous`, label: `幽默`, template: `添加幽默语气，保持礼貌，不冒犯。` }
const TONE_SERIOUS: QuickCommandPersisted = { id: `tone:serious`, label: `严肃`, template: `语气严谨、正式。` }
const TONE_SAD: QuickCommandPersisted = { id: `tone:sad`, label: `悲伤`, template: `语气略带悲伤与共情。` }
const TONE_ENTHUSIASTIC: QuickCommandPersisted = { id: `tone:enthusiastic`, label: `热情`, template: `语气热情、鼓舞。` }
const DEFAULT_COMMANDS: QuickCommandPersisted[] = [
  { id: `polish`, label: `润色`, template: `请润色以下内容：\n\n{{sel}}` },
  { id: `expand`, label: `扩展`, template: `请根据上下文扩展以下内容，增加细节与示例：\n\n{{sel}}` },
  { id: `to-en`, label: `翻译成英文`, template: `请将以下内容翻译为英文：\n\n{{sel}}` },
  { id: `to-zh`, label: `翻译成中文`, template: `Please translate the following content into Chinese:\n\n{{sel}}` },
  { id: `summary`, label: `总结`, template: `请对以下内容进行总结：\n\n{{sel}}` },
  { id: `title-suggest`, label: `标题推荐`, template: TITLE_SUGGEST_TEMPLATE },
  TITLE_STYLE_MIMON,
  TITLE_STYLE_SHOCK,
  TITLE_STYLE_NEWS,
  STYLE_BUSINESS,
  STYLE_ACADEMIC,
  STYLE_OFFICIAL,
  STYLE_LITERARY,
  STYLE_CLASSICAL,
  TONE_HUMOROUS,
  TONE_SERIOUS,
  TONE_SAD,
  TONE_ENTHUSIASTIC,
]

export const useQuickCommands = defineStore(`quickCommands`, () => {
  // ---------- state ----------
  const commands = ref<QuickCommandRuntime[]>([])

  // ---------- helpers ----------
  async function save() {
    const toSave: QuickCommandPersisted[] = commands.value.map(
      ({ id, label, template }) => ({ id, label, template }),
    )
    await store.setJSON(STORAGE_KEY, toSave)
  }

  async function load() {
    const parsed = await store.getJSON<QuickCommandPersisted[]>(STORAGE_KEY)

    if (parsed && Array.isArray(parsed)) {
      try {
        commands.value = parsed.map(hydrate)
      }
      catch (e) {
        console.warn(`解析快捷指令失败，已恢复默认值`, e)
        commands.value = DEFAULT_COMMANDS.map(hydrate)
        await save()
      }
    }
    else {
      commands.value = DEFAULT_COMMANDS.map(hydrate)
      await save()
    }

    const ensure = (cmd: QuickCommandPersisted) => {
      const i = commands.value.findIndex(c => c.id === cmd.id)
      if (i === -1)
        commands.value.push(hydrate(cmd))
      else
        commands.value[i] = hydrate({ ...commands.value[i], template: cmd.template, label: cmd.label })
    }
    ensure({ id: `title-suggest`, label: `标题推荐`, template: TITLE_SUGGEST_TEMPLATE })
    ensure(TITLE_STYLE_MIMON)
    ensure(TITLE_STYLE_SHOCK)
    ensure(TITLE_STYLE_NEWS)
    ensure(STYLE_BUSINESS)
    ensure(STYLE_ACADEMIC)
    ensure(STYLE_OFFICIAL)
    ensure(STYLE_LITERARY)
    ensure(STYLE_CLASSICAL)
    ensure(TONE_HUMOROUS)
    ensure(TONE_SERIOUS)
    ensure(TONE_SAD)
    ensure(TONE_ENTHUSIASTIC)
    await save()
  }

  // ---------- CRUD ----------
  function add(label: string, template: string, id?: string) {
    const finalId = id && id.trim().length > 0 ? id : crypto.randomUUID()
    commands.value.push(hydrate({ id: finalId, label, template }))
  }

  function update(id: string, label: string, template: string) {
    const idx = commands.value.findIndex(c => c.id === id)
    if (idx !== -1)
      commands.value[idx] = hydrate({ id, label, template })
  }

  function remove(id: string) {
    commands.value = commands.value.filter(c => c.id !== id)
  }

  // ---------- init ----------
  load()
  watch(commands, save, { deep: true })

  return { commands, add, update, remove }
})
