<script setup lang="ts">
import { Transaction } from '@codemirror/state'
import { Pause, X } from 'lucide-vue-next'
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
import useOutlineSettings from '@/stores/outlineSettings'
import { useQuickCommands } from '@/stores/quickCommands'
import { useUIStore } from '@/stores/ui'
import { store as kvStore } from '@/utils/storage'

/* -------------------- props / emits -------------------- */
type ToolVariant
  = | 'expand'
    | 'custom'
    | 'outline'
    | 'optimize'
    | 'connect'
    | 'translate'
    | 'summarize'
    | 'grammar'
    | 'continue'
    | 'spellcheck'
    | 'image'

const props = defineProps<{
  open: boolean
  selectedText: string
  isMobile: boolean
  presetAction?: ToolVariant
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
const selectedAction = ref<ToolVariant>('optimize')
const currentText = ref(``)
const error = ref(``)
const forceTranslate = ref(false)

/* -------------------- store & refs -------------------- */
const editorStore = useEditorStore()
const quickCmdStore = useQuickCommands()
const uiStore = useUIStore()
const { toggleAIImageDialog } = uiStore
const resultContainer = ref<HTMLElement | null>(null)
const showDiff = ref(true)
const diffHtml = ref(``)
const originalDiffHtml = ref(``)
const replacementText = ref(``)
const notesText = ref(``)
const showNotes = ref(false)
const aiHideConnect = kvStore.reactive<boolean>('ai_hide_connect', true)
const aiHideTranslate = kvStore.reactive<boolean>('ai_hide_translate', true)
const aiHideGrammar = kvStore.reactive<boolean>('ai_hide_grammar', true)
const aiHideContinue = kvStore.reactive<boolean>('ai_hide_continue', true)

const getActionTemplate = (id: string) => quickCmdStore.commands.find(c => c.id === id)?.template || ''
const actionOptions = computed<ActionOption[]>(() => {
  const base: ActionOption[] = [
    { value: `optimize`, label: `润色`, defaultPrompt: getActionTemplate(`action:optimize`) || `请优化文本，使其更通顺易读。` },
    { value: `expand`, label: `扩展`, defaultPrompt: getActionTemplate(`action:expand`) || `请根据上下文对文本进行扩展，增加细节与示例。` },
    { value: `connect`, label: `衔接`, defaultPrompt: getActionTemplate(`action:connect`) || `使文本衔接更自然，补全隐含前提并说明。` },
    { value: `translate`, label: `翻译`, defaultPrompt: getActionTemplate(`action:translate-en`) || `将文本翻译为目标语言，保留术语并说明。` },
    { value: `summarize`, label: `摘要`, defaultPrompt: getActionTemplate(`action:summarize`) || `先一句话总括，再列出要点。` },
    { value: `grammar`, label: `纠错`, defaultPrompt: getActionTemplate(`action:grammar`) || `检测并修正拼写、语法、标点与风格不一致。` },
    { value: `image`, label: `文生图`, defaultPrompt: `` },
    { value: `continue`, label: `续写`, defaultPrompt: getActionTemplate(`action:continue`) || `从当前文本结尾继续写，保持语境连贯。` },
    { value: `outline`, label: `大纲`, defaultPrompt: getActionTemplate(`action:outline`) || `生成层级化写作大纲，输出 Markdown 标题。` },
    { value: `custom`, label: `自定义`, defaultPrompt: `` },
  ]
  return base.filter(
    o => (o.value !== 'connect' || !aiHideConnect.value)
      && (o.value !== 'translate' || !aiHideTranslate.value)
      && (o.value !== 'grammar' || !aiHideGrammar.value)
      && (o.value !== 'continue' || !aiHideContinue.value),
  )
})
const actionValues = computed<ToolVariant[]>(() => actionOptions.value.map(o => o.value as ToolVariant))

const connectTermsStr = kvStore.reactive<string>('ai_connect_terms', '[]')
const selectedConnectIds = ref<string[]>([])
try { selectedConnectIds.value = JSON.parse(connectTermsStr.value || '[]') }
catch { selectedConnectIds.value = [] }

const translateSourceLanguage = kvStore.reactive<string>('ai_translate_source_lang', 'auto')
const translateTargetLanguage = kvStore.reactive<string>('ai_translate_target_lang', 'en')
const translatePreserveNamedEntities = kvStore.reactive<boolean>('ai_translate_preserve_named', true)
const translateTerminology = kvStore.reactive<string>('ai_translate_termi', '{}')
const translateFormalLevel = kvStore.reactive<string>('ai_translate_formal_level', 'auto')
const translatePreserveFormatting = kvStore.reactive<boolean>('ai_translate_preserve_formatting', true)
const translatePreserveNumbersUnits = kvStore.reactive<boolean>('ai_translate_numbers_units', true)
const translateAutoConvertUnits = kvStore.reactive<boolean>('ai_translate_units_convert', false)
const translateLocalizationMode = kvStore.reactive<string>('ai_translate_localization_mode', 'Off')

function normalizePresetAction(val?: string): ToolVariant {
  if (val === 'translate-zh') {
    translateSourceLanguage.value = 'auto'
    translateTargetLanguage.value = 'zh-CN'
    return 'translate'
  }
  if (val === 'translate-en') {
    translateSourceLanguage.value = 'auto'
    translateTargetLanguage.value = 'en'
    return 'translate'
  }
  if (val && actionValues.value.includes(val as ToolVariant))
    return val as ToolVariant
  return 'optimize'
}

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

const contGoal = kvStore.reactive<string>('ai_continue_goal', '补全文本')
const contLength = kvStore.reactive<string>('ai_continue_length', '短（50–100 字）')
const contLengthCustom = kvStore.reactive<number>('ai_continue_length_custom', 150)
const contWritingStyle = kvStore.reactive<string>('ai_continue_writing_style', '与原文一致')
const contTone = kvStore.reactive<string>('ai_continue_tone', '中性')
const contPreserve = kvStore.reactive<string>('ai_continue_preserve_original_info', 'strong')
const contStory = kvStore.reactive<string>('ai_continue_story_direction', '按现有逻辑推进')
const contConsistency = kvStore.reactive<string>('ai_continue_consistency_mode', '部分模仿')
const contForbidden = kvStore.reactive<string>('ai_continue_forbidden_elements', '')
const contStructure = kvStore.reactive<string>('ai_continue_structure_control', '加强过渡')
const contCreativity = kvStore.reactive<number>('ai_continue_creativity_level', 50)
const contReadability = kvStore.reactive<string>('ai_continue_readability_level', '大众读者')
const contCustom = kvStore.reactive<string>('ai_continue_custom_instruction', '')
const outlineSettings = useOutlineSettings()

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
      selectedAction.value = normalizePresetAction(props.presetAction)
    const sel = props.selectedText.trim()
    if (sel) {
      currentText.value = sel
      if ((selectedAction.value === 'translate')
        && (!props.presetAction || props.presetAction === 'translate')
        && translateSourceLanguage.value === 'auto'
        && translateTargetLanguage.value === 'en') {
        const hasHan = /[\u4E00-\u9FFF]/.test(sel)
        const asciiLetters = (sel.match(/[A-Z]/gi) || []).length
        const nonAscii = (sel.match(/[\x80-\uFFFF]/g) || []).length
        if (hasHan || nonAscii > asciiLetters) {
          translateTargetLanguage.value = 'en'
        }
        else {
          translateTargetLanguage.value = 'zh-CN'
        }
      }
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
    const preset = (props.presetAction ?? selectedAction.value) as ToolVariant
    const mapped = normalizePresetAction(preset)
    selectedAction.value = actionValues.value.includes(mapped) ? mapped : 'optimize'
    nextTick().then(() => autoRunAIIfReady())
  }
})

watch(() => props.presetAction, (val) => {
  if (dialogVisible.value && val) {
    const mapped = normalizePresetAction(val)
    selectedAction.value = actionValues.value.includes(mapped) ? mapped : 'optimize'
  }
})

/* -------------------- AI config -------------------- */
const AIConfigStore = useAIConfigStore()
const { apiKey, endpoint, model, temperature, maxToken, type }
  = storeToRefs(AIConfigStore)

/* -------------------- action options -------------------- */
interface ActionOption {
  value: ToolVariant
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
  if (val === 'image') {
    dialogVisible.value = false
    toggleAIImageDialog(true)
  }
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
// 当目标语言在设置面板变化时，翻译工具自动重置并按新语言运行
watch(translateTargetLanguage, () => {
  if (dialogVisible.value && selectedAction.value === 'translate') {
    resetState()
    nextTick().then(() => autoRunAIIfReady())
  }
})

/* -------------------- prompt handlers -------------------- */
function extractReplacementAndNotes(raw: string): { replacement: string, notes: string } {
  let replacement = ''
  let notes = ''
  const allNotes = raw.match(/<notes>[\s\S]*?<\/notes>/gi) || []
  if (allNotes.length) {
    notes = allNotes.map(n => n.replace(/<\/?notes>/gi, '').trim()).join('\n\n')
  }
  else {
    const incompleteNotes = raw.match(/<notes>[\s\S]*$/i)
    if (incompleteNotes)
      notes = incompleteNotes[0].replace(/<\/?notes>/gi, '').trim()
  }

  const rep = raw.match(/<replacement>[\s\S]*?<\/replacement>/i) || raw.match(/<replacement>[\s\S]*?(?=<notes>|$)/i)
  if (rep) {
    let candidateRep = rep[0]
      .replace(/<\/?replacement>/gi, '')
      .replace(/<notes>[\s\S]*?<\/notes>/gi, '')
      .replace(/<notes>[\s\S]*$/i, '')
      .trim()
    candidateRep = candidateRep.replace(/<\/?(?!replacement\b|notes\b)[a-z][\w-]*\b[^>]*>/gi, '').trim()
    // 去除模型误复述的提示词块
    candidateRep = candidateRep.replace(/(?:^|\n)\s*(严格限制|必须确保输出为|只使用目标语言输出)[\s\S]*?(?:\n{2,}|$)/g, '')
    replacement = candidateRep
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

function sanitizeAIContent(raw: string): string {
  let s = raw || ''
  s = s.replace(/<notes>[\s\S]*?<\/notes>/gi, '')
  s = s.replace(/<notes>[\s\S]*$/i, '')
  s = s.replace(/<\/?replacement>/gi, '')
  s = s.replace(/<\/?(?!replacement\b|notes\b)[a-z][\w-]*\b[^>]*>/gi, '')
  s = s.replace(/\{\{\s*sel\s*\}\}/gi, '')
  return s.trim()
}

function enforceStructure(original: string, candidate: string): string {
  const hasHeading = /(?:^|\n)\s{0,3}#{1,6}\s/.test(original)
  const hasList = /(?:^|\n)\s*[-*+]\s+/.test(original)
  let s = candidate
  if (!hasHeading)
    s = s.replace(/(^|\n)\s{0,3}#{1,6}\s+/g, '$1')
  if (!hasList)
    s = s.replace(/(^|\n)\s*[-*+]\s+/g, '$1')
  return s
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
  forceTranslate.value = false
}

async function onGlossaryUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return
  const text = await file.text()
  try {
    JSON.parse(text)
    translateTerminology.value = text
  }
  catch {
    // ignore invalid JSON
  }
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
  const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
    { role: `system`, content: systemPrompt },
    { role: `user`, content: buildActionPrompt(text) },
  ]

  const payload = {
    model: model.value,
    messages,
    temperature: (selectedAction.value === 'translate' ? Math.min(0.2, Number(temperature.value) || 0.2) : temperature.value),
    max_tokens: (selectedAction.value === 'translate'
      ? (Number(maxToken.value) || 1024)
      : maxToken.value),
    stream: true,
    stop: (selectedAction.value === 'translate' && !forceTranslate.value ? ['</replacement>'] : undefined),
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
            if (parsed.replacement?.trim()) {
              replacementText.value = parsed.replacement
              notesText.value = parsed.notes
              hasResult.value = true
              const usedContent = enforceStructure(currentText.value, sanitizeAIContent(replacementText.value))
              if (showDiff.value)
                diffHtml.value = buildDiffHtml(currentText.value, usedContent)
              originalDiffHtml.value = buildOriginalDeletionsHtml(currentText.value, usedContent)
            }
          }
        }
        catch {}
      }
    }
    if (selectedAction.value === 'translate' && !forceTranslate.value) {
      const usedContent = enforceStructure(currentText.value, sanitizeAIContent(replacementText.value || message.value))
      const origNorm = currentText.value.replace(/\s+/g, '').toLowerCase()
      const contNorm = usedContent.replace(/\s+/g, '').toLowerCase()
      const tgt = translateTargetLanguage.value
      const langOk = ((tgt === 'ja')
        ? /[\u3040-\u30FF\u4E00-\u9FFF]/.test(usedContent)
        : (tgt === 'zh-CN')
            ? /[\u4E00-\u9FFF]/.test(usedContent)
            : (tgt === 'ko')
                ? /[\uAC00-\uD7A3]/.test(usedContent)
                : true)
      const hasPromptEcho = /严格限制|必须确保输出为|只使用目标语言输出/.test(usedContent)
      if (!hasResult.value || contNorm === origNorm || contNorm.length === 0 || !langOk || hasPromptEcho) {
        forceTranslate.value = true
        loading.value = false
        await nextTick()
        runAIAction()
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
      const polishStyleId = kvStore.reactive<string>('ai_style_id', 'style:business')
      const polishToneId = kvStore.reactive<string>('ai_tone_id', '')
      const preserveNames = kvStore.reactive<boolean>('ai_preserve_names', true)
      const polishStrength = kvStore.reactive<number>('ai_polish_strength', 60)
      const lengthPref = kvStore.reactive<string>('ai_polish_length_pref', '保持长度')
      const structureOpt = kvStore.reactive<string>('ai_polish_structure_opt', 'none')
      const readability = kvStore.reactive<string>('ai_polish_readability_level', '大众读者（高中）')
      const custom = kvStore.reactive<string>('ai_polish_custom', '')

      const style = getStyleLabel(polishStyleId.value)
      const styleCmd = quickCmdStore.commands.find(c => c.id === polishStyleId.value)
      const styleDetail = styleCmd ? styleCmd.template.replace(/\n\s*\{\{\s*sel\s*\}\}/i, '').trim() : ''
      const tone = getToneLabel(polishToneId.value || 'none')
      const preserve = preserveNames.value ? '保留专有名词（人名、品牌、技术名词、机构名等）原样不改。' : ''
      const strength = `润色强度：${polishStrength.value}/100（强度越高改动越大）。`
      const lenText = lengthPref.value === '保持长度'
        ? '整体长度尽量与原文一致。'
        : lengthPref.value === '不超过原文'
          ? '整体长度不超过原文，允许少量误差。'
          : lengthPref.value === '稍微扩写（10-20%）'
            ? '整体长度比原文扩写约 10-20%。'
            : lengthPref.value === '适度扩写'
              ? '整体长度比原文扩写约 20-40%。'
              : '整体长度比原文扩写约 40-80%。'
      const structText = structureOpt.value === 'none'
        ? '不要调整段落结构或逻辑顺序。'
        : structureOpt.value === 'mild'
          ? '允许轻微结构优化（可补充过渡句、微调句序）。'
          : '允许较强结构优化（可重排段落、增强逻辑）。'
      const readText = readability.value === '专家读者'
        ? '目标读者：专家读者。可使用专业术语与精炼表达，无需基础解释。'
        : readability.value === '专业读者'
          ? '目标读者：专业读者。允许适度术语与专业表达，保持清晰。'
          : '目标读者：大众读者。术语解释充分，句式简洁，避免过多缩写。'
      const customText = custom.value?.trim() ? `自定义指令优先：${custom.value.trim()}。` : ''

      const policyMap = {
        'style:official': { len: '字数保持原文 90%～110%', struct: '不新增结构（标题/段落/列表），仅在原句体现“现状—问题—建议”' },
        'style:editorial': { len: '字数保持原文 90%～110%', struct: '不新增标题/列表，不新增论据或背景，仅强化观点语气' },
        'style:legal': { len: '字数保持原文 90%～110%', struct: '仅在原有结构存在时可保留小标题（事实/争点/法律/分析/结论），不新增法律条款与分析' },
        'style:business-letter': { len: '字数保持原文 90%～110%', struct: '格式：[称呼] 正文 [结束语] [署名]；不得新增额外礼貌语或结尾语' },
        'style:investment': { len: '字数保持原文 90%～110%', struct: '必须保留原有标题结构（概况/估值/风险点/预测/结论），不得删除或新增段落' },
        'style:ppt-brief': { len: '字数保持原文 90%～110%', struct: '不得新增标题或列表；如原文已有列表，仅微调措辞不可增加条目' },
        'style:business': { len: '字数保持原文 90%～110%', struct: '不新增标题或列表；使用“总体来看/核心在于/基于当前数据”等句式' },
        'style:news-report': { len: '字数保持原文 90%～110%', struct: '不新增标题或列表；导语概述事实，不加入无来源句' },
        'style:popular-science': { len: '字数保持原文 90%～110%', struct: '不新增标题或比喻，仅在原句上简化表达' },
        'style:tech-writing': { len: '字数保持原文 90%～110%', struct: '不新增标题或列表；保持过程性说明的克制表达' },
        'style:academic': { len: '字数保持原文 90%～110%', struct: '不新增标题或列表；使用“然而/值得注意”等中性连接词' },
        'style:whitepaper': { len: '字数保持原文 90%～110%', struct: '不新增章节块或列表；保持报告语气' },
        'style:product-ops': { len: '字数保持原文 90%～110%', struct: '不得新增标题；如原文已有列表，仅可微调措辞不可增加条目' },
      } as Record<string, { len: string, struct: string }>
      const policy = policyMap[polishStyleId.value] || { len: '保持原文长度', struct: '不新增结构' }

      const base = `请严格按照指定文风重写文本（不是仅润色）。禁止新增或虚构信息，必须保持所有事实一致。只输出润色后的 Markdown 文本，不要任何解释或附加说明。将结果置于 <replacement>...</replacement>，不要输出 <notes> 标签或其他标签。\n\n设置：\n- 文风：${style}\n- 语气：${tone}\n- ${strength}\n- 长度：${policy.len}\n- 结构：${policy.struct}\n- ${readText}\n- ${preserve}\n- ${customText}${styleDetail ? `\n- 风格细则：${styleDetail}` : ''}\n\n仅允许在原句基础上进行风格化语言替换，不改变信息量与段落数量。\n\n文本：\n${inputText}`
      return `${base}${extra}`
    }
    case 'expand': {
      const base = `请根据上下文对文本进行扩展，增加细节与示例，必要处使用“示例：”标注。将用于替换原文的扩展结果置于 <replacement>...</replacement>，将说明或扩展依据置于 <notes>...</notes>。输出 Markdown。不要使用除 <replacement>/<notes> 外的任何标签。\n\n文本：\n${inputText}`
      const expandTermsStr = kvStore.reactive<string>('ai_expand_terms', '[]')
      let ids: string[] = []
      try { ids = JSON.parse(expandTermsStr.value || '[]') }
      catch { ids = [] }
      const cmds = ids
        .map(id => quickCmdStore.commands.find(c => c.id === id))
        .filter(Boolean) as { id: string, label: string, template: string }[]
      const termsSection = cmds.length
        ? `\n扩写功能：\n${cmds.map(c => `- ${c.label}：${c.template.replace(/\n\s*\{\{\s*sel\s*\}\}/i, '').trim()}`).join('\n')}`
        : ''
      return `${base}${termsSection}${extra}`
    }
    case 'connect': {
      const base = `请在不改变用户原意的前提下对以下文本进行衔接优化，使上下文自然连贯。将用于替换原文的衔接后文本置于 <replacement>...</replacement>，将修改原因与逻辑说明置于 <notes>...</notes>。输出 Markdown。不要使用除 <replacement>/<notes> 外的任何标签。\n\n文本：\n${inputText}`
      let ids: string[] = []
      try { ids = JSON.parse(connectTermsStr.value || '[]') }
      catch { ids = [] }
      const cmds = ids
        .map(id => quickCmdStore.commands.find(c => c.id === id))
        .filter(Boolean) as { id: string, label: string, template: string }[]
      const termsSection = cmds.length
        ? `\n衔接功能：\n${cmds.map(c => `- ${c.label}：${c.template.replace(/\n\s*\{\{\s*sel\s*\}\}/i, '').trim()}`).join('\n')}`
        : ''
      return `${base}${termsSection}${extra}`
    }
    case 'translate': {
      const languageNameMap: Record<string, string> = {
        'zh-CN': '中文',
        'en': 'English',
        'ja': '日本語',
        'ko': '한국어',
        'de': 'Deutsch',
        'fr': 'Français',
        'it': 'Italiano',
        'es': 'Español',
        'pt': 'Português',
      }
      const targetLabel = languageNameMap[translateTargetLanguage.value] || translateTargetLanguage.value
      const preserve = translatePreserveNamedEntities.value ? '保留专有名词（人名、公司名、产品名、地名、技术词）原文不翻译。' : ''
      const fmt = translatePreserveFormatting.value ? '保留原文格式（换行、标题层级、粗体/斜体、列表、Markdown/HTML 标记）。' : ''
      const num = translatePreserveNumbersUnits.value ? '保持原文数字与货币格式（例如 1,000 / ¥ / $ / €）。' : ''
      const unit = translatePreserveNumbersUnits.value
        ? (translateAutoConvertUnits.value ? '在合适场景自动进行公制/英制单位转换。' : '不要进行单位转换。')
        : ''
      const loc = translateLocalizationMode.value === 'Mild'
        ? '本地化模式：轻度。在不改变原意的前提下，适度调整为目标语言常用表达。'
        : translateLocalizationMode.value === 'Strong'
          ? '本地化模式：强。优先目标语言文化的常用表达与可读性。'
          : '本地化模式：关闭。以直译为主，仅在必要处做最小调整。'
      let terminologySection = ''
      try {
        const t = translateTerminology.value?.trim() || '{}'
        JSON.parse(t)
        terminologySection = `术语表：${t}。`
      }
      catch {
        terminologySection = `术语表：{}。`
      }
      const forceText = forceTranslate.value
        ? '强制要求：逐句翻译为目标语言；任何未翻译或直接复述原文的内容均不合格，必须转化为目标语言表达。只使用目标语言输出，禁止出现其他语言。\n\n'
        : ''
      const base = `将以下文本从 ${translateSourceLanguage.value} 翻译到 ${targetLabel}（${translateTargetLanguage.value}），${preserve}${fmt}${num}${unit}${terminologySection}语域（Register）：${translateFormalLevel.value}。${loc}\n\n严格限制：不得扩写或增添任何新信息、例子、解释；逐句对齐并保持段落结构不变；句子数量与段落数量尽量与原文一致；整体长度与原文一致（允许极少量误差）；如原文不含以 # 或 -/* 开头的行，译文也不得添加标题或项目符号。\n\n必须确保输出为“目标语言”的表述，不得原样复述原文；若原文已是目标语言，也需改写为更地道的目标语言表达。只使用目标语言输出，禁止出现其他语言。\n\n${forceText}${inputText}\n\n只输出 <replacement>...</replacement>，不要输出 <notes>。输出 Markdown。不要使用除 <replacement> 外的任何标签。`
      return `${base}${extra}`
    }
    case 'summarize': {
      const style = getStyleLabel(summarizeStyleId.value)
      const keep = '必须保留关键信息（人名、机构、数字、结论、目标受众/目的等），不得遗漏或改变事实。'
      const guidance = '避免过度压缩；先一句话总括核心信息，再用 3–7 条要点列出重要细节与脉络（主题、对象、作用、特色、场景/示例等）。如需删减，请在 <notes> 中说明被省略的内容。'
      const base = `请对以下文本进行“信息充足的摘要”，输出风格：${style}。${keep}${guidance}只输出 Markdown 文本：将摘要置于 <replacement>...</replacement>，说明与省略信息置于 <notes>...</notes>；不要使用除 <replacement>/<notes> 以外的标签。\n\n文本：\n${inputText}`
      return `${base}${extra}`
    }
    case 'grammar': {
      const inline = grammarShowInlineAnnotations.value ? '注释用括号或行内注释形式展示。' : ''
      const guide = grammarStyleGuide.value?.trim() ? `风格指南：${grammarStyleGuide.value.trim()}。` : ''
      const base = `检查以下文本的拼写、语法、标点与风格一致性（语言：${grammarLanguage.value}）。按 ${grammarAutoFix.value} 输出：给出建议、注释并提供修正后的版本。${inline}${guide}将可替换的修正后文本置于 <replacement>...</replacement>，所有解释与标注置于 <notes>...</notes>。输出 Markdown。不要使用除 <replacement>/<notes> 外的任何标签。\n\n文本：\n${inputText}`
      return `${base}${extra}`
    }
    case 'continue': {
      const lenText = contLength.value === '自定义字数'
        ? `字数 ${contLengthCustom.value}`
        : contLength.value
      const styleText = contWritingStyle.value || '与原文一致'
      const toneText = contTone.value || '中性'
      const preserveText = contPreserve.value === 'strong'
        ? '不得违背原有事实、设定、世界观与人物性格。'
        : contPreserve.value === 'medium'
          ? '允许小幅突破，但不得改变核心设定与关键信息。'
          : '可自由创作，但需保持基本主题一致。'
      const storyText = contStory.value ? `剧情推进：${contStory.value}。` : ''
      const consistencyText = contConsistency.value ? `一致性：${contConsistency.value}。` : ''
      const forbidText = (contForbidden.value || '').trim()
        ? `禁止：${(contForbidden.value || '').split(/[,，;；\n]+/).map(s => s.trim()).filter(Boolean).join('、')}。`
        : ''
      const structureText = contStructure.value ? `结构控制：${contStructure.value}。` : ''
      const creativityText = `创意自由度：${contCreativity.value}/100。`
      const readText = contReadability.value ? `阅读难度：${contReadability.value}。` : ''
      const customText = (contCustom.value || '').trim() ? `自定义指令（最高优先）：${contCustom.value.trim()}。` : ''
      const goalText = contGoal.value ? `续写重点：${contGoal.value}。` : ''

      const base = `请根据以下“续写设置”对文本进行续写。长度优先于其他控制。严格要求：续写必须自然衔接原文，不得偏题。只输出续写后的 Markdown 内容，不要任何解释或标签。\n\n设置：\n- ${goalText}\n- 长度：${lenText}\n- 风格：${styleText}\n- 语气：${toneText}\n- ${preserveText}\n- ${storyText}\n- ${consistencyText}\n- ${structureText}\n- ${creativityText}\n- ${readText}\n- ${forbidText}\n- ${customText}\n\n文本：\n${inputText}`
      return `${base}${extra}`
    }
    case 'outline': {
      const userPrompt = outlineSettings.buildUserPrompt(inputText)
      return `${userPrompt}${extra}`
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
  let content = enforceStructure(currentText.value, sanitizeAIContent(replacementText.value || message.value))
  if (selectedAction.value === 'translate') {
    const onlyReplacement = sanitizeAIContent(replacementText.value)
    if (!onlyReplacement.trim()) {
      error.value = '未检测到可替换的译文块，请重试（确保输出置于 <replacement> 标签）'
      return
    }
    content = enforceStructure(currentText.value, onlyReplacement)
    const origNorm = currentText.value.replace(/\s+/g, '').toLowerCase()
    const contNorm = content.replace(/\s+/g, '').toLowerCase()
    if (origNorm === contNorm || contNorm.length === 0) {
      error.value = '翻译结果与原文一致或为空，请重试或切换目标语言设置'
      return
    }
  }
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
        </div>
      </DialogHeader>

      <!-- ============ 内容区域 ============ -->
      <!-- config panel (hidden) -->

      <!-- main content -->
      <div class="custom-scroll space-y-3 flex-1 overflow-y-auto px-6 pb-3">
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

        <div v-if="false" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <div v-if="false" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div v-if="false" class="space-y-2">
          <div class="mb-1.5 text-sm font-medium">
            衔接功能
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="cmd in quickCmdStore.commands.filter(c => c.id.startsWith('connect-mode:'))"
              :key="cmd.id"
              class="border rounded-md p-2"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-2">
                  <input
                    :id="`connect-id-${cmd.id}`"
                    type="checkbox"
                    :checked="selectedConnectIds.includes(cmd.id)"
                    @change="(e: any) => {
                      const checked = e.target.checked
                      if (checked && !selectedConnectIds.includes(cmd.id)) selectedConnectIds.push(cmd.id)
                      else if (!checked) selectedConnectIds = selectedConnectIds.filter(k => k !== cmd.id)
                      try { connectTermsStr = JSON.stringify(Array.from(new Set(selectedConnectIds))) }
                      catch { connectTermsStr = '[]' }
                    }"
                  >
                  <label :for="`connect-id-${cmd.id}`" class="text-sm">
                    <span class="font-medium">{{ cmd.label }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="false" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    Auto-detect
                  </SelectItem>
                  <SelectItem value="zh-CN">
                    Chinese
                  </SelectItem>
                  <SelectItem value="en">
                    English
                  </SelectItem>
                  <SelectItem value="ja">
                    日本語
                  </SelectItem>
                  <SelectItem value="ko">
                    한국어
                  </SelectItem>
                  <SelectItem value="de">
                    Deutsch
                  </SelectItem>
                  <SelectItem value="fr">
                    Français
                  </SelectItem>
                  <SelectItem value="it">
                    Italiano
                  </SelectItem>
                  <SelectItem value="es">
                    Español
                  </SelectItem>
                  <SelectItem value="pt">
                    Português
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
                  <SelectItem value="zh-CN">
                    Chinese
                  </SelectItem>
                  <SelectItem value="en">
                    English
                  </SelectItem>
                  <SelectItem value="ja">
                    日本語
                  </SelectItem>
                  <SelectItem value="ko">
                    한국어
                  </SelectItem>
                  <SelectItem value="de">
                    Deutsch
                  </SelectItem>
                  <SelectItem value="fr">
                    Français
                  </SelectItem>
                  <SelectItem value="it">
                    Italiano
                  </SelectItem>
                  <SelectItem value="es">
                    Español
                  </SelectItem>
                  <SelectItem value="pt">
                    Português
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
                    Auto
                  </SelectItem>
                  <SelectItem value="formal">
                    Formal
                  </SelectItem>
                  <SelectItem value="neutral">
                    Neutral
                  </SelectItem>
                  <SelectItem value="casual">
                    Casual
                  </SelectItem>
                  <SelectItem value="polite">
                    Polite
                  </SelectItem>
                  <SelectItem value="business">
                    Business
                  </SelectItem>
                  <SelectItem value="academic">
                    Academic
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2">
            <input id="translatePreserveFormatting" v-model="translatePreserveFormatting" type="checkbox">
            <label for="translatePreserveFormatting" class="text-sm">保留格式（换行/标题/列表/Markdown/HTML）</label>
          </div>
          <div class="flex items-center gap-2">
            <input id="translatePreserveNumbersUnits" v-model="translatePreserveNumbersUnits" type="checkbox">
            <label for="translatePreserveNumbersUnits" class="text-sm">保持数字与货币格式</label>
          </div>
          <div class="flex items-center gap-2">
            <input id="translateAutoConvertUnits" v-model="translateAutoConvertUnits" type="checkbox">
            <label for="translateAutoConvertUnits" class="text-sm">自动进行单位转换（公制/英制）</label>
          </div>
          <div>
            <div class="mb-1 text-sm font-medium">
              本地化模式
            </div>
            <Select v-model="translateLocalizationMode">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Off">
                    Off
                  </SelectItem>
                  <SelectItem value="Mild">
                    Mild
                  </SelectItem>
                  <SelectItem value="Strong">
                    Strong
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="sm:col-span-2">
            <div class="mb-1 text-sm font-medium">
              术语表（可编辑，JSON）
            </div>
            <input type="file" accept=".json,application/json" class="w-full text-sm" @change="onGlossaryUpload">
            <textarea v-model="translateTerminology" rows="4" class="w-full bg-transparent border rounded px-2 py-1 text-sm" placeholder="{&quot;产品名&quot;:&quot;ProductX&quot;}" />
          </div>
        </div>

        <div v-if="false" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <div v-if="false" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div v-if="hasResult || message">
          <div class="mb-1.5 text-sm font-medium">
            可替换文本（高亮变化）
          </div>
          <div
            ref="resultContainer"
            class="custom-scroll border-border bg-background max-h-40 min-h-[60px] overflow-y-auto whitespace-pre-wrap border rounded px-3 py-2 text-sm"
          >
            <div v-if="showDiff && hasResult" v-html="diffHtml" />
            <div v-else>
              {{ replacementText }}
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
