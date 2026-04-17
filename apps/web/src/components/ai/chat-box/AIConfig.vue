<script setup lang="ts">
import { serviceOptions } from '@md/shared/configs'
import { DEFAULT_SERVICE_TYPE } from '@md/shared/constants'
import { Check, Info } from 'lucide-vue-next'
import { PasswordInput } from '@/components/ui/password-input'
import { Textarea } from '@/components/ui/textarea'
import useAIConfigStore from '@/stores/aiConfig'
import { useQuickCommands } from '@/stores/quickCommands'
import { store } from '@/utils/storage'

/* -------------------------- 基础数据 -------------------------- */

const emit = defineEmits([`saved`])

const AIConfigStore = useAIConfigStore()
const { type, endpoint, model, apiKey, temperature, maxToken } = storeToRefs(AIConfigStore)

const quickCmdStore = useQuickCommands()
const generalStyleId = store.reactive<string>('ai_general_style', 'general-style:consistent')
const generalStyles = computed(() => quickCmdStore.commands.filter(c => c.id.startsWith('general-style:')))
const currentGeneral = computed(() => quickCmdStore.commands.find(c => c.id === generalStyleId.value) || null)
const editingGeneralId = ref<string | null>(null)
const editGeneralLabel = ref('')
const editGeneralTemplate = ref('')
const newGeneralLabel = ref('')
const newGeneralTemplate = ref('')

/** UI 状态 */
const loading = ref(false)
const testResult = ref(``)

/** 当前服务信息 */
const currentService = computed(
  () => serviceOptions.find(s => s.value === type.value) || serviceOptions[0],
)

/* -------------------------- 监听 -------------------------- */

// 监听服务类型变化，清空测试结果
watch(type, () => {
  testResult.value = ``
})

// 监听模型变化，清空测试结果
watch(model, () => {
  testResult.value = ``
})

/* -------------------------- 操作 -------------------------- */

function saveConfig(emitEvent = true) {
  if (emitEvent) {
    testResult.value = `✅ 配置已保存`
    emit(`saved`)
  }
}

function clearConfig() {
  AIConfigStore.reset()
  testResult.value = `🗑️ 当前 AI 配置已清除`
}

async function testConnection() {
  testResult.value = ``
  loading.value = true

  const headers: Record<string, string> = { 'Content-Type': `application/json` }
  if (apiKey.value && type.value !== DEFAULT_SERVICE_TYPE)
    headers.Authorization = `Bearer ${apiKey.value}`

  try {
    const url = new URL(endpoint.value)
    if (!url.pathname.endsWith(`/chat/completions`))
      url.pathname = url.pathname.replace(/\/?$/, `/chat/completions`)

    const payload = {
      model: model.value,
      messages: ([{ role: `user`, content: `ping` }] as Array<{ role: 'system' | 'user' | 'assistant', content: string }>),
      temperature: 0,
      max_tokens: 1,
      stream: false,
    }

    const res = await window.fetch(url.toString(), {
      method: `POST`,
      headers,
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      testResult.value = `✅ 测试成功，/chat/completions 可用`
      saveConfig(false)
    }
    else {
      const text = await res.text()
      try {
        const { error } = JSON.parse(text)
        if (
          res.status === 404
          && (error?.code === `ModelNotOpen`
            || /not activated|未开通/i.test(error?.message))
        ) {
          testResult.value = `⚠️ 测试成功，但当前模型未开通：${model.value}`
          saveConfig(false)
          return
        }
      }
      catch {}
      testResult.value = `❌ 测试失败：${res.status} ${res.statusText}，${text}`
    }
  }
  catch (err) {
    testResult.value = `❌ 测试失败：${(err as Error).message}`
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  const id = 'general-style:consistent'
  const existed = quickCmdStore.commands.find(c => c.id === id)
  const newTpl = '在后续生成中，请尽量保持整体风格、情绪与格式与原文一致或相近，允许少量调整，不要出现明显偏差。'
  if (!existed)
    quickCmdStore.add('保持一致', newTpl, id)
  else if (/严格遵守|段落字数保持一致|风格保持一致|情绪保持一致|格式保持一致/.test(existed.template))
    quickCmdStore.update(id, existed.label, newTpl)
  if (!generalStyles.value.find(c => c.id === generalStyleId.value))
    generalStyleId.value = id
})

function beginEditGeneral(cmd: { id: string, label: string, template: string }) {
  editingGeneralId.value = cmd.id
  editGeneralLabel.value = cmd.label
  editGeneralTemplate.value = cmd.template
}
function cancelEditGeneral() {
  editingGeneralId.value = null
}
function saveEditGeneral() {
  if (!editGeneralLabel.value.trim() || !editGeneralTemplate.value.trim())
    return
  quickCmdStore.update(editingGeneralId.value!, editGeneralLabel.value.trim(), editGeneralTemplate.value.trim())
  editingGeneralId.value = null
}
function setCurrentGeneralStyle(id: string) {
  generalStyleId.value = id
}
function addGeneral() {
  if (!newGeneralLabel.value.trim() || !newGeneralTemplate.value.trim())
    return
  const label = newGeneralLabel.value.trim()
  const template = newGeneralTemplate.value.trim()
  const id = `general-style:${crypto.randomUUID()}`
  quickCmdStore.add(label, template, id)
  generalStyleId.value = id
  newGeneralLabel.value = ''
  newGeneralTemplate.value = ''
}
function removeGeneral(id?: string) {
  const targetId = id || editingGeneralId.value || currentGeneral.value?.id
  if (!targetId)
    return
  quickCmdStore.remove(targetId)
  if (editingGeneralId.value === targetId)
    editingGeneralId.value = null
  const fallback = generalStyles.value[0]
  generalStyleId.value = fallback ? fallback.id : 'general-style:consistent'
}
</script>

<template>
  <div class="custom-scroll space-y-4 max-h-[calc(100dvh-10rem)] overflow-y-auto pr-1 text-xs sm:max-h-none sm:text-sm">
    <div class="font-medium">
      AI 配置
    </div>

    <!-- 服务类型 -->
    <div>
      <Label class="mb-1 block text-sm font-medium">服务类型</Label>
      <Select v-model="type">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ currentService.label }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="service in serviceOptions"
            :key="service.value"
            :value="service.value"
          >
            {{ service.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- API 端点 -->
    <div v-if="type !== DEFAULT_SERVICE_TYPE">
      <Label class="mb-1 block text-sm font-medium">API 端点</Label>
      <Input
        v-model="endpoint"
        placeholder="输入 API 端点 URL"
        class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
      />
    </div>

    <!-- API 密钥，仅非 default 显示 -->
    <div v-if="type !== DEFAULT_SERVICE_TYPE">
      <Label class="mb-1 block text-sm font-medium">API 密钥</Label>
      <PasswordInput
        v-model="apiKey"
        placeholder="sk-..."
        class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
      />
    </div>

    <!-- 模型名称 -->
    <div>
      <Label class="mb-1 block text-sm font-medium">模型名称</Label>
      <Select v-if="currentService.models.length > 0" v-model="model">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ model || '请选择模型' }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="_model in currentService.models"
            :key="_model"
            :value="_model"
          >
            {{ _model }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Input
        v-else
        v-model="model"
        placeholder="输入模型名称"
        class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
      />
    </div>

    <!-- 温度 temperature -->
    <div>
      <Label class="mb-1 flex items-center gap-1 text-sm font-medium">
        温度
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Info class="text-gray-500" :size="16" />
            </TooltipTrigger>
            <TooltipContent side="top" class="z-[250]">
              <div>控制输出的随机性：较小值使输出更确定，较大值使其更随机。</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Label>
      <Input
        v-model.number="temperature"
        type="number"
        step="0.1"
        min="0"
        max="2"
        placeholder="0 ~ 2，默认 1"
        class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
      />
    </div>

    <!-- 最大 Token 数 -->
    <div>
      <Label class="mb-1 block text-sm font-medium">最大 Token 数</Label>
      <Input
        v-model.number="maxToken"
        type="number"
        min="1"
        max="32768"
        placeholder="比如 1024"
        class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
      />
    </div>

    <!-- 通用前置提示词（列表 + 编辑 + 新增，样式对齐标题提示词） -->
    <div>
      <Label class="mb-1 block text-sm font-medium">通用前置提示词</Label>

      <div class="space-y-3">
        <div
          v-for="cmd in generalStyles"
          :key="cmd.id"
          class="flex flex-col gap-2 border rounded-md p-3"
        >
          <template v-if="editingGeneralId === cmd.id">
            <Input v-model="editGeneralLabel" placeholder="提示词名称" />
            <Textarea v-model="editGeneralTemplate" rows="3" placeholder="提示词内容" />
            <div class="flex justify-end gap-2">
              <Button size="xs" @click="saveEditGeneral">
                保存
              </Button>
              <Button variant="ghost" size="xs" @click="cancelEditGeneral">
                取消
              </Button>
            </div>
          </template>

          <template v-else>
            <div class="flex items-center justify-between">
              <span class="break-all text-sm flex items-center gap-2">
                <Check v-if="cmd.id === generalStyleId" class="h-4 w-4 text-green-600" />
                {{ cmd.label }}
              </span>
              <div class="flex gap-1">
                <Button variant="secondary" size="xs" @click="setCurrentGeneralStyle(cmd.id)">
                  设为当前
                </Button>
                <Button variant="ghost" size="xs" @click="beginEditGeneral(cmd)">
                  编辑
                </Button>
                <Button variant="outline" size="xs" @click="removeGeneral(cmd.id)">
                  删除
                </Button>
              </div>
            </div>
          </template>
        </div>

        <div class="space-y-2 border rounded-md p-3">
          <Input v-model="newGeneralLabel" placeholder="提示词名称 (如：保持一致)" />
          <Textarea v-model="newGeneralTemplate" rows="3" placeholder="提示词内容" />
          <div class="flex justify-end">
            <Button variant="secondary" size="xs" @click="addGeneral">
              添加新提示词
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮区域 -->
    <div class="mt-2 flex flex-col gap-2 sm:flex-row">
      <Button size="sm" @click="saveConfig">
        保存
      </Button>
      <Button size="sm" variant="ghost" @click="clearConfig">
        清空
      </Button>
      <Button
        size="sm"
        variant="outline"
        :disabled="loading"
        @click="testConnection"
      >
        {{ loading ? '测试中...' : '测试连接' }}
      </Button>
    </div>

    <!-- 测试结果显示 -->
    <div v-if="testResult" class="mt-1 text-xs text-gray-500">
      {{ testResult }}
    </div>
  </div>
</template>

<style scoped>
@reference 'tailwindcss';

.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
@media (pointer: coarse) {
  /* 触屏设备更细 */
  .custom-scroll::-webkit-scrollbar {
    width: 3px;
  }
}

.custom-scroll::-webkit-scrollbar-thumb {
  @apply rounded-full bg-gray-400/40 hover:bg-gray-400/60;
  @apply dark:bg-gray-500/40 dark:hover:bg-gray-500/70;
}
.custom-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(156 163 175 / 0.4) transparent;
}
.dark .custom-scroll {
  scrollbar-color: rgb(107 114 128 / 0.4) transparent;
}
</style>
