<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import useAIConfigStore from '@/stores/aiConfig'
import { useEditorStore } from '@/stores/editor'
import { usePostStore } from '@/stores/post'
import { useQuickCommands } from '@/stores/quickCommands'
import { store as kvStore } from '@/utils/storage'

const aiStore = useAIConfigStore()
const { endpoint, model, type, apiKey } = storeToRefs(aiStore)

const editorStore = useEditorStore()
const { editor } = storeToRefs(editorStore)

const postStore = usePostStore()
const { currentPost, currentPostId } = storeToRefs(postStore)

const quickCmdStore = useQuickCommands()

const loading = ref(false)
const open = ref(false)
const suggestions = ref<string[]>([])
const titleInput = ref('')
const titleStyleId = kvStore.reactive<string>('ai_title_style', 'title-style:news')

function stripLeadingEnum(text: string): string {
  let s = text.trim()
  const patterns = [
    /^\s*(?:[（(]\s*)?\d+\s*[）)][.、:：\-\s]*/,
    /^\s*\d+\s*[.、:：\-]\s*/,
    /^\s*[A-Z]\s*[.)]\s*/i,
  ]
  for (let i = 0; i < 3; i++) {
    const prev = s
    for (const re of patterns)
      s = s.replace(re, '')
    if (s === prev)
      break
  }
  return s.trim()
}

function sanitizeTitleCandidate(text: string): string {
  let s = text.trim()
  s = s.replace(/^\s*[-*•·]\s+/, '')
  s = s.replace(/^[（(【[]\s*(?:标题|建议|理由|说明|摘要|类别|分类|类型|风格|注释|注|解析|点评|总结|背景|导语|主体|结语|场景)\s*[）)】\]]\s*/, '')
  s = s.replace(/^(?:标题|建议|理由|说明|摘要|类别|分类|类型|风格|注释|注|解析|点评|总结|背景|导语|主体|结语|场景)\s*[:：\-]\s*/, '')
  s = s.replace(/\s+(?:[\-—–]|——)\s*(?:理由|说明|解析|点评|总结|背景|导语|主体|结语|分类|类别|类型|风格).*$/, '')
  s = s.replace(/\s*[（(][^）)]*(?:理由|说明|解析|点评|总结|背景|导语|主体|结语|分类|类别|类型|风格)[^）)]*[）)]\s*$/, '')
  s = s.replace(/^['"“”‘’]+|['"“”‘’]+$/g, '')
  s = s.replace(/[；;]+$/g, '')
  s = stripLeadingEnum(s)
  return s.trim()
}

function isTitleCandidate(text: string): boolean {
  const s = text.trim()
  if (!s)
    return false
  if (/^(?:标题|建议|理由|说明|摘要|类别|分类|类型|风格|注释|注|解析|点评|总结|背景|导语|主体|结语|场景)(?:[:：\-]|$)/.test(s))
    return false
  if (s.length > 20)
    return false
  return true
}

watch(currentPost, (p) => {
  titleInput.value = p?.title ?? ''
}, { immediate: true })

function applyTitle(title: string) {
  const cleaned = sanitizeTitleCandidate(title)
  postStore.renamePost(currentPostId.value, cleaned)
  titleInput.value = cleaned
}

async function generateTitles() {
  if (loading.value)
    return
  loading.value = true
  try {
    suggestions.value = []
    const baseTpl = quickCmdStore.commands.find(c => c.id === 'title-suggest')?.template || ''
    const selectedStyleId = (await kvStore.get?.('ai_title_style')) || titleStyleId.value
    const styleTpl = quickCmdStore.commands.find(c => c.id === selectedStyleId)?.template || ''
    const content = editor.value?.state.doc.toString() || ''
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey.value && type.value !== 'default')
      headers.Authorization = `Bearer ${apiKey.value}`
    const url = new URL(endpoint.value)
    if (!url.pathname.endsWith('/chat/completions'))
      url.pathname = url.pathname.replace(/\/?$/, '/chat/completions')
    const systemIntro = '你是一个中文标题生成助手，需严格遵守指定的标题风格与规范。只输出标题列表，不要附加解释。'
    const strippedStyle = styleTpl ? styleTpl.replace(/\n?全文内容[\s\S]*$/, '').trim() : ''
    const prompt = styleTpl
      ? `请基于以下正文生成10个中文标题（≤20字，换行分隔）。\n\n${content}`
      : baseTpl.replace(/\{\{\s*sel\s*\}\}/gi, content)
    const messages: Array<{ role: 'system' | 'user', content: string }> = []
    messages.push({ role: 'system', content: systemIntro })
    if (strippedStyle)
      messages.push({ role: 'system', content: strippedStyle })
    messages.push({ role: 'user', content: prompt })
    const payload = {
      model: model.value,
      messages,
      temperature: /title-style:(?:mimon|shock)/.test(selectedStyleId) ? 0.9 : (selectedStyleId === 'title-style:news' ? 0.25 : 0.7),
      max_tokens: 512,
      stream: false,
    }
    const res = await fetch(url.toString(), { method: 'POST', headers, body: JSON.stringify(payload) })
    const json = await res.json().catch(() => null)
    const text: string = json?.choices?.[0]?.message?.content || ''
    const styleLines = new Set(
      styleTpl
        .split(/\r?\n/)
        .map(s => sanitizeTitleCandidate(s))
        .filter(Boolean),
    )
    const list = Array.from(new Set(
      text
        .split(/\r?\n/)
        .map(s => sanitizeTitleCandidate(s))
        .filter(s => isTitleCandidate(s) && !styleLines.has(s)),
    )).slice(0, 20)
    suggestions.value = list
    open.value = true
  }
  catch {
    suggestions.value = []
    open.value = false
  }
  finally {
    loading.value = false
  }
}

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  titleInput.value = val
  postStore.renamePost(currentPostId.value, val)
}
</script>

<template>
  <div class="titlebar-container border-b bg-background text-background-foreground">
    <div class="mx-auto flex h-11 items-center gap-2 px-3 md:px-5">
      <DropdownMenu v-model:open="open">
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" :disabled="loading" @click="generateTitles">
            <Sparkles class="mr-2 size-4" />
            AI 标题
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="max-h-64 w-80 overflow-y-auto">
          <DropdownMenuItem v-if="loading" disabled>
            生成中…
          </DropdownMenuItem>
          <DropdownMenuItem v-if="!loading && suggestions.length === 0" disabled>
            暂无建议
          </DropdownMenuItem>
          <DropdownMenuItem v-for="s in suggestions" :key="s" class="whitespace-normal" @click="applyTitle(s)">
            {{ s }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Input :value="titleInput" placeholder="输入标题" class="flex-1" @input="onInput" />
    </div>
  </div>
</template>

<style scoped>
.titlebar-container {
  position: sticky;
  top: 0;
  z-index: 40;
}
</style>
