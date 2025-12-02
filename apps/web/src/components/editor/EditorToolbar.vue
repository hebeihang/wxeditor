<script setup lang="ts">
import { Check, FileText, Globe, Link as LinkIcon, ListTree, PenLine, PlusCircle, WandSparkles } from 'lucide-vue-next'
import { AIPolishPopover } from '@/components/ai/tool-box'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/stores/editor'
import { useUIStore } from '@/stores/ui'
import { store as kvStore } from '@/utils/storage'

const editorStore = useEditorStore()
const uiStore = useUIStore()

const { editor } = storeToRefs(editorStore)
const { isMobile } = storeToRefs(uiStore)

const toolBoxVisible = ref(false)
const presetAction = ref<
  `optimize` | `expand` | `connect` | `translate` | `summarize` | `grammar` | `continue` | `outline`
>(`optimize`)
const popoverRef = useTemplateRef<InstanceType<typeof AIPolishPopover>>('popoverRef')
const aiHideConnect = kvStore.reactive<boolean>('ai_hide_connect', true)
const aiHideTranslate = kvStore.reactive<boolean>('ai_hide_translate', true)
const aiHideGrammar = kvStore.reactive<boolean>('ai_hide_grammar', true)
const aiHideContinue = kvStore.reactive<boolean>('ai_hide_continue', true)
const aiHideOutline = kvStore.reactive<boolean>('ai_hide_outline', true)

function getSelectedText() {
  try {
    const view = editor.value
    if (!view)
      return ''
    const sel = view.state.selection.main
    return view.state.doc.sliceString(sel.from, sel.to).trim()
  }
  catch {
    return ''
  }
}

const currentSelectedText = computed(() => (toolBoxVisible.value ? getSelectedText() : ''))

function openPolish() {
  presetAction.value = 'optimize'
  toolBoxVisible.value = true
}
function openExpand() {
  presetAction.value = 'expand'
  toolBoxVisible.value = true
}
function openConnect() {
  presetAction.value = 'connect'
  toolBoxVisible.value = true
}
function openTranslate() {
  presetAction.value = 'translate'
  toolBoxVisible.value = true
}
function openSummarize() {
  presetAction.value = 'summarize'
  toolBoxVisible.value = true
}
function openGrammar() {
  presetAction.value = 'grammar'
  toolBoxVisible.value = true
}
function openContinue() {
  presetAction.value = 'continue'
  toolBoxVisible.value = true
}
function openOutline() {
  presetAction.value = 'outline'
  toolBoxVisible.value = true
}
</script>

<template>
  <div class="toolbar-container border-b bg-background text-background-foreground">
    <div class="mx-auto flex h-10 items-center gap-1 md:gap-2 px-3 md:px-5">
      <Button variant="ghost" size="sm" :disabled="!editor" @click="openPolish">
        <WandSparkles class="size-4 md:mr-2" />
        <span class="hidden md:inline">润色</span>
      </Button>
      <Button variant="ghost" size="sm" :disabled="!editor" @click="openExpand">
        <PlusCircle class="size-4 md:mr-2" />
        <span class="hidden md:inline">扩展</span>
      </Button>
      <Button v-if="!aiHideConnect" variant="ghost" size="sm" :disabled="!editor" @click="openConnect">
        <LinkIcon class="size-4 md:mr-2" />
        <span class="hidden md:inline">衔接</span>
      </Button>
      <Button v-if="!aiHideTranslate" variant="ghost" size="sm" :disabled="!editor" @click="openTranslate">
        <Globe class="size-4 md:mr-2" />
        <span class="hidden md:inline">翻译</span>
      </Button>
      <Button variant="ghost" size="sm" :disabled="!editor" @click="openSummarize">
        <FileText class="size-4 md:mr-2" />
        <span class="hidden md:inline">摘要</span>
      </Button>
      <Button v-if="!aiHideGrammar" variant="ghost" size="sm" :disabled="!editor" @click="openGrammar">
        <Check class="size-4 md:mr-2" />
        <span class="hidden md:inline">纠错</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor"
        @click="(() => { const t = getSelectedText(); if (t) uiStore.setAIImagePrefillPrompt(t); uiStore.toggleAIImageDialog(true) })()"
      >
        <svg class="size-4 md:mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M6 14v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <rect x="13" y="3" width="8" height="8" rx="2" ry="2" stroke="currentColor" stroke-width="2" />
          <circle cx="19" cy="6" r="1.5" stroke="currentColor" stroke-width="2" />
          <path d="M14 10l2.5-3 3.5 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 4h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M8.5 4l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M8.5 4l-2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M20 20h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M15.5 20l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M15.5 20l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span class="hidden md:inline">文生图</span>
      </Button>

      <Button v-if="!aiHideContinue" variant="ghost" size="sm" :disabled="!editor" @click="openContinue">
        <PenLine class="size-4 md:mr-2" />
        <span class="hidden md:inline">续写</span>
      </Button>
      <Button v-if="!aiHideOutline" variant="ghost" size="sm" :disabled="!editor" @click="openOutline">
        <ListTree class="size-4 md:mr-2" />
        <span class="hidden md:inline">大纲</span>
      </Button>

      <Separator orientation="vertical" class="mx-1 h-5" />

      <AIPolishPopover
        ref="popoverRef"
        v-model:open="toolBoxVisible"
        :selected-text="currentSelectedText"
        :is-mobile="isMobile"
        :preset-action="presetAction"
      />
    </div>
  </div>
</template>

<style scoped>
.toolbar-container {
  position: sticky;
  top: 0;
  z-index: 30;
}
</style>
