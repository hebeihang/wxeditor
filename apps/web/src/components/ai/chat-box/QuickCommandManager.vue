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

function onSave() {
  dialogOpen.value = false
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

const expandMode = kvStore.reactive<string>('ai_expand_mode', '倍数扩写')
const expandFactor = kvStore.reactive<number>('ai_expand_factor', 2.0)
const targetWords = kvStore.reactive<number>('ai_expand_target_words', 300)
const addExamples = kvStore.reactive<boolean>('ai_expand_add_examples', true)
const expandCustomPrompt = kvStore.reactive<string>('ai_expand_custom', '')

const connectStyleId = kvStore.reactive<string>('ai_connect_style_id', '')
const connectToneId = kvStore.reactive<string>('ai_connect_tone_id', 'none')
const connectScope = kvStore.reactive<string>('ai_connect_scope', '句间衔接')
const connectPreserveLength = kvStore.reactive<boolean>('ai_connect_preserve_len', false)
const connectCustomPrompt = kvStore.reactive<string>('ai_connect_custom', '')

const translateSourceLanguage = kvStore.reactive<string>('ai_translate_source_lang', 'auto')
const translateTargetLanguage = kvStore.reactive<string>('ai_translate_target_lang', 'en')
const translatePreserveNamedEntities = kvStore.reactive<boolean>('ai_translate_preserve_named', true)
const translateTerminology = kvStore.reactive<string>('ai_translate_termi', '{}')
const translateFormalLevel = kvStore.reactive<string>('ai_translate_formal_level', 'auto')

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
  expandMode,
  expandFactor,
  targetWords,
  addExamples,
  expandCustomPrompt,
  connectStyleId,
  connectToneId,
  connectScope,
  connectPreserveLength,
  connectCustomPrompt,
  translateSourceLanguage,
  translateTargetLanguage,
  translatePreserveNamedEntities,
  translateTerminology,
  translateFormalLevel,
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
      <div v-if="mode === 'optimize'" class="space-y-3 mt-4 border rounded-md p-3">
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

        <div class="flex items-center justify-between">
          <Label>保留专有名词</Label>
          <Switch v-model:checked="preserveNames" />
        </div>

        <Label class="mb-1">润色强度（0-100）</Label>
        <NumberField v-model="polishStrength" :min="0" :max="100" :step="5">
          <NumberFieldContent><NumberFieldInput /></NumberFieldContent>
        </NumberField>

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

        <Label class="mb-1">阅读难度</Label>
        <Select v-model="polishReadabilityLevel">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
          </SelectContent>
        </Select>

        <Label class="mb-1">自定义提示词</Label>
        <Textarea v-model="polishCustomPrompt" rows="2" placeholder="例如：使语言更口语化，保留技术术语。" />
      </div>

      <div v-if="mode === 'expand'" class="space-y-3 mt-4 border rounded-md p-3">
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

        <Label class="mb-1">情感（可选）</Label>
        <Select v-model="toneId">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">
                无
              </SelectItem>
              <SelectItem v-for="opt in qcStore.commands.filter(c => c.id.startsWith('tone:'))" :key="opt.id" :value="opt.id">
                {{ opt.label }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Label class="mb-1">扩写模式</Label>
        <Select v-model="expandMode">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="倍数扩写">
              倍数扩写
            </SelectItem>
            <SelectItem value="目标字数">
              目标字数
            </SelectItem>
            <SelectItem value="补充要点">
              补充要点
            </SelectItem>
          </SelectContent>
        </Select>

        <Label class="mb-1">扩写倍数</Label>
        <NumberField v-model="expandFactor" :min="1" :max="10" :step="0.5">
          <NumberFieldContent><NumberFieldInput /></NumberFieldContent>
        </NumberField>

        <Label class="mb-1">目标字数</Label>
        <NumberField v-model="targetWords" :min="50" :max="10000" :step="50">
          <NumberFieldContent><NumberFieldInput /></NumberFieldContent>
        </NumberField>

        <div class="flex items-center justify-between">
          <Label>添加示例/案例</Label>
          <Switch v-model:checked="addExamples" />
        </div>

        <Label class="mb-1">自定义提示词</Label>
        <Textarea v-model="expandCustomPrompt" rows="2" />
      </div>

      <div v-if="mode === 'connect'" class="space-y-3 mt-4 border rounded-md p-3">
        <Label class="mb-1">文风</Label>
        <Select v-model="connectStyleId">
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

        <Label class="mb-1">情感</Label>
        <Select v-model="connectToneId">
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

        <Label class="mb-1">衔接范围</Label>
        <Select v-model="connectScope">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
          </SelectContent>
        </Select>

        <div class="flex items-center justify-between">
          <Label>尽量保持原文长度</Label>
          <Switch v-model:checked="connectPreserveLength" />
        </div>

        <Label class="mb-1">自定义指令</Label>
        <Textarea v-model="connectCustomPrompt" rows="2" />
      </div>

      <div v-if="mode === 'translate'" class="space-y-3 mt-4 border rounded-md p-3">
        <Label class="mb-1">源语言</Label>
        <Select v-model="translateSourceLanguage">
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
          </SelectContent>
        </Select>

        <Label class="mb-1">目标语言</Label>
        <Select v-model="translateTargetLanguage">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
          </SelectContent>
        </Select>

        <Label class="mb-1">用语等级</Label>
        <Select v-model="translateFormalLevel">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">
              auto
            </SelectItem>
            <SelectItem value="formal">
              formal
            </SelectItem>
            <SelectItem value="casual">
              casual
            </SelectItem>
          </SelectContent>
        </Select>

        <div class="flex items-center justify-between">
          <Label>保留专有名词(不翻译人名/公司名)</Label>
          <Switch v-model:checked="translatePreserveNamedEntities" />
        </div>

        <Label class="mb-1">术语表（JSON）</Label>
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
