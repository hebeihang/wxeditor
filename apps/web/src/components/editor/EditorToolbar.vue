<script setup lang="ts">
import { Check, FileText, Globe, Link as LinkIcon, ListTree, PenLine, PlusCircle, WandSparkles } from 'lucide-vue-next'
import { AIPolishPopover } from '@/components/ai/tool-box'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/stores/editor'
import { useUIStore } from '@/stores/ui'

const editorStore = useEditorStore()
const uiStore = useUIStore()

const { editor } = storeToRefs(editorStore)
const { isMobile } = storeToRefs(uiStore)

const toolBoxVisible = ref(false)
const presetAction = ref<
  `optimize` | `expand` | `connect` | `translate` | `summarize` | `grammar` | `continue` | `outline`
>(`optimize`)
const popoverRef = useTemplateRef<InstanceType<typeof AIPolishPopover>>('popoverRef')

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
    <div class="mx-auto flex h-10 items-center gap-2 px-3 md:px-5">
      <Button variant="ghost" size="sm" :disabled="!editor" @click="openPolish">
        <WandSparkles class="mr-2 size-4" /> 润色
      </Button>
      <Button variant="ghost" size="sm" :disabled="!editor" @click="openExpand">
        <PlusCircle class="mr-2 size-4" /> 扩展
      </Button>
      <Button variant="ghost" size="sm" :disabled="!editor" @click="openConnect">
        <LinkIcon class="mr-2 size-4" /> 衔接
      </Button>
      <Button variant="ghost" size="sm" :disabled="!editor" @click="openTranslate">
        <Globe class="mr-2 size-4" /> 翻译
      </Button>
      <Button variant="ghost" size="sm" :disabled="!editor" @click="openSummarize">
        <FileText class="mr-2 size-4" /> 摘要
      </Button>
      <Button variant="ghost" size="sm" :disabled="!editor" @click="openGrammar">
        <Check class="mr-2 size-4" /> 纠错
      </Button>

      <Button variant="ghost" size="sm" :disabled="!editor" @click="openContinue">
        <PenLine class="mr-2 size-4" /> 续写
      </Button>
      <Button variant="ghost" size="sm" :disabled="!editor" @click="openOutline">
        <ListTree class="mr-2 size-4" /> 大纲
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
