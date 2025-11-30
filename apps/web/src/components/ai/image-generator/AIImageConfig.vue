<script setup lang="ts">
import { imageServiceOptions } from '@md/shared/configs'
import { DEFAULT_SERVICE_TYPE } from '@md/shared/constants'
import { Info } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import useAIImageConfigStore from '@/stores/aiImageConfig'

/* -------------------------- 基础数据 -------------------------- */

const emit = defineEmits([`saved`])

const AIImageConfigStore = useAIImageConfigStore()
const { type, endpoint, model, apiKey, size, quality, style, stylePreset, resolution, composition, mood, color_tone, lighting, detail_level, negative_prompt, num_images, seed, prompt_enhancement, safety_level, allow_style_reference, character_consistency, custom_instruction } = storeToRefs(AIImageConfigStore)

/** UI 状态 */
const loading = ref(false)
const testResult = ref(``)

/** 当前服务信息 */
const currentService = computed(
  () => imageServiceOptions.find(s => s.value === type.value) || imageServiceOptions[0],
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

// 监听端点变化，清空测试结果
watch(endpoint, () => {
  testResult.value = ``
})

/* -------------------------- 表单提交 -------------------------- */

function saveConfig() {
  if (!endpoint.value.trim() || !model.value.trim()) {
    testResult.value = `❌ 请检查配置项是否完整`
    return
  }

  if (type.value !== DEFAULT_SERVICE_TYPE && !apiKey.value.trim()) {
    testResult.value = `❌ 请输入 API Key`
    return
  }

  try {
    // eslint-disable-next-line no-new
    new URL(endpoint.value)
  }
  catch {
    testResult.value = `❌ 端点格式有误`
    return
  }

  testResult.value = `✅ 配置已保存`
  emit(`saved`)
}

function clearConfig() {
  AIImageConfigStore.reset()
  testResult.value = `🗑️ 当前 AI 图像配置已清除`
}

async function testConnection() {
  testResult.value = ``
  loading.value = true

  const headers: Record<string, string> = { 'Content-Type': `application/json` }
  if (apiKey.value && type.value !== DEFAULT_SERVICE_TYPE)
    headers.Authorization = `Bearer ${apiKey.value}`

  try {
    const url = new URL(endpoint.value)
    if (!url.pathname.includes(`/images/`) && !url.pathname.endsWith(`/images/generations`)) {
      url.pathname = url.pathname.replace(/\/?$/, `/images/generations`)
    }

    const payload = {
      model: model.value,
      prompt: `test connection`,
      size: size.value,
      quality: quality.value,
      style: style.value,
      n: 1,
    }

    const res = await window.fetch(url.toString(), {
      method: `POST`,
      headers,
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      testResult.value = `✅ 连接成功`
    }
    else {
      const errorText = await res.text()
      testResult.value = `❌ 连接失败：${res.status} ${errorText}`
    }
  }
  catch (error) {
    testResult.value = `❌ 连接失败：${(error as Error).message}`
  }
  finally {
    loading.value = false
  }
}

/* -------------------------- 图像尺寸选项 -------------------------- */

const sizeOptions = [
  { label: `正方形 (1024x1024)`, value: `1024x1024` },
  { label: `横版 (1792x1024)`, value: `1792x1024` },
  { label: `竖版 (1024x1792)`, value: `1024x1792` },
]

const qualityOptions = [
  { label: `标准`, value: `standard` },
  { label: `高清`, value: `hd` },
]

const styleOptions = [
  { label: `自然`, value: `natural` },
  { label: `鲜明`, value: `vivid` },
]
</script>

<template>
  <div class="space-y-4 max-w-full">
    <div class="text-lg font-semibold border-b pb-2">
      AI 图像生成配置
    </div>

    <!-- 服务商选择 -->
    <div>
      <Label class="mb-1 block text-sm font-medium">服务商</Label>
      <Select v-model="type">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ currentService.label }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in imageServiceOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- 端点配置 -->
    <div>
      <Label class="mb-1 block text-sm font-medium">API 端点</Label>
      <input
        v-model="endpoint"
        type="url"
        class="w-full mt-1 p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        placeholder="https://api.openai.com/v1"
        :readonly="type !== 'custom'"
      >
    </div>

    <!-- API Key -->
    <div v-if="type !== 'default'">
      <Label class="mb-1 block text-sm font-medium">API Key</Label>
      <PasswordInput
        v-model="apiKey"
        class="w-full mt-1 focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        placeholder="sk-..."
      />
    </div>

    <!-- 模型选择 -->
    <div>
      <Label class="mb-1 block text-sm font-medium">模型</Label>
      <Select v-if="type !== 'custom' && currentService.models.length > 0" v-model="model">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ model || '请选择模型' }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="modelName in currentService.models"
            :key="modelName"
            :value="modelName"
          >
            {{ modelName }}
          </SelectItem>
        </SelectContent>
      </Select>
      <input
        v-else
        v-model="model"
        type="text"
        class="w-full mt-1 p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        placeholder="输入模型名称，如：dall-e-3"
      >
    </div>

    <!-- 核心设置 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label class="mb-1 block text-sm font-medium">画面风格</Label>
        <Select v-model="stylePreset">
          <SelectTrigger class="w-full">
            <SelectValue>
              {{ stylePreset || '请选择风格或自由输入' }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="realistic photo">
              写实摄影
            </SelectItem>
            <SelectItem value="anime">
              二次元 / 动漫风
            </SelectItem>
            <SelectItem value="cyberpunk">
              赛博朋克
            </SelectItem>
            <SelectItem value="watercolor">
              水彩
            </SelectItem>
            <SelectItem value="oil painting">
              油画
            </SelectItem>
            <SelectItem value="sketch">
              素描
            </SelectItem>
            <SelectItem value="3D render">
              3D 渲染
            </SelectItem>
            <SelectItem value="pixel art">
              像素风
            </SelectItem>
            <SelectItem value="Chinese ink style">
              国潮 / 国画
            </SelectItem>
            <SelectItem value="retro HK">
              复古港风
            </SelectItem>
            <SelectItem value="flat illustration">
              手绘 / 扁平插画
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label class="mb-1 block text-sm font-medium">画面尺寸</Label>
        <Select v-model="resolution">
          <SelectTrigger class="w-full">
            <SelectValue>
              {{ resolution }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">
              1:1（方图）
            </SelectItem>
            <SelectItem value="3:4">
              3:4
            </SelectItem>
            <SelectItem value="4:3">
              4:3
            </SelectItem>
            <SelectItem value="9:16">
              9:16（竖图）
            </SelectItem>
            <SelectItem value="16:9">
              16:9（横图）
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label class="mb-1 block text-sm font-medium">主体与构图</Label>
        <Select v-model="composition">
          <SelectTrigger class="w-full">
            <SelectValue>
              {{ composition || '请选择' }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="close-up">
              特写
            </SelectItem>
            <SelectItem value="portrait">
              近景 / 半身
            </SelectItem>
            <SelectItem value="full-body">
              全身
            </SelectItem>
            <SelectItem value="center composition">
              居中构图
            </SelectItem>
            <SelectItem value="rule of thirds">
              三分法
            </SelectItem>
            <SelectItem value="symmetry">
              对称
            </SelectItem>
            <SelectItem value="single subject">
              单主体
            </SelectItem>
            <SelectItem value="multiple subjects">
              多主体
            </SelectItem>
            <SelectItem value="simple background">
              背景简洁
            </SelectItem>
            <SelectItem value="medium background">
              背景适中
            </SelectItem>
            <SelectItem value="rich background">
              背景丰富
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label class="mb-1 block text-sm font-medium">氛围与情绪</Label>
        <Select v-model="mood">
          <SelectTrigger class="w-full">
            <SelectValue>
              {{ mood || '请选择' }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="warm and cute">
              温暖、可爱、治愈
            </SelectItem>
            <SelectItem value="cool and lonely">
              冷色、孤独、未来感
            </SelectItem>
            <SelectItem value="epic and dark">
              酷炫、黑暗、史诗感
            </SelectItem>
            <SelectItem value="childlike and dreamy">
              童趣、梦幻、元气
            </SelectItem>
            <SelectItem value="horror and eerie">
              恐怖、诡异
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label class="mb-1 block text-sm font-medium">色调</Label>
        <Select v-model="color_tone">
          <SelectTrigger class="w-full">
            <SelectValue>
              {{ color_tone || '请选择' }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="warm">
              暖色调
            </SelectItem>
            <SelectItem value="cool">
              冷色调
            </SelectItem>
            <SelectItem value="black and white">
              黑白
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label class="mb-1 block text-sm font-medium">光影</Label>
        <Select v-model="lighting">
          <SelectTrigger class="w-full">
            <SelectValue>
              {{ lighting || '请选择' }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bright">
              明亮
            </SelectItem>
            <SelectItem value="dim">
              阴暗
            </SelectItem>
            <SelectItem value="cinematic">
              电影光
            </SelectItem>
            <SelectItem value="soft light">
              柔光
            </SelectItem>
            <SelectItem value="hard light">
              硬光
            </SelectItem>
            <SelectItem value="backlight">
              逆光
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label class="mb-1 block text-sm font-medium">细节等级</Label>
        <Select v-model="detail_level">
          <SelectTrigger class="w-full">
            <SelectValue>
              {{ detail_level }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="草图">
              草图
            </SelectItem>
            <SelectItem value="简单">
              简单
            </SelectItem>
            <SelectItem value="适中">
              适中
            </SelectItem>
            <SelectItem value="高精细">
              高精细
            </SelectItem>
            <SelectItem value="超级写实">
              超级写实
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label class="mb-1 block text-sm font-medium">生成数量</Label>
        <input
          v-model.number="num_images"
          type="number"
          min="1"
          max="8"
          class="w-full mt-1 p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        >
      </div>

      <div>
        <Label class="mb-1 block text-sm font-medium">随机种子</Label>
        <input
          v-model="seed"
          type="text"
          placeholder="random 或指定数字"
          class="w-full mt-1 p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        >
      </div>

      <div>
        <Label class="mb-1 block text-sm font-medium">提示词增强</Label>
        <Select v-model="prompt_enhancement">
          <SelectTrigger class="w-full">
            <SelectValue>
              {{ prompt_enhancement }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">
              Off
            </SelectItem>
            <SelectItem value="mild">
              Mild
            </SelectItem>
            <SelectItem value="strong">
              Strong
            </SelectItem>
            <SelectItem value="expert">
              Expert
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label class="mb-1 block text-sm font-medium">安全过滤等级</Label>
        <Select v-model="safety_level">
          <SelectTrigger class="w-full">
            <SelectValue>
              {{ safety_level }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="strict">
              严格
            </SelectItem>
            <SelectItem value="standard">
              标准
            </SelectItem>
            <SelectItem value="custom">
              自定义
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center justify-between">
        <Label class="text-sm font-medium">允许风格参考图</Label>
        <Switch v-model:checked="allow_style_reference" />
      </div>

      <div class="flex items-center justify-between">
        <Label class="text-sm font-medium">人物一致性</Label>
        <Switch v-model:checked="character_consistency" />
      </div>
    </div>

    <div>
      <Label class="mb-1 block text-sm font-medium">避免内容</Label>
      <Textarea v-model="negative_prompt" rows="2" class="w-full" placeholder="例如：不要多余手指、不要文字" />
    </div>

    <div>
      <Label class="mb-1 block text-sm font-medium">自定义补充说明</Label>
      <Textarea v-model="custom_instruction" rows="2" class="w-full" placeholder="用于进一步控制风格或专业术语" />
    </div>

    <!-- 图像尺寸 -->
    <div>
      <Label class="mb-1 block text-sm font-medium">图像尺寸</Label>
      <Select v-model="size">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ sizeOptions.find(opt => opt.value === size)?.label || size }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in sizeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- 图像质量 -->
    <div v-if="model.includes('dall-e')">
      <Label class="mb-1 block text-sm font-medium">图像质量</Label>
      <Select v-model="quality">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ qualityOptions.find(opt => opt.value === quality)?.label || quality }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in qualityOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- 图像风格 -->
    <div v-if="model.includes('dall-e')">
      <Label class="mb-1 block text-sm font-medium">图像风格</Label>
      <Select v-model="style">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ styleOptions.find(opt => opt.value === style)?.label || style }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in styleOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- 说明 -->
    <div v-if="type === 'default'" class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md text-sm">
      <Info class="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
      <div class="text-blue-700 dark:text-blue-300">
        <p class="font-medium">
          默认图像服务
        </p>
        <p>免费使用，无需配置 API Key，支持 Kwai-Kolors/Kolors 模型。</p>
      </div>
    </div>

    <!-- 自定义服务说明 -->
    <div v-else-if="type === 'custom'" class="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-md text-sm">
      <Info class="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
      <div class="text-orange-700 dark:text-orange-300">
        <p class="font-medium">
          自定义服务
        </p>
        <p>可配置任何兼容 OpenAI 图像生成 API 的服务，如自建的 API 代理或其他第三方服务。</p>
        <p class="mt-1 text-xs">
          端点格式示例：https://your-api.com/v1
        </p>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex flex-wrap gap-2">
      <Button
        type="button"
        class="flex-1 min-w-[100px]"
        @click="saveConfig"
      >
        保存配置
      </Button>
      <Button
        variant="outline"
        type="button"
        class="flex-1 min-w-[80px]"
        @click="clearConfig"
      >
        清空
      </Button>
      <Button
        size="sm"
        variant="outline"
        class="flex-1 min-w-[100px]"
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
