<script setup lang="ts">
import { serviceOptions } from '@md/shared/configs'
import { Check } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import useAIConfigStore from '@/stores/aiConfig'
import useOutlineSettings from '@/stores/outlineSettings'
import { useQuickCommands } from '@/stores/quickCommands'
import { store as kvStore } from '@/utils/storage'

/* ---------- 弹窗开关 ---------- */
const props = defineProps<{ open: boolean, mode?: 'all' | 'title' | 'optimize' | 'expand' | 'connect' | 'translate' | 'summarize' | 'grammar' | 'continue' | 'outline' }>()
const emit = defineEmits([`update:open`])

const dialogOpen = ref(props.open)
watch(() => props.open, v => (dialogOpen.value = v))
watch(dialogOpen, v => emit(`update:open`, v))

/* ---------- store & 新增 ---------- */
const qcStore = useQuickCommands()
const mode = computed(() => props.mode ?? 'all')
const titleMap: Record<string, string> = {
  all: '管理快捷指令',
  title: '标题',
  optimize: '润色',
  expand: '扩展',
  connect: '衔接',
  translate: '翻译',
  summarize: '摘要',
  grammar: '纠错',
  continue: '续写',
  outline: '大纲',
}
const dialogTitle = computed(() => titleMap[mode.value] || '设置')
const currentTitleStyle = kvStore.reactive<string>('ai_title_style', 'title-style:news')
const aiStore = useAIConfigStore()
const featureType = computed(() => aiStore.getFeatureTypeRef(mode.value))
const featureModel = computed(() => aiStore.getFeatureModelRef(mode.value))
const currentService = computed(() => serviceOptions.find(s => s.value === featureType.value.value) ?? serviceOptions[0])
watch(() => featureType.value.value, (newType) => {
  const svc = serviceOptions.find(s => s.value === newType) ?? serviceOptions[0]
  if (!svc.models.includes(featureModel.value.value))
    featureModel.value.value = svc.models[0]
})
const label = ref(``)
const template = ref(``)

function genId(prefix: string) {
  const id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  return `${prefix}${id}`
}

function addCmd() {
  if (!label.value.trim() || !template.value.trim())
    return
  const lbl = label.value.trim()
  const tpl = template.value.trim()
  if (mode.value === 'title')
    qcStore.add(lbl, tpl, `title-style:${crypto.randomUUID()}`)
  else
    qcStore.add(lbl, tpl)
  label.value = ``
  template.value = ``
}

/* ---------- 共享设置（与菜单一致的键名） ---------- */
const styleId = kvStore.reactive<string>('ai_style_id', 'style:business')
const toneId = kvStore.reactive<string>('ai_tone_id', 'none')
const preserveNames = kvStore.reactive<boolean>('ai_preserve_names', true)
const polishStrength = kvStore.reactive<number>('ai_polish_strength', 60)
const polishLengthPreference = kvStore.reactive<string>('ai_polish_length_pref', '保持长度')
const polishStructureOptimization = kvStore.reactive<string>('ai_polish_structure_opt', 'none')
const polishReadabilityLevel = kvStore.reactive<string>('ai_polish_readability_level', '大众读者（高中）')
const polishCustomPrompt = kvStore.reactive<string>('ai_polish_custom', '')

const expandTermsStr = kvStore.reactive<string>('ai_expand_terms', '[]')
const selectedExpandIds = ref<string[]>([])
try {
  selectedExpandIds.value = JSON.parse(expandTermsStr.value || '[]')
}
catch {
  selectedExpandIds.value = []
}

const connectTermsStr = kvStore.reactive<string>('ai_connect_terms', '[]')
const selectedConnectIds = ref<string[]>([])
try {
  selectedConnectIds.value = JSON.parse(connectTermsStr.value || '[]')
}
catch {
  selectedConnectIds.value = []
}

function onSave() {
  try {
    expandTermsStr.value = JSON.stringify(Array.from(new Set(selectedExpandIds.value)))
  }
  catch {
    expandTermsStr.value = '[]'
  }
  dialogOpen.value = false
}

const translateSourceLanguage = kvStore.reactive<string>('ai_translate_source_lang', 'auto')
const translateTargetLanguage = kvStore.reactive<string>('ai_translate_target_lang', 'en')
const translatePreserveNamedEntities = kvStore.reactive<boolean>('ai_translate_preserve_named', true)
const translateTerminology = kvStore.reactive<string>('ai_translate_termi', '{}')
const translateFormalLevel = kvStore.reactive<string>('ai_translate_formal_level', 'auto')
const translatePreserveFormatting = kvStore.reactive<boolean>('ai_translate_preserve_formatting', true)
const translatePreserveNumbersUnits = kvStore.reactive<boolean>('ai_translate_numbers_units', true)
const translateAutoConvertUnits = kvStore.reactive<boolean>('ai_translate_units_convert', false)
const translateLocalizationMode = kvStore.reactive<string>('ai_translate_localization_mode', 'Off')

const summaryType = kvStore.reactive<string>('ai_summary_type', '精简摘要')
const summaryLength = kvStore.reactive<string>('ai_summary_length', '50-100字')
const summaryLengthCustom = kvStore.reactive<number>('ai_summary_length_custom', 100)
const preserveKeyInfo = kvStore.reactive<boolean>('ai_summary_preserve_key_info', true)
const compressionRatio = kvStore.reactive<string>('ai_summary_compression_ratio', 'auto')
const keepOriginalOpinions = kvStore.reactive<string>('ai_summary_keep_original_opinions', '可适度重述')
const structureFollowing = kvStore.reactive<string>('ai_summary_structure_following', 'mild')
const toneStyle = kvStore.reactive<string>('ai_summary_tone_style', '中性学术')
const allowTitle = kvStore.reactive<boolean>('ai_summary_allow_title', false)
const allowQuotes = kvStore.reactive<boolean>('ai_summary_allow_quotes', false)
const customInstruction = kvStore.reactive<string>('ai_summary_custom_instruction', '')

const grammarAutoFix = kvStore.reactive<string>('ai_grammar_autofix', '建议并标注')
const grammarShowInlineAnnotations = kvStore.reactive<boolean>('ai_grammar_inline', true)
const grammarLanguage = kvStore.reactive<string>('ai_grammar_lang', 'auto')
const grammarStyleGuide = kvStore.reactive<string>('ai_grammar_guide', '')

const continueStyleId = kvStore.reactive<string>('ai_continue_style_id', '')
const continueToneId = kvStore.reactive<string>('ai_continue_tone_id', 'none')
const continueMode = kvStore.reactive<string>('ai_continue_mode', '字数限制')
const wordsOrParagraphs = kvStore.reactive<number>('ai_continue_target', 200)
const snapToExistingContext = kvStore.reactive<boolean>('ai_continue_snap', true)

const continueGoal = kvStore.reactive<string>('ai_continue_goal', '补全文本')
const continueLength = kvStore.reactive<string>('ai_continue_length', '短（50–100 字）')
const continueLengthCustom = kvStore.reactive<number>('ai_continue_length_custom', 150)
const continueWritingStyle = kvStore.reactive<string>('ai_continue_writing_style', '与原文一致')
const continueTone = kvStore.reactive<string>('ai_continue_tone', '中性')
const continuePreserveOriginalInfo = kvStore.reactive<string>('ai_continue_preserve_original_info', 'strong')
const continueStoryDirection = kvStore.reactive<string>('ai_continue_story_direction', '按现有逻辑推进')
const continueConsistencyMode = kvStore.reactive<string>('ai_continue_consistency_mode', '部分模仿')
const continueForbiddenElements = kvStore.reactive<string>('ai_continue_forbidden_elements', '')
const continueStructureControl = kvStore.reactive<string>('ai_continue_structure_control', '加强过渡')
const continueCreativityLevel = kvStore.reactive<number>('ai_continue_creativity_level', 50)
const continueReadabilityLevel = kvStore.reactive<string>('ai_continue_readability_level', '大众读者')
const continueCustomInstruction = kvStore.reactive<string>('ai_continue_custom_instruction', '')

const outlineSettings = useOutlineSettings()

/* ---------- 编辑 ---------- */
const editingId = ref<string | null>(null)
const editLabel = ref(``)
const editTemplate = ref(``)

function beginEdit(cmd: { id: string, label: string, template: string }) {
  editingId.value = cmd.id
  editLabel.value = cmd.label
  editTemplate.value = cmd.template
}
function cancelEdit() {
  editingId.value = null
}
function saveEdit() {
  if (!editLabel.value.trim() || !editTemplate.value.trim())
    return
  qcStore.update(editingId.value!, editLabel.value.trim(), editTemplate.value.trim())
  editingId.value = null
}

function setCurrentTitleStyle(id: string) {
  currentTitleStyle.value = id
}

watch([
  styleId,
  toneId,
  preserveNames,
  polishStrength,
  polishLengthPreference,
  polishStructureOptimization,
  polishReadabilityLevel,
  polishCustomPrompt,
  expandTermsStr,
  connectTermsStr,
  translateSourceLanguage,
  translateTargetLanguage,
  translatePreserveNamedEntities,
  translateTerminology,
  translateFormalLevel,
  translatePreserveFormatting,
  translatePreserveNumbersUnits,
  translateAutoConvertUnits,
  translateLocalizationMode,
  summaryType,
  summaryLength,
  summaryLengthCustom,
  preserveKeyInfo,
  compressionRatio,
  keepOriginalOpinions,
  structureFollowing,
  toneStyle,
  allowTitle,
  allowQuotes,
  customInstruction,
  grammarAutoFix,
  grammarShowInlineAnnotations,
  grammarLanguage,
  grammarStyleGuide,
  continueStyleId,
  continueToneId,
  continueMode,
  wordsOrParagraphs,
  snapToExistingContext,
  continueGoal,
  continueLength,
  continueLengthCustom,
  continueWritingStyle,
  continueTone,
  continuePreserveOriginalInfo,
  continueStoryDirection,
  continueConsistencyMode,
  continueForbiddenElements,
  continueStructureControl,
  continueCreativityLevel,
  continueReadabilityLevel,
  continueCustomInstruction,
  outlineSettings.outline_granularity,
  outlineSettings.outline_depth,
  outlineSettings.outline_type,
  outlineSettings.preserve_order,
  outlineSettings.compression_level,
  outlineSettings.preserve_terms,
  outlineSettings.outline_style,
  outlineSettings.output_format,
  outlineSettings.analysis_focus,
  outlineSettings.merge_similar_points,
  outlineSettings.infer_implied_points,
  outlineSettings.allow_expansion,
  outlineSettings.custom_instruction,
], () => {})

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
  catch {}
}
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent
      class="max-h-[90vh] w-[92vw] flex flex-col sm:max-w-lg overflow-y-auto"
    >
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
      </DialogHeader>

      <!-- AI 服务与模型选择（所有单功能模式显示） -->
      <div v-if="mode !== 'all'" class="space-y-2 border rounded-md p-3">
        <div class="text-sm font-medium">
          服务类型
        </div>
        <Select v-model="featureType.value">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="svc in serviceOptions" :key="svc.value" :value="svc.value">
                {{ svc.label }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <div class="text-sm font-medium">
          模型
        </div>
        <Select v-model="featureModel.value">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="m in currentService.models" :key="m" :value="m">
                {{ m }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <!-- 列表：独立滚动区域（标题/全部） -->
      <div v-if="mode === 'all' || mode === 'title'" class="space-y-4 flex-1 overflow-y-auto pr-1">
        <div
          v-for="cmd in qcStore.commands.filter(c => mode === 'title' ? c.id.startsWith('title-style:') : true)"
          :key="cmd.id"
          class="flex flex-col gap-2 border rounded-md p-3"
        >
          <!-- 编辑态 -->
          <template v-if="editingId === cmd.id">
            <Input v-model="editLabel" placeholder="指令名称" />
            <Textarea
              v-model="editTemplate"
              rows="2"
              placeholder="模板内容，支持 {{sel}} 占位"
            />
            <div class="flex justify-end gap-2">
              <Button size="xs" @click="saveEdit">
                保存
              </Button>
              <Button variant="ghost" size="xs" @click="cancelEdit">
                取消
              </Button>
            </div>
          </template>

          <!-- 查看态 -->
          <template v-else>
            <div class="flex items-center justify-between">
              <span class="break-all text-sm flex items-center gap-2">
                <Check v-if="mode === 'title' && cmd.id === currentTitleStyle" class="h-4 w-4 text-green-600" />
                {{ cmd.label }}
              </span>
              <div class="flex gap-1">
                <Button v-if="mode === 'title'" variant="secondary" size="xs" @click="setCurrentTitleStyle(cmd.id)">
                  设为当前风格
                </Button>
                <Button variant="ghost" size="xs" @click="beginEdit(cmd)">
                  编辑
                </Button>
                <Button variant="outline" size="xs" @click="qcStore.remove(cmd.id)">
                  删除
                </Button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 新增表单：固定在滚动区下方（标题/全部） -->
      <div v-if="mode === 'all' || mode === 'title'" class="space-y-2 mt-4 border rounded-md p-3">
        <Input v-model="label" placeholder="指令名称 (如：改写为 SEO 文案)" />
        <Textarea
          v-model="template"
          rows="2"
          placeholder="模板，可用 {{sel}} 占位，例如：\n请把以下文字改写为 SEO 友好的标题：\n\n{{sel}}"
        />
        <div class="flex justify-end">
          <Button variant="secondary" size="xs" @click="addCmd">
            <Plus class="mr-2 h-4 w-4" /> 添加新提示词
          </Button>
        </div>
      </div>

      <!-- 各功能设置面板：与菜单内设置一致，移至浮窗 -->
      <div v-if="mode === 'optimize'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 border rounded-md p-3">
        <div>
          <Label class="mb-1">文风</Label>
          <Select v-model="styleId">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem v-for="opt in qcStore.commands.filter(c => c.id.startsWith('style:'))" :key="opt.id" :value="opt.id">
                  {{ opt.label }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label class="mb-1">情感（可选）</Label>
          <Select v-model="toneId">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="none">
                  无
                </SelectItem>
                <SelectItem v-for="opt in qcStore.commands.filter(c => c.id.startsWith('tone:'))" :key="opt.id" :value="opt.id">
                  {{ opt.label }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center justify-between sm:col-span-2">
          <Label>保留专有名词</Label>
          <Switch v-model:checked="preserveNames" />
        </div>

        <div>
          <Label class="mb-1">润色强度（0-100）</Label>
          <NumberField v-model="polishStrength" :min="0" :max="100" :step="5">
            <NumberFieldContent><NumberFieldInput /></NumberFieldContent>
          </NumberField>
        </div>

        <div>
          <Label class="mb-1">长度偏好</Label>
          <Select v-model="polishLengthPreference">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="保持长度">
                保持长度
              </SelectItem>
              <SelectItem value="不超过原文">
                不超过原文
              </SelectItem>
              <SelectItem value="稍微扩写（10-20%）">
                稍微扩写（10-20%）
              </SelectItem>
              <SelectItem value="适度扩写">
                适度扩写
              </SelectItem>
              <SelectItem value="显著扩写">
                显著扩写
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label class="mb-1">结构优化</Label>
          <Select v-model="polishStructureOptimization">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                none
              </SelectItem>
              <SelectItem value="mild">
                mild
              </SelectItem>
              <SelectItem value="strong">
                strong
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label class="mb-1">阅读难度</Label>
          <Select v-model="polishReadabilityLevel">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="大众读者（小学）">
                  大众读者（小学）
                </SelectItem>
                <SelectItem value="大众读者（初中）">
                  大众读者（初中）
                </SelectItem>
                <SelectItem value="大众读者（高中）">
                  大众读者（高中）
                </SelectItem>
                <SelectItem value="专业读者">
                  专业读者
                </SelectItem>
                <SelectItem value="专家读者">
                  专家读者
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="sm:col-span-2">
          <Label class="mb-1">自定义提示词</Label>
          <Textarea v-model="polishCustomPrompt" rows="2" placeholder="例如：使语言更口语化，保留技术术语。" />
        </div>
      </div>

      <div v-if="mode === 'expand'" class="space-y-3 mt-4 border rounded-md p-3">
        <div class="text-sm font-medium">
          扩写模式
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="cmd in qcStore.commands.filter(c => c.id.startsWith('expand-mode:'))"
            :key="cmd.id"
            class="border rounded-md p-2"
          >
            <template v-if="editingId === cmd.id">
              <div class="space-y-2">
                <Input v-model="editLabel" placeholder="指令名称" />
                <Textarea v-model="editTemplate" rows="2" placeholder="模板内容，支持 {{sel}} 占位" />
                <div class="flex justify-end gap-2">
                  <Button size="xs" @click="saveEdit">
                    保存
                  </Button>
                  <Button variant="ghost" size="xs" @click="cancelEdit">
                    取消
                  </Button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-2">
                  <input
                    :id="`expand-id-${cmd.id}`"
                    type="checkbox"
                    :checked="selectedExpandIds.includes(cmd.id)"
                    @change="(e: any) => {
                      const checked = e.target.checked
                      if (checked && !selectedExpandIds.includes(cmd.id)) selectedExpandIds.push(cmd.id)
                      else if (!checked) selectedExpandIds = selectedExpandIds.filter(k => k !== cmd.id)
                    }"
                  >
                  <label :for="`expand-id-${cmd.id}`" class="text-sm">
                    <span class="font-medium">{{ cmd.label }}</span>
                  </label>
                </div>
                <div class="flex gap-1">
                  <Button variant="ghost" size="xs" @click="beginEdit({ id: cmd.id, label: cmd.label, template: cmd.template })">
                    编辑
                  </Button>
                  <Button variant="outline" size="xs" @click="() => { qcStore.remove(cmd.id); selectedExpandIds = selectedExpandIds.filter(k => k !== cmd.id) }">
                    删除
                  </Button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 新增表单 -->
        <div class="space-y-2">
          <Input v-model="label" placeholder="指令名称 (如：补充案例)" />
          <Textarea v-model="template" rows="2" placeholder="模板，可用 {{sel}} 占位" />
          <div class="flex justify-end">
            <Button variant="secondary" size="xs" @click="() => { if (label && template) { qcStore.add(label, template, genId('expand-mode:')); label = ''; template = ''; } }">
              添加新提示词
            </Button>
          </div>
        </div>
      </div>

      <div v-if="mode === 'connect'" class="space-y-3 mt-4 border rounded-md p-3">
        <div class="text-sm font-medium">
          衔接功能
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="cmd in qcStore.commands.filter(c => c.id.startsWith('connect-mode:'))"
            :key="cmd.id"
            class="border rounded-md p-2"
          >
            <template v-if="editingId === cmd.id">
              <div class="space-y-2">
                <Input v-model="editLabel" placeholder="指令名称" />
                <Textarea v-model="editTemplate" rows="2" placeholder="模板内容，支持 {{sel}} 占位" />
                <div class="flex justify-end gap-2">
                  <Button size="xs" @click="saveEdit">
                    保存
                  </Button>
                  <Button variant="ghost" size="xs" @click="cancelEdit">
                    取消
                  </Button>
                </div>
              </div>
            </template>
            <template v-else>
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
                <div class="flex gap-1">
                  <Button variant="ghost" size="xs" @click="beginEdit({ id: cmd.id, label: cmd.label, template: cmd.template })">
                    编辑
                  </Button>
                  <Button
                    variant="outline" size="xs" @click="() => {
                      qcStore.remove(cmd.id);
                      selectedConnectIds = selectedConnectIds.filter(k => k !== cmd.id);
                      try { connectTermsStr = JSON.stringify(Array.from(new Set(selectedConnectIds))) }
                      catch { connectTermsStr = '[]' }
                    }"
                  >
                    删除
                  </Button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 新增表单 -->
        <div class="space-y-2">
          <Input v-model="label" placeholder="指令名称 (如：逻辑衔接)" />
          <Textarea v-model="template" rows="2" placeholder="模板，可用 {{sel}} 占位" />
          <div class="flex justify-end">
            <Button variant="secondary" size="xs" @click="() => { if (label && template) { qcStore.add(label, template, genId('connect-mode:')); label = ''; template = ''; } }">
              添加新提示词
            </Button>
          </div>
        </div>
      </div>

      <div v-if="mode === 'translate'" class="space-y-3 mt-4 border rounded-md p-3">
        <Label class="mb-1">源语言</Label>
        <Select v-model="translateSourceLanguage">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
          </SelectContent>
        </Select>

        <Label class="mb-1">目标语言</Label>
        <Select v-model="translateTargetLanguage">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
          </SelectContent>
        </Select>

        <Label class="mb-1">用语等级（Register）</Label>
        <Select v-model="translateFormalLevel">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
          </SelectContent>
        </Select>

        <div class="flex items-center justify-between">
          <Label>保留专有名词(不翻译人名/公司名)</Label>
          <Switch v-model:checked="translatePreserveNamedEntities" />
        </div>

        <div class="flex items-center justify-between">
          <Label>保留格式（换行/标题/列表/Markdown/HTML）</Label>
          <Switch v-model:checked="translatePreserveFormatting" />
        </div>
        <div class="flex items-center justify-between">
          <Label>保持数字与货币格式</Label>
          <Switch v-model:checked="translatePreserveNumbersUnits" />
        </div>
        <div class="flex items-center justify-between">
          <Label>自动进行单位转换（公制/英制）</Label>
          <Switch v-model:checked="translateAutoConvertUnits" />
        </div>

        <Label class="mb-1">本地化模式</Label>
        <Select v-model="translateLocalizationMode">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Off">
              Off
            </SelectItem>
            <SelectItem value="Mild">
              Mild
            </SelectItem>
            <SelectItem value="Strong">
              Strong
            </SelectItem>
          </SelectContent>
        </Select>

        <Label class="mb-1">术语表（JSON）</Label>
        <input type="file" accept=".json,application/json" class="w-full text-sm" @change="onGlossaryUpload">
        <Textarea v-model="translateTerminology" rows="3" />
      </div>

      <div v-if="mode === 'summarize'" class="space-y-3 mt-4 border rounded-md p-3">
        <div>
          <Label class="mb-1">摘要类型</Label>
          <Select v-model="summaryType">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="精简摘要">
                精简摘要
              </SelectItem>
              <SelectItem value="重点摘要">
                重点摘要
              </SelectItem>
              <SelectItem value="要点列表">
                要点列表
              </SelectItem>
              <SelectItem value="大纲式摘要">
                大纲式摘要
              </SelectItem>
              <SelectItem value="新闻式导语">
                新闻式导语
              </SelectItem>
              <SelectItem value="结构化摘要">
                结构化摘要
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center justify-between">
          <Label>保留关键信息（人名/机构/数字/结论）</Label>
          <Switch v-model:checked="preserveKeyInfo" />
        </div>

        <div>
          <Label class="mb-1">观点保留</Label>
          <Select v-model="keepOriginalOpinions">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="保持原样">
                摘要应保持作者观点原样
              </SelectItem>
              <SelectItem value="可适度重述">
                可适度重述
              </SelectItem>
              <SelectItem value="可重构逻辑但保留结论">
                可完全重构逻辑但保持结论一致
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label class="mb-1">结构遵循度</Label>
          <Select v-model="structureFollowing">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strict">
                严格遵循
              </SelectItem>
              <SelectItem value="mild">
                适度调整
              </SelectItem>
              <SelectItem value="reorganize">
                重新组织
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label class="mb-1">摘要语气与风格</Label>
          <Select v-model="toneStyle">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="新闻客观">
                新闻客观
              </SelectItem>
              <SelectItem value="中性学术">
                中性学术
              </SelectItem>
              <SelectItem value="简明科普">
                简明科普
              </SelectItem>
              <SelectItem value="商务正式">
                商务正式
              </SelectItem>
              <SelectItem value="轻松口语化">
                轻松口语化
              </SelectItem>
              <SelectItem value="面向儿童">
                面向儿童
              </SelectItem>
              <SelectItem value="面向初学者">
                面向初学者
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center justify-between">
          <Label>允许加入标题</Label>
          <Switch v-model:checked="allowTitle" />
        </div>
        <div class="flex items-center justify-between">
          <Label>允许引用原文关键句</Label>
          <Switch v-model:checked="allowQuotes" />
        </div>

        <div class="sm:col-span-2">
          <Label class="mb-1">自定义指令</Label>
          <Textarea v-model="customInstruction" rows="2" placeholder="如：必须列成三点、禁止使用形容词、按场景分段提炼等" />
        </div>

        <div class="text-xs text-muted-foreground">
          如启用保留关键信息，则人名、机构名、数字与结论不得改写；允许引用时，引用不超过摘要内容的30%；默认输出为 Markdown 格式。
        </div>
      </div>

      <div v-if="mode === 'grammar'" class="space-y-3 mt-4 border rounded-md p-3">
        <Label class="mb-1">自动修正策略</Label>
        <Select v-model="grammarAutoFix">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="建议并标注">
              建议并标注
            </SelectItem>
            <SelectItem value="直接替换">
              直接替换
            </SelectItem>
            <SelectItem value="仅标注">
              仅标注
            </SelectItem>
          </SelectContent>
        </Select>

        <Label class="mb-1">检查语言</Label>
        <Select v-model="grammarLanguage">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
          </SelectContent>
        </Select>

        <div class="flex items-center justify-between">
          <Label>在文本中显示注释</Label>
          <Switch v-model:checked="grammarShowInlineAnnotations" />
        </div>

        <Label class="mb-1">风格指南</Label>
        <Textarea v-model="grammarStyleGuide" rows="2" />
      </div>

      <div v-if="mode === 'continue'" class="space-y-3 mt-4 border rounded-md p-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label class="mb-1">续写目的</Label>
            <Select v-model="continueGoal">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="补全文本">
                  补全文本
                </SelectItem>
                <SelectItem value="延续叙事">
                  延续叙事
                </SelectItem>
                <SelectItem value="扩展观点">
                  扩展观点
                </SelectItem>
                <SelectItem value="深化细节">
                  深化细节
                </SelectItem>
                <SelectItem value="填补逻辑空白">
                  填补逻辑空白
                </SelectItem>
                <SelectItem value="创意剧情发展">
                  创意剧情发展
                </SelectItem>
                <SelectItem value="完成段落/章节">
                  完成段落/章节
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label class="mb-1">续写长度</Label>
            <Select v-model="continueLength">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="极短（1–2 句）">
                  极短（1–2 句）
                </SelectItem>
                <SelectItem value="短（50–100 字）">
                  短（50–100 字）
                </SelectItem>
                <SelectItem value="中长（100–300 字）">
                  中长（100–300 字）
                </SelectItem>
                <SelectItem value="长（300–800 字）">
                  长（300–800 字）
                </SelectItem>
                <SelectItem value="自定义字数">
                  自定义字数
                </SelectItem>
              </SelectContent>
            </Select>
            <div v-if="continueLength === '自定义字数'" class="mt-2">
              <Label class="mb-1">自定义字数</Label>
              <NumberField v-model="continueLengthCustom" :min="20" :max="2000" :step="10">
                <NumberFieldContent><NumberFieldInput /></NumberFieldContent>
              </NumberField>
            </div>
          </div>

          <div>
            <Label class="mb-1">续写风格</Label>
            <Select v-model="continueWritingStyle">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="与原文一致">
                  与原文一致（默认）
                </SelectItem>
                <SelectItem value="幽默">
                  幽默
                </SelectItem>
                <SelectItem value="严肃">
                  严肃
                </SelectItem>
                <SelectItem value="温柔">
                  温柔
                </SelectItem>
                <SelectItem value="说服力强">
                  说服力强
                </SelectItem>
                <SelectItem value="小说风">
                  小说风
                </SelectItem>
                <SelectItem value="商务风">
                  商务风
                </SelectItem>
                <SelectItem value="学术风">
                  学术风
                </SelectItem>
                <SelectItem value="公众号风">
                  公众号风
                </SelectItem>
                <SelectItem value="影视解说风">
                  影视解说风
                </SelectItem>
                <SelectItem value="剧情旁白风">
                  剧情旁白风
                </SelectItem>
                <SelectItem value="故事化叙述">
                  故事化叙述
                </SelectItem>
                <SelectItem value="自定义">
                  自定义
                </SelectItem>
              </SelectContent>
            </Select>
            <Textarea v-if="continueWritingStyle === '自定义'" v-model="continueWritingStyle" rows="2" class="mt-2" placeholder="如：模仿《三体》的克制科幻风" />
          </div>

          <div>
            <Label class="mb-1">语气</Label>
            <Select v-model="continueTone">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="中性">
                  中性
                </SelectItem>
                <SelectItem value="愤怒">
                  愤怒
                </SelectItem>
                <SelectItem value="欢快">
                  欢快
                </SelectItem>
                <SelectItem value="悲伤">
                  悲伤
                </SelectItem>
                <SelectItem value="激昂">
                  激昂
                </SelectItem>
                <SelectItem value="冷静理性">
                  冷静理性
                </SelectItem>
                <SelectItem value="轻松口语化">
                  轻松口语化
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label class="mb-1">保留原文信息</Label>
            <Select v-model="continuePreserveOriginalInfo">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strong">
                  强（不得违背原文）
                </SelectItem>
                <SelectItem value="medium">
                  中（允许小幅突破）
                </SelectItem>
                <SelectItem value="weak">
                  弱（可自由创作）
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label class="mb-1">剧情推进方向</Label>
            <Select v-model="continueStoryDirection">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="按现有逻辑推进">
                  按现有逻辑推进
                </SelectItem>
                <SelectItem value="引入新冲突">
                  引入新冲突
                </SelectItem>
                <SelectItem value="反转剧情">
                  反转剧情
                </SelectItem>
                <SelectItem value="情绪爆发">
                  情绪爆发
                </SelectItem>
                <SelectItem value="解释前文悬念">
                  解释前文悬念
                </SelectItem>
                <SelectItem value="增强世界观设定">
                  增强世界观设定
                </SelectItem>
                <SelectItem value="加深人物关系">
                  加深人物关系
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label class="mb-1">内容一致性</Label>
            <Select v-model="continueConsistencyMode">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="完全模仿">
                  完全模仿
                </SelectItem>
                <SelectItem value="部分模仿">
                  部分模仿
                </SelectItem>
                <SelectItem value="自由表达">
                  自由表达
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label class="mb-1">禁止项（逗号分隔）</Label>
            <Textarea v-model="continueForbiddenElements" rows="2" placeholder="如：不要新的角色，不要网络用语，不要总结" />
          </div>

          <div>
            <Label class="mb-1">逻辑结构控制</Label>
            <Select v-model="continueStructureControl">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="紧跟上一句">
                  紧跟上一句
                </SelectItem>
                <SelectItem value="扩展上一段内容">
                  扩展上一段内容
                </SelectItem>
                <SelectItem value="增加细节">
                  增加细节
                </SelectItem>
                <SelectItem value="加强过渡">
                  加强过渡
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label class="mb-1">创意自由度（0–100）</Label>
            <NumberField v-model="continueCreativityLevel" :min="0" :max="100" :step="5">
              <NumberFieldContent><NumberFieldInput /></NumberFieldContent>
            </NumberField>
          </div>

          <div>
            <Label class="mb-1">阅读难度</Label>
            <Select v-model="continueReadabilityLevel">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="小学">
                  小学
                </SelectItem>
                <SelectItem value="初中">
                  初中
                </SelectItem>
                <SelectItem value="高中">
                  高中
                </SelectItem>
                <SelectItem value="大众读者">
                  大众读者
                </SelectItem>
                <SelectItem value="专业读者">
                  专业读者
                </SelectItem>
                <SelectItem value="学术级">
                  学术级
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="sm:col-span-2">
            <Label class="mb-1">自定义指令（最高优先）</Label>
            <Textarea v-model="continueCustomInstruction" rows="3" placeholder="如：必须保持第一人称、继续以对话形式写、增加场景描写、不要出现时间跳跃" />
          </div>
        </div>
      </div>

      <div v-if="mode === 'outline'" class="space-y-3 mt-4 border rounded-md p-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label class="mb-1">大纲粒度</Label>
            <Select v-model="outlineSettings.outline_granularity.value">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="粗略">
                  粗略（三大点结构）
                </SelectItem>
                <SelectItem value="中等">
                  中等（3–6 个要点）
                </SelectItem>
                <SelectItem value="精细">
                  精细（6–12 个要点）
                </SelectItem>
                <SelectItem value="超细">
                  超细（每句话一个要点）
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label class="mb-1">大纲层级</Label>
            <Select v-model="outlineSettings.outline_depth.value">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="单层">
                  单层
                </SelectItem>
                <SelectItem value="两层">
                  两层（大点+小点）
                </SelectItem>
                <SelectItem value="三层">
                  三层（大点+小点+例证）
                </SelectItem>
                <SelectItem value="自动按内容判断">
                  自动按内容判断
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="sm:col-span-2">
            <Label class="mb-1">大纲类型</Label>
            <Select v-model="outlineSettings.outline_type.value">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="逻辑结构">
                  逻辑结构（总—分 / 并列 / 对比）
                </SelectItem>
                <SelectItem value="论证结构">
                  论证结构（观点—论据—例子）
                </SelectItem>
                <SelectItem value="叙事结构">
                  叙事结构（时间线 / 冲突推进 / 事件拆分）
                </SelectItem>
                <SelectItem value="产品文案框架">
                  产品文案框架（痛点—方案—亮点）
                </SelectItem>
                <SelectItem value="学术论文框架">
                  学术论文框架（研究对象—方法—结论）
                </SelectItem>
                <SelectItem value="公众号框架">
                  公众号框架（开头抓点—核心观点—案例—总结）
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center justify-between sm:col-span-2">
            <Label>是否保留原文顺序</Label>
            <Switch v-model:checked="outlineSettings.preserve_order.value" />
          </div>
          <div>
            <Label class="mb-1">总结 vs 提炼程度</Label>
            <Select v-model="outlineSettings.compression_level.value">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="逐句拆解">
                  逐句拆解
                </SelectItem>
                <SelectItem value="稍作总结">
                  稍作总结
                </SelectItem>
                <SelectItem value="适度压缩">
                  适度压缩
                </SelectItem>
                <SelectItem value="大幅抽象">
                  大幅抽象
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center justify-between">
            <Label>保留原文关键术语</Label>
            <Switch v-model:checked="outlineSettings.preserve_terms.value" />
          </div>
          <div>
            <Label class="mb-1">风格</Label>
            <Select v-model="outlineSettings.outline_style.value">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="直述">
                  直述
                </SelectItem>
                <SelectItem value="简洁短句">
                  简洁短句
                </SelectItem>
                <SelectItem value="关键词式">
                  关键词式
                </SelectItem>
                <SelectItem value="解释式">
                  解释式
                </SelectItem>
                <SelectItem value="行动项格式">
                  行动项格式
                </SelectItem>
                <SelectItem value="问题—对策">
                  问题—对策
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label class="mb-1">输出格式</Label>
            <Select v-model="outlineSettings.output_format.value">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">
                  Markdown
                </SelectItem>
                <SelectItem value="list">
                  列表（1. 2. 3.）
                </SelectItem>
                <SelectItem value="mindmap">
                  思维导图结构
                </SelectItem>
                <SelectItem value="json">
                  JSON
                </SelectItem>
                <SelectItem value="outline-plus-summary">
                  大纲+简短摘要
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label class="mb-1">分析重点</Label>
            <Select v-model="outlineSettings.analysis_focus.value">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="提炼观点">
                  提炼观点
                </SelectItem>
                <SelectItem value="提炼事实">
                  提炼事实
                </SelectItem>
                <SelectItem value="提取论证链条">
                  提取论证链条
                </SelectItem>
                <SelectItem value="抓情绪/冲突点">
                  抓情绪 / 冲突点
                </SelectItem>
                <SelectItem value="拆结构逻辑">
                  拆结构逻辑
                </SelectItem>
                <SelectItem value="抓人物动机">
                  抓人物动机
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center justify-between">
            <Label>是否合并冗余信息</Label>
            <Switch v-model:checked="outlineSettings.merge_similar_points.value" />
          </div>
          <div class="flex items-center justify-between">
            <Label>是否识别隐含信息</Label>
            <Switch v-model:checked="outlineSettings.infer_implied_points.value" />
          </div>
          <div class="flex items-center justify-between sm:col-span-2">
            <Label>是否允许扩展</Label>
            <Switch v-model:checked="outlineSettings.allow_expansion.value" />
          </div>
          <div class="sm:col-span-2">
            <Label class="mb-1">自定义指令</Label>
            <Textarea v-model="outlineSettings.custom_instruction.value" rows="2" placeholder="如：必须列成三点、不得加入结论、保留术语等" />
          </div>
        </div>
      </div>

      <!-- 底部保存按钮（所有模式） -->
      <div class="mt-3">
        <Button class="w-full" @click="onSave">
          保存
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
