<script setup lang="ts">
import { serviceOptions } from '@md/shared/configs'
import { Check } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import useAIConfigStore from '@/stores/aiConfig'
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

const summarizeStyleId = kvStore.reactive<string>('ai_summarize_style_id', '')
const summarizeCompressionMode = kvStore.reactive<string>('ai_summarize_mode', '百分比')
const summarizeCompressionValue = kvStore.reactive<number>('ai_summarize_val', 30)
const summarizePreserveKeyPoints = kvStore.reactive<boolean>('ai_summarize_keep_key', true)
const summarizeExplainOmissions = kvStore.reactive<boolean>('ai_summarize_explain', false)

const grammarAutoFix = kvStore.reactive<string>('ai_grammar_autofix', '建议并标注')
const grammarShowInlineAnnotations = kvStore.reactive<boolean>('ai_grammar_inline', true)
const grammarLanguage = kvStore.reactive<string>('ai_grammar_lang', 'auto')
const grammarStyleGuide = kvStore.reactive<string>('ai_grammar_guide', '')

const continueStyleId = kvStore.reactive<string>('ai_continue_style_id', '')
const continueToneId = kvStore.reactive<string>('ai_continue_tone_id', 'none')
const continueMode = kvStore.reactive<string>('ai_continue_mode', '字数限制')
const wordsOrParagraphs = kvStore.reactive<number>('ai_continue_target', 200)
const snapToExistingContext = kvStore.reactive<boolean>('ai_continue_snap', true)

const outlineStyleId = kvStore.reactive<string>('ai_outline_style_id', '')
const outlineLevels = kvStore.reactive<number>('ai_outline_levels', 2)
const outlineTargetSections = kvStore.reactive<number>('ai_outline_sections', 5)
const includeParagraphSamples = kvStore.reactive<boolean>('ai_outline_samples', true)

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
  summarizeStyleId,
  summarizeCompressionMode,
  summarizeCompressionValue,
  summarizePreserveKeyPoints,
  summarizeExplainOmissions,
  grammarAutoFix,
  grammarShowInlineAnnotations,
  grammarLanguage,
  grammarStyleGuide,
  continueStyleId,
  continueToneId,
  continueMode,
  wordsOrParagraphs,
  snapToExistingContext,
  outlineStyleId,
  outlineLevels,
  outlineTargetSections,
  includeParagraphSamples,
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
        <Label class="mb-1">输出文风</Label>
        <Select v-model="summarizeStyleId">
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

        <Label class="mb-1">压缩模式</Label>
        <Select v-model="summarizeCompressionMode">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="百分比">
              百分比
            </SelectItem>
            <SelectItem value="目标字数">
              目标字数
            </SelectItem>
          </SelectContent>
        </Select>

        <Label class="mb-1">百分比或目标字数</Label>
        <NumberField v-model="summarizeCompressionValue" :min="5" :max="100" :step="5">
          <NumberFieldContent><NumberFieldInput /></NumberFieldContent>
        </NumberField>

        <div class="flex items-center justify-between">
          <Label>优先保留关键要点</Label>
          <Switch v-model:checked="summarizePreserveKeyPoints" />
        </div>
        <div class="flex items-center justify-between">
          <Label>说明被省略的重要信息</Label>
          <Switch v-model:checked="summarizeExplainOmissions" />
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
        <Label class="mb-1">延续文风</Label>
        <Select v-model="continueStyleId">
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

        <Label class="mb-1">情感（可选）</Label>
        <Select v-model="continueToneId">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              无
            </SelectItem>
            <SelectItem v-for="opt in qcStore.commands.filter(c => c.id.startsWith('tone:'))" :key="opt.id" :value="opt.id">
              {{ opt.label }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Label class="mb-1">续写模式</Label>
        <Select v-model="continueMode">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="字数限制">
              字数限制
            </SelectItem>
            <SelectItem value="段落数量">
              段落数量
            </SelectItem>
            <SelectItem value="情节推进">
              情节推进
            </SelectItem>
          </SelectContent>
        </Select>

        <Label class="mb-1">目标（字数或段落）</Label>
        <NumberField v-model="wordsOrParagraphs" :min="20" :max="5000" :step="20">
          <NumberFieldContent><NumberFieldInput /></NumberFieldContent>
        </NumberField>

        <div class="flex items-center justify-between">
          <Label>严格衔接现有上下文</Label>
          <Switch v-model:checked="snapToExistingContext" />
        </div>
      </div>

      <div v-if="mode === 'outline'" class="space-y-3 mt-4 border rounded-md p-3">
        <Label class="mb-1">目标文风</Label>
        <Select v-model="outlineStyleId">
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

        <Label class="mb-1">大纲深度</Label>
        <NumberField v-model="outlineLevels" :min="1" :max="4" :step="1">
          <NumberFieldContent><NumberFieldInput /></NumberFieldContent>
        </NumberField>

        <Label class="mb-1">目标章节数</Label>
        <NumberField v-model="outlineTargetSections" :min="1" :max="20" :step="1">
          <NumberFieldContent><NumberFieldInput /></NumberFieldContent>
        </NumberField>

        <div class="flex items-center justify-between">
          <Label>为要点生成示例段落（简短）</Label>
          <Switch v-model:checked="includeParagraphSamples" />
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
