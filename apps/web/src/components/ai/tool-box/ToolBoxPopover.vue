<script setup lang="ts">
import { Transaction } from '@codemirror/state'
import { Pause, Settings, Wand2, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import useAIConfigStore from '@/stores/aiConfig'
import { useEditorStore } from '@/stores/editor'
import { useQuickCommands } from '@/stores/quickCommands'

/* -------------------- props / emits -------------------- */
const props = defineProps<{
  open: boolean
  selectedText: string
  isMobile: boolean
  presetAction?:
    | `optimize`
    | `expand`
    | `connect`
    | `translate`
    | `summarize`
    | `grammar`
    | `continue`
    | `outline`
    | `summarize`
    | `spellcheck`
    | `translate-zh`
    | `translate-en`
    | `custom`
}>()
const emit = defineEmits([`update:open`])

/* -------------------- reactive state -------------------- */
const configVisible = ref(false)
const dialogVisible = ref(props.open)
const message = ref(``)
const loading = ref(false)
const abortController = ref<AbortController | null>(null)
const customPrompts = ref<string[]>([])
const hasResult = ref(false)
const selectedAction = ref<
  `optimize`
  | `expand`
  | `connect`
  | `translate`
  | `summarize`
  | `grammar`
  | `continue`
  | `outline`
  | `spellcheck`
  | `translate-zh`
  | `translate-en`
  | `custom`
>(`optimize`)
const currentText = ref(``)
const error = ref(``)

/* -------------------- store & refs -------------------- */
const editorStore = useEditorStore()
const quickCmdStore = useQuickCommands()
const resultContainer = ref<HTMLElement | null>(null)
const showDiff = ref(true)
const diffHtml = ref(``)
const originalDiffHtml = ref(``)
const replacementText = ref(``)
const notesText = ref(``)
const showNotes = ref(false)

const getActionTemplate = (id: string) => quickCmdStore.commands.find(c => c.id === id)?.template || ''
const actionOptions = computed<ActionOption[]>(() => [
  { value: `optimize`, label: `优化文本`, defaultPrompt: getActionTemplate(`action:optimize`) || `请优化文本，使其更通顺易读。` },
  { value: `expand`, label: `补充 / 扩展`, defaultPrompt: getActionTemplate(`action:expand`) || `请根据上下文对文本进行扩展，增加细节与示例。` },
  { value: `connect`, label: `衔接 / 连接（Connect）`, defaultPrompt: getActionTemplate(`action:connect`) || `使文本衔接更自然，补全隐含前提并说明。` },
  { value: `translate`, label: `翻译（Translate）`, defaultPrompt: getActionTemplate(`action:translate-en`) || `将文本翻译为目标语言，保留术语并说明。` },
  { value: `summarize`, label: `摘要 / 概括（Summarize）`, defaultPrompt: getActionTemplate(`action:summarize`) || `先一句话总括，再列出要点。` },
  { value: `grammar`, label: `纠错 / 语法检查（Grammar / Proofread）`, defaultPrompt: getActionTemplate(`action:grammar`) || `检测并修正拼写、语法、标点与风格不一致。` },
  { value: `continue`, label: `续写 / 补全（Continue）`, defaultPrompt: getActionTemplate(`action:continue`) || `从当前文本结尾继续写，保持语境连贯。` },
  { value: `outline`, label: `结构 / 大纲（Outline）`, defaultPrompt: getActionTemplate(`action:outline`) || `生成层级化写作大纲，输出 Markdown 标题。` },
  { value: `spellcheck`, label: `错别字纠正`, defaultPrompt: getActionTemplate(`action:grammar`) || `找出并纠正错别字、标点和语法错误。` },
  { value: `translate-zh`, label: `翻译为中文`, defaultPrompt: getActionTemplate(`action:translate-zh`) || `请将文本翻译为地道的中文。` },
  { value: `translate-en`, label: `翻译为英文`, defaultPrompt: getActionTemplate(`action:translate-en`) || `请将文本翻译为自然流畅的英文。` },
  { value: `custom`, label: `自定义`, defaultPrompt: `` },
])
const actionValues = computed(() => actionOptions.value.map(o => o.value))

const connectStyleId = ref<string>('')
const connectToneId = ref<string>('none')
const connectScope = ref<'句内衔接' | '句间衔接' | '段间衔接' | '全局重写'>('句间衔接')
const connectPreserveLength = ref(false)
const connectCustomPrompt = ref('')

const translateSourceLanguage = ref<'auto' | 'zh-CN' | 'en' | 'ja' | 'ko' | 'de' | 'fr' | 'it' | 'es' | 'pt'>('auto')
const translateTargetLanguage = ref<'en' | 'ja' | 'ko' | 'de' | 'fr' | 'it' | 'es' | 'pt'>('en')
const translatePreserveNamedEntities = ref(true)
const translateTerminology = ref<string>('{}')
const translateFormalLevel = ref<'auto' | 'formal' | 'casual'>('auto')

const summarizeStyleId = ref<string>('')
const summarizeCompressionMode = ref<'百分比' | '目标字数'>('百分比')
const summarizeCompressionValue = ref<number>(30)
const summarizePreserveKeyPoints = ref(true)
const summarizeExplainOmissions = ref(false)

const grammarAutoFix = ref<'建议并标注' | '直接替换' | '仅标注'>('建议并标注')
const grammarShowInlineAnnotations = ref(true)
const grammarLanguage = ref<'auto' | 'zh-CN' | 'en' | 'ja' | 'ko'>('auto')
const grammarStyleGuide = ref('')
const continueStyleId = ref<string>('')
const continueToneId = ref<string>('none')
const continueMode = ref<'字数限制' | '段落数量' | '情节推进'>('字数限制')
const wordsOrParagraphs = ref<number>(200)
const snapToExistingContext = ref<boolean>(true)
const outlineStyleId = ref<string>('')
const outlineLevels = ref<number>(2)
const outlineTargetSections = ref<number>(5)
const includeParagraphSamples = ref<boolean>(true)

function deriveContinueContext(): string {
  try {
    const view = toRaw(editorStore.editor || null)
    const raw = editorStore.getContent()
    if (!raw)
      return ''
    const pos = view ? view.state.selection.main.to : raw.length
    const start = Math.max(0, pos - 600)
    const end = pos
    const ctx = raw.slice(start, end).trim()
    return ctx || raw.slice(Math.max(0, raw.length - 600)).trim()
  }
  catch {
    return ''
  }
}

function autoRunAIIfReady() {
  if (!dialogVisible.value || loading.value)
    return
  const text = currentText.value?.trim()
  if (text || selectedAction.value === 'continue')
    runAIAction()
}

/* -------------------- dialog state sync -------------------- */
watch(() => props.open, (val) => {
  dialogVisible.value = val
  if (val) {
    resetState()
    if (props.presetAction)
      selectedAction.value = props.presetAction
    const sel = props.selectedText.trim()
    if (sel) {
      currentText.value = sel
    }
    else if (selectedAction.value === 'continue') {
      currentText.value = deriveContinueContext()
    }
    else {
      currentText.value = ''
    }
    nextTick().then(() => autoRunAIIfReady())
  }
})
watch(dialogVisible, (val) => {
  emit(`update:open`, val)
  if (val) {
    // ensure a valid action is selected when dialog opens
    const preset = props.presetAction ?? selectedAction.value
    selectedAction.value = actionValues.value.includes(preset as string) ? (preset as any) : 'optimize'
    nextTick().then(() => autoRunAIIfReady())
  }
})

watch(() => props.presetAction, (val) => {
  if (dialogVisible.value && val) {
    selectedAction.value = actionValues.value.includes(val as string) ? (val as any) : 'optimize'
  }
})

/* -------------------- AI config -------------------- */
const AIConfigStore = useAIConfigStore()
const { apiKey, endpoint, model, temperature, maxToken, type }
  = storeToRefs(AIConfigStore)

/* -------------------- action options -------------------- */
interface ActionOption {
  value: string
  label: string
  defaultPrompt: string
}

// actionOptions moved to computed above

/* -------------------- watchers -------------------- */
watch(message, async () => {
  await nextTick()
  resultContainer.value?.scrollTo({ top: resultContainer.value.scrollHeight })
})

watch(selectedAction, (val) => {
  if (val !== `custom`)
    customPrompts.value = []
})

// 当 dialogVisible 且 props.selectedText 变更时，更新原文并重置状态
watch(
  () => props.selectedText,
  (val) => {
    if (dialogVisible.value) {
      const text = val.trim()
      if (text) {
        currentText.value = text
      }
      else if (selectedAction.value === 'continue') {
        currentText.value = deriveContinueContext()
      }
      else {
        currentText.value = ''
      }
      resetState()
      nextTick().then(() => autoRunAIIfReady())
    }
  },
)

/* -------------------- prompt handlers -------------------- */
function extractReplacementAndNotes(raw: string): { replacement: string, notes: string } {
  let replacement = ''
  let notes = ''
  const allNotes = raw.match(/<notes>[\s\S]*?<\/notes>/gi) || []
  if (allNotes.length)
    notes = allNotes.map(n => n.replace(/<\/?notes>/gi, '').trim()).join('\n\n')

  const rep = raw.match(/<replacement>[\s\S]*?<\/replacement>/i)
  if (rep) {
    replacement = rep[0]
      .replace(/<\/?replacement>/gi, '')
      .replace(/<notes>[\s\S]*?<\/notes>/gi, '')
      .trim()
    replacement = replacement.replace(/<\/?(?!replacement\b|notes\b)[a-z][\w-]*\b[^>]*>/gi, '').trim()
  }
  if (!replacement) {
    let stripped = raw.replace(/<notes>[\s\S]*?<\/notes>/gi, '').trim()
    stripped = stripped.replace(/<\/?(?!replacement\b|notes\b)[a-z][\w-]*\b[^>]*>/gi, '')
    const idx = stripped.search(/\n#{1,6}\s|\n(?:术语与决策说明|说明|Notes)/i)
    if (idx > 0) {
      replacement = stripped.slice(0, idx).trim()
      if (!notes)
        notes = stripped.slice(idx).trim()
    }
    if (!replacement) {
      const fence = stripped.match(/```[\s\S]*?```/)
      if (fence)
        replacement = fence[0].replace(/```/g, '').trim()
    }
    if (!replacement)
      replacement = stripped
  }
  const idx2 = replacement.search(/\n(?:#{1,6}\s*)?(?:术语与决策说明|说明|Notes?|Explanation|Reasoning)\s*[:：\n]/i)
  if (idx2 > 0) {
    const extra = replacement.slice(idx2).replace(/<\/?(?!replacement\b|notes\b)[a-z][\w-]*\b[^>]*>/gi, '').trim()
    replacement = replacement.slice(0, idx2).trim()
    if (extra)
      notes = notes ? `${notes}\n\n${extra}` : extra
  }
  return { replacement, notes }
}
function addPrompt(e: KeyboardEvent) {
  const input = e.target as HTMLInputElement
  const prompt = input.value.trim()
  if (prompt && !customPrompts.value.includes(prompt)) {
    customPrompts.value.push(prompt)
  }
  input.value = ``
}

function removePrompt(index: number) {
  customPrompts.value.splice(index, 1)
}

function resetState() {
  message.value = ``
  loading.value = false
  hasResult.value = false
  error.value = ``
  diffHtml.value = ``
  originalDiffHtml.value = ``
  replacementText.value = ``
  notesText.value = ``
  showNotes.value = false

  abortController.value?.abort()
  abortController.value = null
}

/* -------------------- AI call -------------------- */
async function runAIAction() {
  let text = currentText.value.trim()
  if (!text && selectedAction.value === 'continue')
    text = deriveContinueContext()
  if (!text || loading.value)
    return

  resetState()
  loading.value = true
  abortController.value = new AbortController()

  const systemPrompt
    = `你是一名专业的多语言文本助手，请根据用户的指令处理下列内容。在输出时，不要输出任何额外的信息，只输出处理后的文本。`
  const messages = [
    { role: `system`, content: systemPrompt },
    { role: `user`, content: buildActionPrompt(text) },
  ]

  const payload = {
    model: model.value,
    messages,
    temperature: temperature.value,
    max_tokens: maxToken.value,
    stream: true,
  }

  const headers: Record<string, string> = {
    'Content-Type': `application/json`,
  }
  if (apiKey.value && type.value !== `default`) {
    headers.Authorization = `Bearer ${apiKey.value}`
  }

  try {
    const url = new URL(endpoint.value)
    if (!url.pathname.endsWith(`/chat/completions`)) {
      url.pathname = url.pathname.replace(/\/?$/, `/chat/completions`)
    }

    const res = await window.fetch(url.toString(), {
      method: `POST`,
      headers,
      body: JSON.stringify(payload),
      signal: abortController.value!.signal,
    })

    if (!res.ok || !res.body)
      throw new Error(`响应错误：${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder(`utf-8`)
    let buffer = ``

    while (true) {
      const { value, done } = await reader.read()
      if (done)
        break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(`\n`)
      buffer = lines.pop() || ``

      for (const line of lines) {
        if (!line.trim() || line.trim() === `data: [DONE]`)
          continue
        try {
          const json = JSON.parse(line.replace(/^data: /, ``))
          const delta = json.choices?.[0]?.delta?.content
          if (delta?.trim()) {
            message.value += delta
            const parsed = extractReplacementAndNotes(message.value)
            replacementText.value = parsed.replacement
            notesText.value = parsed.notes
            hasResult.value = true
            if (showDiff.value)
              diffHtml.value = buildDiffHtml(currentText.value, replacementText.value || message.value)
            originalDiffHtml.value = buildOriginalDeletionsHtml(currentText.value, replacementText.value || message.value)
          }
        }
        catch {}
      }
    }
  }
  catch (e: any) {
    if (e.name === `AbortError`) {
      console.log(`Request aborted by user.`)
    }
    else {
      console.error(`请求失败：`, e)
      error.value = e.message || `请求失败`
    }
  }
  finally {
    loading.value = false
  }
}

function getStyleLabel(id: string): string {
  if (!id)
    return '默认'
  return quickCmdStore.commands.find(c => c.id === id)?.label || id
}
function getToneLabel(id: string): string {
  if (!id || id === 'none')
    return '无'
  return quickCmdStore.commands.find(c => c.id === id)?.label || id
}

function buildActionPrompt(inputText: string): string {
  const extra = customPrompts.value.length ? `\n附加要求：${customPrompts.value.join('、')}。` : ''
  switch (selectedAction.value) {
    case 'optimize': {
      const base = `请优化文本，使其更通顺易读。将用于替换原文的优化结果置于 <replacement>...</replacement>，将说明或理由置于 <notes>...</notes>。输出 Markdown。不要使用除 <replacement>/<notes> 外的任何标签。\n\n文本：\n${inputText}`
      return `${base}${extra}`
    }
    case 'expand': {
      const base = `请根据上下文对文本进行扩展，增加细节与示例，必要处使用“示例：”标注。将用于替换原文的扩展结果置于 <replacement>...</replacement>，将说明或扩展依据置于 <notes>...</notes>。输出 Markdown。不要使用除 <replacement>/<notes> 外的任何标签。\n\n文本：\n${inputText}`
      return `${base}${extra}`
    }
    case 'connect': {
      const style = getStyleLabel(connectStyleId.value)
      const tone = getToneLabel(connectToneId.value)
      const preserve = connectPreserveLength.value ? '尽量保持原文长度。' : ''
      const base = `在下列范围（${connectScope.value}）内改写以改善衔接：\n\n${inputText}\n\n风格：${style}；情感：${tone}。${preserve}将用于替换原文的衔接后文本置于 <replacement>...</replacement>，将修改原因与逻辑说明置于 <notes>...</notes>。输出 Markdown。不要使用除 <replacement>/<notes> 外的任何标签。`
      const custom = connectCustomPrompt.value?.trim() ? `\n自定义指令：${connectCustomPrompt.value.trim()}` : ''
      return `${base}${custom}${extra}`
    }
    case 'translate': {
      const preserve = translatePreserveNamedEntities.value ? '保留专有名词（不翻译人名/公司名）。' : ''
      let terminologySection = ''
      try {
        const t = translateTerminology.value?.trim() || '{}'
        JSON.parse(t)
        terminologySection = `术语表：${t}。`
      }
      catch {
        terminologySection = `术语表：{}。`
      }
      const base = `将以下文本从 ${translateSourceLanguage.value} 翻译到 ${translateTargetLanguage.value}，${preserve}${terminologySection}遵循用语等级 ${translateFormalLevel.value}：\n\n${inputText}\n\n请在首行标注目标语言标签（${translateTargetLanguage.value}）。将译文置于 <replacement>...</replacement>，将“术语与决策说明”置于 <notes>...</notes>。输出 Markdown。不要使用除 <replacement>/<notes> 外的任何标签。`
      return `${base}${extra}`
    }
    case 'summarize': {
      const style = getStyleLabel(summarizeStyleId.value)
      const mode = summarizeCompressionMode.value
      const val = summarizeCompressionValue.value
      const modeText = mode === '百分比' ? `压缩为原文的 ${val}%` : `目标字数 ${val}`
      const keep = summarizePreserveKeyPoints.value ? '优先保留关键要点。' : ''
      const omit = summarizeExplainOmissions.value ? '列出被省略的重要信息。' : ''
      const base = `将以下文本压缩（模式：${mode}，值：${val}），输出风格：${style}。${keep}${omit}先给出一句话总括，必要时再列出要点。将用于替换原文的文本置于 <replacement>...</replacement>，将解释或省略信息置于 <notes>...</notes>。输出 Markdown。不要使用除 <replacement>/<notes> 外的任何标签。\n\n文本：\n${inputText}\n\n提示：${modeText}。`
      return `${base}${extra}`
    }
    case 'grammar': {
      const inline = grammarShowInlineAnnotations.value ? '注释用括号或行内注释形式展示。' : ''
      const guide = grammarStyleGuide.value?.trim() ? `风格指南：${grammarStyleGuide.value.trim()}。` : ''
      const base = `检查以下文本的拼写、语法、标点与风格一致性（语言：${grammarLanguage.value}）。按 ${grammarAutoFix.value} 输出：给出建议、注释并提供修正后的版本。${inline}${guide}将可替换的修正后文本置于 <replacement>...</replacement>，所有解释与标注置于 <notes>...</notes>。输出 Markdown。不要使用除 <replacement>/<notes> 外的任何标签。\n\n文本：\n${inputText}`
      return `${base}${extra}`
    }
    case 'continue': {
      const style = getStyleLabel(continueStyleId.value)
      const tone = getToneLabel(continueToneId.value)
      const strict = snapToExistingContext.value ? '严格衔接现有上下文。' : ''
      const base = `请从当前文本结尾继续写（模式：${continueMode.value}，目标：${wordsOrParagraphs.value}），风格：${style}，情感：${tone}。优先保持语境连贯。${strict}输出 Markdown。严格的排版要求：标题应独占一行，标题后需空一行再写正文；段落之间用空行分隔；不要把标题和正文写在同一行。不要使用除 <replacement>/<notes> 外的任何标签。\n\n文本：\n${inputText}`
      return `${base}${extra}`
    }
    case 'outline': {
      const style = getStyleLabel(outlineStyleId.value)
      const sample = includeParagraphSamples.value ? '为每个要点生成简短示例段落。' : '无需示例段落。'
      const base = `根据下面的思路生成一个深度为 ${outlineLevels.value} 的大纲（目标章节数：${outlineTargetSections.value}），风格：${style}。给出章节标题与每章 2-4 个要点，${sample}输出 Markdown（标题层级应使用 #）。不要使用除 <replacement>/<notes> 外的任何标签。\n\n思路：\n${inputText}`
      return `${base}${extra}`
    }
    default: {
      const fallback = `请根据最佳实践优化文本。\n\n文本：\n${inputText}`
      return `${fallback}${extra}`
    }
  }
}

/* -------------------- abort handler -------------------- */
function stopAI() {
  if (loading.value && abortController.value) {
    abortController.value.abort()
    loading.value = false
  }
}

/* -------------------- actions -------------------- */
function replaceText() {
  const editorView = toRaw(editorStore.editor!)!
  const sel = editorView.state.selection.main
  let content = (replacementText.value || message.value)
  content = normalizeMarkdown(content)
  if (selectedAction.value !== 'outline' && selectedAction.value !== 'summarize')
    content = fixLeadingBullet(content)
  const to = sel.to
  const from = sel.from

  editorView.dispatch({
    changes: { from, to, insert: content },
    selection: { anchor: from, head: from + content.length },
    annotations: Transaction.addToHistory.of(true),
  })
  editorView.focus()

  currentText.value = content
  resetState()
  dialogVisible.value = false
}

function show() {
  dialogVisible.value = true
}

function close() {
  dialogVisible.value = false
  customPrompts.value = []
  resetState()
}

defineExpose({ dialogVisible, runAIAction, replaceText, show, close, stopAI })
</script>

<script lang="ts">
// 辅助：安全转义 HTML
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 词法切分：词、标点、空白
function tokenize(text: string): string[] {
  const reg = /\w+|[^\w\s]|\s+/g
  const out: string[] = []
  for (const m of text.matchAll(reg)) out.push(m[0])
  return out
}

// LCS 求最短编辑路径（只用于高亮新增/替换）
function buildDiffHtml(a: string, b: string): string {
  const A = tokenize(a)
  const B = tokenize(b)
  const m = A.length
  const n = B.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (A[i - 1] === B[j - 1])
        dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const result: string[] = []
  let i = m; let j = n
  while (i > 0 && j > 0) {
    if (A[i - 1] === B[j - 1]) {
      result.unshift(escapeHtml(B[j - 1]))
      i--; j--
    }
    else if (dp[i][j - 1] >= dp[i - 1][j]) {
      const token = B[j - 1]
      if (!/\s+/.test(token))
        result.unshift(`<span class="text-red-600">${escapeHtml(token)}</span>`)
      else
        result.unshift(escapeHtml(token))
      j--
    }
    else {
      i-- // 删除原文 token，不在更新文本中显示
    }
  }
  while (j > 0) {
    const token = B[j - 1]
    if (!/\s+/.test(token))
      result.unshift(`<span class="text-red-600">${escapeHtml(token)}</span>`)
    else
      result.unshift(escapeHtml(token))
    j--
  }
  return result.join('')
}

export { buildDiffHtml }

function buildOriginalDeletionsHtml(a: string, b: string): string {
  const A = tokenize(a)
  const B = tokenize(b)
  const m = A.length
  const n = B.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (A[i - 1] === B[j - 1])
        dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const result: string[] = []
  let i = m; let j = n
  while (i > 0 && j > 0) {
    if (A[i - 1] === B[j - 1]) {
      result.unshift(escapeHtml(A[i - 1]))
      i--; j--
    }
    else if (dp[i][j - 1] >= dp[i - 1][j]) {
      j--
    }
    else {
      const token = A[i - 1]
      if (!/\s+/.test(token))
        result.unshift(`<span class="line-through text-gray-500">${escapeHtml(token)}</span>`)
      else
        result.unshift(escapeHtml(token))
      i--
    }
  }
  while (i > 0) {
    const token = A[i - 1]
    if (!/\s+/.test(token))
      result.unshift(`<span class="line-through text-gray-500">${escapeHtml(token)}</span>`)
    else
      result.unshift(escapeHtml(token))
    i--
  }
  return result.join('')
}
function normalizeMarkdown(text: string): string {
  let s = text
  s = s.replace(/(^|\n)(\s{0,3}#{1,6}\s+[^\n]+)(?!\n)/g, `$1$2\n\n`)
  s = s.replace(/(^|\n)([-*+]\s+[^\n]+)(?!\n)/g, `$1$2\n`)
  s = s.replace(/([^\n])\n([，。,．！？!?；;：:、…]+)/g, '$1$2')
  s = s.replace(/\n{3,}/g, `\n\n`)
  return s
}

function fixLeadingBullet(text: string): string {
  const count = (text.match(/(^|\n)\s*[-*+]\s+/g) || []).length
  if (count === 1)
    return text.replace(/^\s*[-*+]\s+/, '')
  return text
}
</script>

<template>
  <Dialog v-model:open="dialogVisible">
    <DialogContent
      class="bg-card text-card-foreground flex flex-col w-[95vw] max-h-[90vh] sm:max-h-[85vh] sm:max-w-2xl overflow-hidden p-0"
    >
      <!-- ============ 头部 ============ -->
      <DialogHeader class="space-y-1 flex flex-col items-start px-6 pt-6 pb-4">
        <div class="space-x-1 flex items-center">
          <DialogTitle>AI 工具箱</DialogTitle>

          <Button
            :title="configVisible ? 'AI 工具箱' : '配置参数'"
            :aria-label="configVisible ? 'AI 工具箱' : '配置参数'"
            variant="ghost"
            size="icon"
            @click="configVisible = !configVisible"
          >
            <Wand2 v-if="configVisible" class="h-4 w-4" />
            <Settings v-else class="h-4 w-4" />
          </Button>
        </div>
      </DialogHeader>

      <!-- ============ 内容区域 ============ -->
      <!-- config panel -->
      <AIConfig
        v-if="configVisible"
        class="border-border mx-6 mb-4 w-auto border rounded-md p-4"
        @saved="() => (configVisible = false)"
      />

      <!-- main content -->
      <div v-else class="custom-scroll space-y-3 flex-1 overflow-y-auto px-6 pb-3">
        <!-- action selector -->
        <div>
          <div class="mb-1.5 text-sm font-medium">
            选择操作
          </div>
          <Select v-model="selectedAction">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="请选择要执行的操作" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem
                  v-for="opt in actionOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div v-if="selectedAction === 'continue'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="mb-1 text-sm font-medium">
              延续文风
            </div>
            <Select v-model="continueStyleId">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择文风" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('style:'))" :key="opt.id" :value="opt.id">
                    {{ opt.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              情感（可选）
            </div>
            <Select v-model="continueToneId">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择情感（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">
                    无
                  </SelectItem>
                  <SelectItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('tone:'))" :key="opt.id" :value="opt.id">
                    {{ opt.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              续写模式
            </div>
            <Select v-model="continueMode">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="字数限制">
                    字数限制
                  </SelectItem>
                  <SelectItem value="段落数量">
                    段落数量
                  </SelectItem>
                  <SelectItem value="情节推进">
                    情节推进
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              目标（字数或段落）
            </div>
            <input v-model.number="wordsOrParagraphs" type="number" min="20" max="5000" class="w-full bg-transparent border rounded px-2 py-1 text-sm">
          </div>
          <div class="flex items-center gap-2">
            <input id="snapToExistingContext" v-model="snapToExistingContext" type="checkbox">
            <label for="snapToExistingContext" class="text-sm">严格衔接现有上下文</label>
          </div>
        </div>

        <div v-if="selectedAction === 'outline'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="mb-1 text-sm font-medium">
              目标文风
            </div>
            <Select v-model="outlineStyleId">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择文风" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('style:'))" :key="opt.id" :value="opt.id">
                    {{ opt.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              大纲深度（1=章节,2=小节）
            </div>
            <input v-model.number="outlineLevels" type="number" min="1" max="4" class="w-full bg-transparent border rounded px-2 py-1 text-sm">
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              目标章节数
            </div>
            <input v-model.number="outlineTargetSections" type="number" min="1" max="20" class="w-full bg-transparent border rounded px-2 py-1 text-sm">
          </div>
          <div class="flex items-center gap-2">
            <input id="includeParagraphSamples" v-model="includeParagraphSamples" type="checkbox">
            <label for="includeParagraphSamples" class="text-sm">为要点生成示例段落（简短）</label>
          </div>
        </div>
        <div v-if="selectedAction === 'connect'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="mb-1 text-sm font-medium">
              文风
            </div>
            <Select v-model="connectStyleId">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择文风" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('style:'))" :key="opt.id" :value="opt.id">
                    {{ opt.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              情感
            </div>
            <Select v-model="connectToneId">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择情感（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">
                    无
                  </SelectItem>
                  <SelectItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('tone:'))" :key="opt.id" :value="opt.id">
                    {{ opt.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              衔接范围
            </div>
            <Select v-model="connectScope">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="句内衔接">
                    句内衔接
                  </SelectItem>
                  <SelectItem value="句间衔接">
                    句间衔接
                  </SelectItem>
                  <SelectItem value="段间衔接">
                    段间衔接
                  </SelectItem>
                  <SelectItem value="全局重写">
                    全局重写
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2">
            <input id="connectPreserveLength" v-model="connectPreserveLength" type="checkbox">
            <label for="connectPreserveLength" class="text-sm">尽量保持原文长度</label>
          </div>
          <div class="sm:col-span-2">
            <div class="mb-1 text-sm font-medium">
              自定义指令
            </div>
            <textarea v-model="connectCustomPrompt" rows="3" class="w-full bg-transparent border rounded px-2 py-1 text-sm" />
          </div>
        </div>

        <div v-if="selectedAction === 'translate'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="mb-1 text-sm font-medium">
              源语言
            </div>
            <Select v-model="translateSourceLanguage">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="auto">
                    auto
                  </SelectItem>
                  <SelectItem value="zh-CN">
                    zh-CN
                  </SelectItem>
                  <SelectItem value="en">
                    en
                  </SelectItem>
                  <SelectItem value="ja">
                    ja
                  </SelectItem>
                  <SelectItem value="ko">
                    ko
                  </SelectItem>
                  <SelectItem value="de">
                    de
                  </SelectItem>
                  <SelectItem value="fr">
                    fr
                  </SelectItem>
                  <SelectItem value="it">
                    it
                  </SelectItem>
                  <SelectItem value="es">
                    es
                  </SelectItem>
                  <SelectItem value="pt">
                    pt
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              目标语言
            </div>
            <Select v-model="translateTargetLanguage">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="en">
                    en
                  </SelectItem>
                  <SelectItem value="ja">
                    ja
                  </SelectItem>
                  <SelectItem value="ko">
                    ko
                  </SelectItem>
                  <SelectItem value="de">
                    de
                  </SelectItem>
                  <SelectItem value="fr">
                    fr
                  </SelectItem>
                  <SelectItem value="it">
                    it
                  </SelectItem>
                  <SelectItem value="es">
                    es
                  </SelectItem>
                  <SelectItem value="pt">
                    pt
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2">
            <input id="translatePreserveNamedEntities" v-model="translatePreserveNamedEntities" type="checkbox">
            <label for="translatePreserveNamedEntities" class="text-sm">保留专有名词(不翻译人名/公司名)</label>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              用语等级
            </div>
            <Select v-model="translateFormalLevel">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="auto">
                    auto
                  </SelectItem>
                  <SelectItem value="formal">
                    formal
                  </SelectItem>
                  <SelectItem value="casual">
                    casual
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="sm:col-span-2">
            <div class="mb-1 text-sm font-medium">
              术语表（可编辑，JSON）
            </div>
            <textarea v-model="translateTerminology" rows="4" class="w-full bg-transparent border rounded px-2 py-1 text-sm" placeholder="{&quot;产品名&quot;:&quot;ProductX&quot;}" />
          </div>
        </div>

        <div v-if="selectedAction === 'summarize'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="mb-1 text-sm font-medium">
              输出文风
            </div>
            <Select v-model="summarizeStyleId">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择文风" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('style:'))" :key="opt.id" :value="opt.id">
                    {{ opt.label }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              压缩模式
            </div>
            <Select v-model="summarizeCompressionMode">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="百分比">
                    百分比
                  </SelectItem>
                  <SelectItem value="目标字数">
                    目标字数
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              百分比或目标字数
            </div>
            <input v-model.number="summarizeCompressionValue" type="number" min="5" max="100" class="w-full bg-transparent border rounded px-2 py-1 text-sm">
          </div>
          <div class="flex items-center gap-2">
            <input id="summarizePreserveKeyPoints" v-model="summarizePreserveKeyPoints" type="checkbox">
            <label for="summarizePreserveKeyPoints" class="text-sm">优先保留关键要点</label>
          </div>
          <div class="flex items-center gap-2">
            <input id="summarizeExplainOmissions" v-model="summarizeExplainOmissions" type="checkbox">
            <label for="summarizeExplainOmissions" class="text-sm">说明被省略的重要信息</label>
          </div>
        </div>

        <div v-if="selectedAction === 'grammar'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="mb-1 text-sm font-medium">
              自动修正策略
            </div>
            <Select v-model="grammarAutoFix">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="建议并标注">
                    建议并标注
                  </SelectItem>
                  <SelectItem value="直接替换">
                    直接替换
                  </SelectItem>
                  <SelectItem value="仅标注">
                    仅标注
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              检查语言
            </div>
            <Select v-model="grammarLanguage">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="auto">
                    auto
                  </SelectItem>
                  <SelectItem value="zh-CN">
                    zh-CN
                  </SelectItem>
                  <SelectItem value="en">
                    en
                  </SelectItem>
                  <SelectItem value="ja">
                    ja
                  </SelectItem>
                  <SelectItem value="ko">
                    ko
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2">
            <input id="grammarShowInlineAnnotations" v-model="grammarShowInlineAnnotations" type="checkbox">
            <label for="grammarShowInlineAnnotations" class="text-sm">在文本中显示注释</label>
          </div>
          <div class="sm:col-span-2">
            <div class="mb-1 text-sm font-medium">
              风格指南（可编辑）
            </div>
            <textarea v-model="grammarStyleGuide" rows="3" class="w-full bg-transparent border rounded px-2 py-1 text-sm" placeholder="例如：美式拼写/英国拼写" />
          </div>
        </div>

        <!-- original text -->
        <div>
          <div class="mb-1.5 text-sm font-medium">
            原文
          </div>
          <div
            class="border-border custom-scroll bg-muted/20 text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap border rounded px-3 py-2 text-sm"
          >
            <div v-if="hasResult && showDiff" v-html="originalDiffHtml" />
            <div v-else>
              {{ currentText }}
            </div>
          </div>
        </div>

        <!-- custom prompts -->
        <div v-if="selectedAction === 'custom'">
          <div class="mb-1.5 text-sm font-medium">
            自定义提示词（可选）
          </div>
          <div
            class="custom-scroll border-border max-h-24 min-h-[40px] flex flex-wrap gap-2 overflow-y-auto border rounded px-2 py-1"
          >
            <template v-for="(prompt, index) in customPrompts" :key="index">
              <div
                class="text-muted-foreground bg-muted flex items-center gap-1 rounded-full px-2 py-1 text-sm"
              >
                <span>{{ prompt }}</span>
                <button
                  class="hover:bg-muted/60 h-4 w-4 flex items-center justify-center rounded-full"
                  @click="removePrompt(index)"
                >
                  <X class="h-3 w-3" />
                </button>
              </div>
            </template>
            <input
              class="min-w-[100px] flex-1 bg-transparent py-1 text-sm focus:outline-hidden"
              placeholder="输入提示词后按回车"
              @keydown.enter="addPrompt"
            >
          </div>
        </div>

        <!-- error -->
        <div v-if="error" class="min-h-[20px] flex items-center text-xs text-red-500">
          {{ error }}
        </div>

        <!-- result -->
        <div v-if="message">
          <div class="mb-1.5 text-sm font-medium">
            可替换文本（高亮变化）
          </div>
          <div
            ref="resultContainer"
            class="custom-scroll border-border bg-background max-h-40 min-h-[60px] overflow-y-auto whitespace-pre-wrap border rounded px-3 py-2 text-sm"
          >
            <div v-if="showDiff" v-html="diffHtml" />
            <div v-else>
              {{ replacementText || message }}
            </div>
          </div>
          <div v-if="notesText" class="mt-2">
            <Button variant="ghost" size="sm" @click="showNotes = !showNotes">
              {{ showNotes ? '隐藏说明' : '查看说明' }}
            </Button>
            <div v-if="showNotes" class="custom-scroll border-border bg-muted/20 text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-line border rounded px-3 py-2 text-sm mt-1">
              {{ notesText }}
            </div>
          </div>
        </div>
      </div>

      <!-- ============ 底部按钮 ============ -->
      <div v-if="!configVisible" class="flex justify-end gap-2 px-6 py-3.5 mt-auto">
        <Button v-if="loading" variant="secondary" @click="stopAI">
          <Pause class="mr-1 h-4 w-4" /> 终止
        </Button>
        <Button v-if="message" variant="ghost" @click="showDiff = !showDiff">
          {{ showDiff ? '关闭高亮' : '高亮变化' }}
        </Button>
        <Button
          v-if="hasResult && !loading"
          variant="default"
          @click="replaceText"
        >
          接受
        </Button>
        <Button
          v-if="!loading"
          variant="outline"
          :disabled="!hasResult && !!message"
          @click="runAIAction"
        >
          {{ hasResult ? '重试' : 'AI 处理' }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  /* Tailwind @apply in <style> needs explicit classes when using <style scoped> */
  background-color: rgba(156, 163, 175, 0.4);
  border-radius: 9999px;
}
.custom-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.6);
}
.custom-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.4) transparent;
}
:deep(.dark) .custom-scroll {
  scrollbar-color: rgba(107, 114, 128, 0.4) transparent;
}

@media (pointer: coarse) {
  .custom-scroll::-webkit-scrollbar {
    width: 3px;
  }
}
</style>
