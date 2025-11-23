<script setup lang="ts">
import { serviceOptions } from '@md/shared/configs'
import { Bot, ChevronDownIcon, Cog, Image as ImageIcon, Menu, Palette, Plus, Sparkles, WandSparkles } from 'lucide-vue-next'
import QuickCommandManager from '@/components/ai/chat-box/QuickCommandManager.vue'
import { NumberField, NumberFieldContent, NumberFieldInput } from '@/components/ui/number-field'
import { Textarea } from '@/components/ui/textarea'
import useAIConfigStore from '@/stores/aiConfig'
import { useEditorStore } from '@/stores/editor'
import { useExportStore } from '@/stores/export'
import { useQuickCommands } from '@/stores/quickCommands'
import { useRenderStore } from '@/stores/render'
import { useThemeStore } from '@/stores/theme'
import { useUIStore } from '@/stores/ui'
import { addPrefix, generatePureHTML, processClipboardContent } from '@/utils'
import { store } from '@/utils/storage'
import EditDropdown from './EditDropdown.vue'
import FileDropdown from './FileDropdown.vue'
import FormatDropdown from './FormatDropdown.vue'
import HelpDropdown from './HelpDropdown.vue'
import InsertDropdown from './InsertDropdown.vue'
import StyleDropdown from './StyleDropdown.vue'
import ViewDropdown from './ViewDropdown.vue'

const emit = defineEmits([`startCopy`, `endCopy`])

const editorStore = useEditorStore()
const themeStore = useThemeStore()
const renderStore = useRenderStore()
const uiStore = useUIStore()
const exportStore = useExportStore()

const { editor } = storeToRefs(editorStore)
const { output } = storeToRefs(renderStore)
const { primaryColor } = storeToRefs(themeStore)
const { isOpenRightSlider } = storeToRefs(uiStore)
const AIConfigStore = useAIConfigStore()
const { type } = storeToRefs(AIConfigStore)
const quickCmdStore = useQuickCommands()
const titleStyle = store.reactive<string>('ai_title_style', 'title-style:mimon')

const styleId = store.reactive<string>('ai_style_id', 'style:business')
const toneId = store.reactive<string>('ai_tone_id', '')
const preserveNames = store.reactive<boolean>('ai_preserve_names', true)
const polishLevel = store.reactive<string>('ai_polish_level', '中等')
const polishCustomPrompt = store.reactive<string>('ai_polish_custom', '')

const expandMode = store.reactive<string>('ai_expand_mode', '倍数扩写')
const expandFactor = store.reactive<number>('ai_expand_factor', 2.0)
const targetWords = store.reactive<number>('ai_expand_target_words', 300)
const addExamples = store.reactive<boolean>('ai_expand_add_examples', true)
const expandCustomPrompt = store.reactive<string>('ai_expand_custom', '')

const cmdMgrOpen = ref(false)

if (!titleStyle.value.startsWith('title-style:'))
  titleStyle.value = `title-style:${titleStyle.value}`

function applyTitleStyle(styleId: string) {
  titleStyle.value = styleId
  const cmd = quickCmdStore.commands.find(c => c.id === styleId)
  const tpl = cmd?.template || quickCmdStore.commands.find(c => c.id === 'title-suggest')?.template || ''
  if (tpl)
    quickCmdStore.update('title-suggest', '标题推荐', tpl)
}

if (quickCmdStore.commands.length)
  applyTitleStyle(titleStyle.value)
watch(() => quickCmdStore.commands.length, (len) => {
  if (len)
    applyTitleStyle(titleStyle.value)
})

// Editor refresh function
function editorRefresh() {
  themeStore.updateCodeTheme()

  const raw = editorStore.getContent()
  renderStore.render(raw, {
    isCiteStatus: themeStore.isCiteStatus,
    legend: themeStore.legend,
    isUseIndent: themeStore.isUseIndent,
    isUseJustify: themeStore.isUseJustify,
    isCountStatus: themeStore.isCountStatus,
    isMacCodeBlock: themeStore.isMacCodeBlock,
    isShowLineNumber: themeStore.isShowLineNumber,
  })
}

function getSelectedText(): string {
  try {
    const view: any = editor.value
    if (!view)
      return ''
    const sel = view.state.selection.main
    return view.state.doc.sliceString(sel.from, sel.to).trim()
  }
  catch {
    return ''
  }
}

function buildPolishPrompt(inputText: string): string {
  const styleTpl = quickCmdStore.commands.find(c => c.id === styleId.value)?.template || ''
  const toneTpl = toneId.value ? quickCmdStore.commands.find(c => c.id === toneId.value)?.template || '' : ''
  const headerHint = '输出 Markdown，AI 自行决定是否使用标题/加粗/列表。'
  const preserveHint = preserveNames.value ? '保留专有名词与人名地名。' : ''
  const levelHint = `润色强度：${polishLevel.value}。`
  const styleNote = styleTpl.replace(/\{\{\s*sel\s*\}\}/gi, inputText)
  const toneNote = toneTpl ? `语气提示：${toneTpl}` : ''
  const custom = polishCustomPrompt.value?.trim() ? polishCustomPrompt.value.trim() : ''
  const prompt = `根据用户选择的风格（${styleId.value}）和情感（${toneId.value || '无'}），润色以下文本：\n\n${inputText}\n\n${levelHint}${preserveHint}${toneNote}\n${headerHint}\n${custom}\n\n${styleNote}`
  return prompt
}

function buildExpandPrompt(inputText: string): string {
  const styleTpl = quickCmdStore.commands.find(c => c.id === styleId.value)?.template || ''
  const toneTpl = toneId.value ? quickCmdStore.commands.find(c => c.id === toneId.value)?.template || '' : ''
  const mode = expandMode.value
  const headerHint = '输出 Markdown。'
  const exampleHint = addExamples.value ? '添加示例，并使用“示例：”标注。' : ''
  const sizeHint = mode === '倍数扩写' ? `扩写倍数：${expandFactor.value}。` : mode === '目标字数' ? `目标字数：${targetWords.value}。` : '补充要点。'
  const toneNote = toneTpl ? `语气提示：${toneTpl}` : ''
  const custom = expandCustomPrompt.value?.trim() ? expandCustomPrompt.value.trim() : ''
  const styleNote = styleTpl.replace(/\{\{\s*sel\s*\}\}/gi, inputText)
  const prompt = `把以下文本按${mode}扩写：\n倍数：${expandFactor.value}；目标字数：${targetWords.value}。\n\n${inputText}\n\n风格：${styleId.value}；情感：${toneId.value || '无'}。${sizeHint}${exampleHint}${toneNote}\n${headerHint}\n${custom}\n\n${styleNote}`
  return prompt
}

function runPolish() {
  const selected = getSelectedText()
  if (!selected) {
    toast.error('请先选择要处理的文本')
    return
  }
  const prompt = buildPolishPrompt(selected)
  uiStore.setAIPrefillInput(prompt)
  uiStore.toggleAIDialog(true)
}

function runExpand() {
  const selected = getSelectedText()
  if (!selected) {
    toast.error('请先选择要处理的文本')
    return
  }
  const prompt = buildExpandPrompt(selected)
  uiStore.setAIPrefillInput(prompt)
  uiStore.toggleAIDialog(true)
}

// 对话框状态
const aboutDialogVisible = ref(false)
const fundDialogVisible = ref(false)
const editorStateDialogVisible = ref(false)

// 处理帮助菜单事件
function handleOpenAbout() {
  aboutDialogVisible.value = true
}

function handleOpenFund() {
  fundDialogVisible.value = true
}

function handleOpenEditorState() {
  editorStateDialogVisible.value = true
}

const copyMode = store.reactive(addPrefix(`copyMode`), `txt`)

const { copy: copyContent } = useClipboard({
  legacy: true,
})

const delay = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms))

const normalizeErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

async function writeClipboardItems(items: ClipboardItem[]) {
  if (!navigator.clipboard?.write) {
    throw new Error(`Clipboard API not available.`)
  }

  await delay(0)
  await navigator.clipboard.write(items)
}

function fallbackCopyUsingExecCommand(htmlContent: string) {
  const selection = window.getSelection()

  if (!selection) {
    return false
  }

  const tempContainer = document.createElement(`div`)
  tempContainer.innerHTML = htmlContent
  tempContainer.style.position = `fixed`
  tempContainer.style.left = `-9999px`
  tempContainer.style.top = `0`
  tempContainer.style.opacity = `0`
  tempContainer.style.pointerEvents = `none`
  tempContainer.style.setProperty(`background-color`, `#ffffff`, `important`)
  tempContainer.style.setProperty(`color`, `#000000`, `important`)

  document.body.appendChild(tempContainer)

  const htmlElement = document.documentElement
  const wasDark = htmlElement.classList.contains(`dark`)
  let successful = false

  try {
    if (wasDark) {
      htmlElement.classList.remove(`dark`)
    }

    const range = document.createRange()
    range.selectNodeContents(tempContainer)
    selection.removeAllRanges()
    selection.addRange(range)

    successful = document.execCommand(`copy`)
  }
  catch {
    successful = false
  }
  finally {
    selection.removeAllRanges()
    tempContainer.remove()

    if (wasDark) {
      htmlElement.classList.add(`dark`)
    }
  }

  return successful
}

// 复制到微信公众号
async function copy() {
  // 如果是 Markdown 源码，直接复制并返回
  if (copyMode.value === `md`) {
    const mdContent = editor.value?.state.doc.toString() || ``
    await copyContent(mdContent)
    toast.success(`已复制 Markdown 源码到剪贴板。`)
    return
  }

  // 以下处理非 Markdown 的复制流程
  emit(`startCopy`)

  setTimeout(() => {
    nextTick(async () => {
      try {
        await processClipboardContent(primaryColor.value)
      }
      catch (error) {
        toast.error(`处理 HTML 失败，请联系开发者。${normalizeErrorMessage(error)}`)
        editorRefresh()
        emit(`endCopy`)
        return
      }

      const clipboardDiv = document.getElementById(`output`)

      if (!clipboardDiv) {
        toast.error(`未找到复制输出区域，请刷新页面后重试。`)
        editorRefresh()
        emit(`endCopy`)
        return
      }

      clipboardDiv.focus()
      window.getSelection()?.removeAllRanges()

      const temp = clipboardDiv.innerHTML

      if (copyMode.value === `txt`) {
        try {
          if (typeof ClipboardItem === `undefined`) {
            throw new TypeError(`ClipboardItem is not supported in this browser.`)
          }

          const plainText = clipboardDiv.textContent || ``
          const clipboardItem = new ClipboardItem({
            'text/html': new Blob([temp], { type: `text/html` }),
            'text/plain': new Blob([plainText], { type: `text/plain` }),
          })

          await writeClipboardItems([clipboardItem])
        }
        catch (error) {
          const fallbackSucceeded = fallbackCopyUsingExecCommand(temp)
          if (!fallbackSucceeded) {
            clipboardDiv.innerHTML = output.value
            window.getSelection()?.removeAllRanges()
            editorRefresh()
            toast.error(`复制失败，请联系开发者。${normalizeErrorMessage(error)}`)
            emit(`endCopy`)
            return
          }
        }
      }

      clipboardDiv.innerHTML = output.value

      if (copyMode.value === `html`) {
        await copyContent(temp)
      }
      else if (copyMode.value === `html-without-style`) {
        await copyContent(await generatePureHTML(editor.value!.state.doc.toString()))
      }
      else if (copyMode.value === `html-and-style`) {
        await copyContent(exportStore.editorContent2HTML())
      }

      // 输出提示
      toast.success(
        copyMode.value === `html`
          ? `已复制 HTML 源码，请进行下一步操作。`
          : `已复制渲染后的内容到剪贴板，可直接到公众号后台粘贴。`,
      )
      window.dispatchEvent(
        new CustomEvent(`copyToMp`, {
          detail: {
            content: output.value,
          },
        }),
      )
      editorRefresh()
      emit(`endCopy`)
    })
  }, 350)
}
</script>

<template>
  <header
    class="header-container h-15 flex flex-wrap items-center justify-between px-5 relative"
  >
    <!-- 桌面端左侧菜单 -->
    <div class="space-x-1 hidden md:flex">
      <Menubar class="menubar border-0">
        <FileDropdown @open-editor-state="handleOpenEditorState" />
        <EditDropdown />
        <FormatDropdown />
        <InsertDropdown />
        <StyleDropdown />
        <ViewDropdown />
        <MenubarMenu>
          <MenubarTrigger>
            AI
          </MenubarTrigger>
          <MenubarContent class="w-64">
            <MenubarItem @click="uiStore.toggleAIDialog(true)">
              <Bot class="mr-2 h-4 w-4" />
              打开 AI 助手
            </MenubarItem>
            <MenubarItem @click="uiStore.toggleAIImageDialog(true)">
              <ImageIcon class="mr-2 h-4 w-4" />
              打开 AI 文生图
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>
                写作
              </MenubarSubTrigger>
              <MenubarSubContent class="w-72">
                <MenubarLabel>文风（必选）</MenubarLabel>
                <MenubarRadioGroup v-model="styleId">
                  <MenubarRadioItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('style:'))" :key="opt.id" :value="opt.id">
                    {{ opt.label }}
                  </MenubarRadioItem>
                </MenubarRadioGroup>
                <MenubarSeparator />
                <MenubarLabel>情感（可选）</MenubarLabel>
                <MenubarRadioGroup v-model="toneId">
                  <MenubarRadioItem value="">
                    无
                  </MenubarRadioItem>
                  <MenubarRadioItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('tone:'))" :key="opt.id" :value="opt.id">
                    {{ opt.label }}
                  </MenubarRadioItem>
                </MenubarRadioGroup>
                <MenubarSeparator />
                <MenubarSub>
                  <MenubarSubTrigger>
                    <WandSparkles class="mr-2 h-4 w-4" />
                    润色
                  </MenubarSubTrigger>
                  <MenubarSubContent class="w-72">
                    <MenubarCheckboxItem :checked="preserveNames" @click="preserveNames = !preserveNames">
                      保留专有名词
                    </MenubarCheckboxItem>
                    <MenubarSeparator />
                    <MenubarLabel>润色强度</MenubarLabel>
                    <MenubarRadioGroup v-model="polishLevel">
                      <MenubarRadioItem value="轻微">
                        轻微
                      </MenubarRadioItem>
                      <MenubarRadioItem value="中等">
                        中等
                      </MenubarRadioItem>
                      <MenubarRadioItem value="大量">
                        大量
                      </MenubarRadioItem>
                    </MenubarRadioGroup>
                    <MenubarSeparator />
                    <MenubarLabel>自定义提示词</MenubarLabel>
                    <div class="px-2 py-1.5">
                      <Textarea v-model="polishCustomPrompt" rows="2" placeholder="例如：使语言更口语化，保留技术术语。" />
                    </div>
                    <MenubarSeparator />
                    <MenubarItem @click="runPolish">
                      <Bot class="mr-2 h-4 w-4" />
                      执行润色
                    </MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSub>
                  <MenubarSubTrigger>
                    <Plus class="mr-2 h-4 w-4" />
                    扩展
                  </MenubarSubTrigger>
                  <MenubarSubContent class="w-72">
                    <MenubarLabel>扩写模式</MenubarLabel>
                    <MenubarRadioGroup v-model="expandMode">
                      <MenubarRadioItem value="倍数扩写">
                        倍数扩写
                      </MenubarRadioItem>
                      <MenubarRadioItem value="目标字数">
                        目标字数
                      </MenubarRadioItem>
                      <MenubarRadioItem value="补充要点">
                        补充要点
                      </MenubarRadioItem>
                    </MenubarRadioGroup>
                    <MenubarSeparator />
                    <MenubarLabel>扩写倍数</MenubarLabel>
                    <div class="px-2 py-1.5">
                      <NumberField v-model="expandFactor" :min="1" :max="10" :step="0.5">
                        <NumberFieldContent>
                          <NumberFieldInput />
                        </NumberFieldContent>
                      </NumberField>
                    </div>
                    <MenubarLabel>目标字数</MenubarLabel>
                    <div class="px-2 py-1.5">
                      <NumberField v-model="targetWords" :min="50" :max="10000" :step="50">
                        <NumberFieldContent>
                          <NumberFieldInput />
                        </NumberFieldContent>
                      </NumberField>
                    </div>
                    <MenubarCheckboxItem :checked="addExamples" @click="addExamples = !addExamples">
                      添加示例/案例
                    </MenubarCheckboxItem>
                    <MenubarSeparator />
                    <MenubarLabel>自定义提示词</MenubarLabel>
                    <div class="px-2 py-1.5">
                      <Textarea v-model="expandCustomPrompt" rows="2" />
                    </div>
                    <MenubarSeparator />
                    <MenubarItem @click="runExpand">
                      <Bot class="mr-2 h-4 w-4" />
                      执行扩展
                    </MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSub>
              <MenubarSubTrigger>
                标题
              </MenubarSubTrigger>
              <MenubarSubContent>
                <!-- 3级：风格切换 -->
                <MenubarSub>
                  <MenubarSubTrigger>
                    <Sparkles class="mr-2 h-4 w-4" />
                    风格切换
                  </MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarRadioGroup v-model="titleStyle" @update:model-value="applyTitleStyle">
                      <MenubarRadioItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('title-style:'))" :key="opt.id" :value="opt.id">
                        {{ opt.label }}
                      </MenubarRadioItem>
                    </MenubarRadioGroup>
                  </MenubarSubContent>
                </MenubarSub>
                <!-- 3级：设置（服务类型、提示词编辑） -->
                <MenubarSub>
                  <MenubarSubTrigger>
                    <Cog class="mr-2 h-4 w-4" />
                    设置
                  </MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarSub>
                      <MenubarSubTrigger>
                        服务类型
                      </MenubarSubTrigger>
                      <MenubarSubContent>
                        <MenubarRadioGroup v-model="type">
                          <MenubarRadioItem v-for="svc in serviceOptions" :key="svc.value" :value="svc.value">
                            {{ svc.label }}
                          </MenubarRadioItem>
                        </MenubarRadioGroup>
                      </MenubarSubContent>
                    </MenubarSub>
                  </MenubarSubContent>
                </MenubarSub>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem @click="cmdMgrOpen = true">
              提示词管理
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <HelpDropdown @open-about="handleOpenAbout" @open-fund="handleOpenFund" />
      </Menubar>
    </div>

    <!-- 移动端汉堡菜单按钮 -->
    <div class="md:hidden">
      <Menubar class="menubar border-0 p-0">
        <MenubarMenu>
          <MenubarTrigger class="p-0">
            <Button variant="outline" size="icon">
              <Menu class="size-4" />
            </Button>
          </MenubarTrigger>
          <MenubarContent align="start">
            <FileDropdown :as-sub="true" @open-editor-state="handleOpenEditorState" />
            <EditDropdown :as-sub="true" />
            <FormatDropdown :as-sub="true" />
            <InsertDropdown :as-sub="true" />
            <StyleDropdown :as-sub="true" />
            <ViewDropdown :as-sub="true" />
            <MenubarSub>
              <MenubarSubTrigger>
                AI
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem @click="uiStore.toggleAIDialog(true)">
                  <Bot class="mr-2 h-4 w-4" />
                  打开 AI 助手
                </MenubarItem>
                <MenubarItem @click="uiStore.toggleAIImageDialog(true)">
                  <ImageIcon class="mr-2 h-4 w-4" />
                  打开 AI 文生图
                </MenubarItem>
                <MenubarSeparator />
                <MenubarSub>
                  <MenubarSubTrigger>
                    写作
                  </MenubarSubTrigger>
                  <MenubarSubContent class="w-72">
                    <MenubarLabel>文风（必选）</MenubarLabel>
                    <MenubarRadioGroup v-model="styleId">
                      <MenubarRadioItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('style:'))" :key="opt.id" :value="opt.id">
                        {{ opt.label }}
                      </MenubarRadioItem>
                    </MenubarRadioGroup>
                    <MenubarSeparator />
                    <MenubarLabel>情感（可选）</MenubarLabel>
                    <MenubarRadioGroup v-model="toneId">
                      <MenubarRadioItem value="">
                        无
                      </MenubarRadioItem>
                      <MenubarRadioItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('tone:'))" :key="opt.id" :value="opt.id">
                        {{ opt.label }}
                      </MenubarRadioItem>
                    </MenubarRadioGroup>
                    <MenubarSeparator />
                    <MenubarSub>
                      <MenubarSubTrigger>
                        润色
                      </MenubarSubTrigger>
                      <MenubarSubContent class="w-72">
                        <MenubarCheckboxItem :checked="preserveNames" @click="preserveNames = !preserveNames">
                          保留专有名词
                        </MenubarCheckboxItem>
                        <MenubarSeparator />
                        <MenubarLabel>润色强度</MenubarLabel>
                        <MenubarRadioGroup v-model="polishLevel">
                          <MenubarRadioItem value="轻微">
                            轻微
                          </MenubarRadioItem>
                          <MenubarRadioItem value="中等">
                            中等
                          </MenubarRadioItem>
                          <MenubarRadioItem value="大量">
                            大量
                          </MenubarRadioItem>
                        </MenubarRadioGroup>
                        <MenubarSeparator />
                        <MenubarLabel>自定义提示词</MenubarLabel>
                        <div class="px-2 py-1.5">
                          <Textarea v-model="polishCustomPrompt" rows="2" placeholder="例如：使语言更口语化，保留技术术语。" />
                        </div>
                        <MenubarSeparator />
                        <MenubarItem @click="runPolish">
                          <Bot class="mr-2 h-4 w-4" />
                          执行润色
                        </MenubarItem>
                      </MenubarSubContent>
                    </MenubarSub>
                    <MenubarSub>
                      <MenubarSubTrigger>
                        扩展
                      </MenubarSubTrigger>
                      <MenubarSubContent class="w-72">
                        <MenubarLabel>扩写模式</MenubarLabel>
                        <MenubarRadioGroup v-model="expandMode">
                          <MenubarRadioItem value="倍数扩写">
                            倍数扩写
                          </MenubarRadioItem>
                          <MenubarRadioItem value="目标字数">
                            目标字数
                          </MenubarRadioItem>
                          <MenubarRadioItem value="补充要点">
                            补充要点
                          </MenubarRadioItem>
                        </MenubarRadioGroup>
                        <MenubarSeparator />
                        <MenubarLabel>扩写倍数</MenubarLabel>
                        <div class="px-2 py-1.5">
                          <NumberField v-model="expandFactor" :min="1" :max="10" :step="0.5">
                            <NumberFieldContent>
                              <NumberFieldInput />
                            </NumberFieldContent>
                          </NumberField>
                        </div>
                        <MenubarLabel>目标字数</MenubarLabel>
                        <div class="px-2 py-1.5">
                          <NumberField v-model="targetWords" :min="50" :max="10000" :step="50">
                            <NumberFieldContent>
                              <NumberFieldInput />
                            </NumberFieldContent>
                          </NumberField>
                        </div>
                        <MenubarCheckboxItem :checked="addExamples" @click="addExamples = !addExamples">
                          添加示例/案例
                        </MenubarCheckboxItem>
                        <MenubarSeparator />
                        <MenubarLabel>自定义提示词</MenubarLabel>
                        <div class="px-2 py-1.5">
                          <Textarea v-model="expandCustomPrompt" rows="2" />
                        </div>
                        <MenubarSeparator />
                        <MenubarItem @click="runExpand">
                          <Bot class="mr-2 h-4 w-4" />
                          执行扩展
                        </MenubarItem>
                      </MenubarSubContent>
                    </MenubarSub>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSub>
                  <MenubarSubTrigger>
                    标题
                  </MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarSub>
                      <MenubarSubTrigger>
                        风格切换
                      </MenubarSubTrigger>
                      <MenubarSubContent>
                        <MenubarRadioGroup v-model="titleStyle" @update:model-value="applyTitleStyle">
                          <MenubarRadioItem v-for="opt in quickCmdStore.commands.filter(c => c.id.startsWith('title-style:'))" :key="opt.id" :value="opt.id">
                            {{ opt.label }}
                          </MenubarRadioItem>
                        </MenubarRadioGroup>
                      </MenubarSubContent>
                    </MenubarSub>
                    <MenubarSub>
                      <MenubarSubTrigger>
                        设置
                      </MenubarSubTrigger>
                      <MenubarSubContent>
                        <MenubarSub>
                          <MenubarSubTrigger>
                            服务类型
                          </MenubarSubTrigger>
                          <MenubarSubContent>
                            <MenubarRadioGroup v-model="type">
                              <MenubarRadioItem v-for="svc in serviceOptions" :key="svc.value" :value="svc.value">
                                {{ svc.label }}
                              </MenubarRadioItem>
                            </MenubarRadioGroup>
                          </MenubarSubContent>
                        </MenubarSub>
                      </MenubarSubContent>
                    </MenubarSub>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSeparator />
                <MenubarItem @click="cmdMgrOpen = true">
                  提示词管理
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <HelpDropdown :as-sub="true" @open-about="handleOpenAbout" @open-fund="handleOpenFund" />
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>

    <!-- 右侧操作区 -->
    <div class="space-x-2 flex flex-wrap items-center">
      <!-- 复制按钮组 -->
      <div
        class="bg-background space-x-1 text-background-foreground flex items-center border rounded-md"
      >
        <Button variant="ghost" class="shadow-none text-sm px-2 md:px-4" @click="copy">
          复制
        </Button>
        <Separator orientation="vertical" class="h-5" />
        <DropdownMenu v-model="copyMode">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" class="px-2 shadow-none">
              <ChevronDownIcon class="text-secondary-foreground h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" :align-offset="-5" class="w-[220px]">
            <DropdownMenuRadioGroup v-model="copyMode">
              <DropdownMenuRadioItem value="txt">
                公众号格式
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="html">
                HTML 格式
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="html-without-style">
                <span class="whitespace-nowrap">HTML 格式（无样式）</span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="html-and-style">
                <span class="whitespace-nowrap">HTML 格式（兼容样式）</span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="md">
                MD 格式
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- 文章信息（移动端隐藏） -->
      <PostInfo class="hidden md:inline-flex" />

      <!-- 样式面板 -->
      <Button
        variant="outline"
        size="icon"
        @click="isOpenRightSlider = !isOpenRightSlider"
      >
        <Palette class="size-4" />
      </Button>
    </div>
  </header>

  <!-- 对话框组件，嵌套菜单无法正常挂载，需要提取层级 -->
  <AboutDialog :visible="aboutDialogVisible" @close="aboutDialogVisible = false" />
  <FundDialog :visible="fundDialogVisible" @close="fundDialogVisible = false" />
  <EditorStateDialog :visible="editorStateDialogVisible" @close="editorStateDialogVisible = false" />
  <AIImageGeneratorPanel v-model:open="uiStore.aiImageDialogVisible" />
  <QuickCommandManager v-model:open="cmdMgrOpen" />
</template>

<style lang="less" scoped>
.header-container {
  background: hsl(var(--background) / 0.95);
  border-bottom: 1px solid hsl(var(--border));
  backdrop-filter: blur(12px);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 50;

  @media (max-width: 768px) {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

.menubar {
  user-select: none;

  :deep([data-radix-menubar-trigger]) {
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.5rem 0.875rem;
    border-radius: 6px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;

    &:hover {
      background: hsl(var(--accent) / 0.8);
      color: hsl(var(--accent-foreground));
      transform: translateY(-1px);
    }

    &[data-state='open'] {
      background: hsl(var(--accent));
      color: hsl(var(--accent-foreground));
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    &:active {
      transform: translateY(0);
    }
  }

  :deep([data-radix-menubar-content]) {
    animation: slideDownAndFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  :deep([data-radix-menubar-item]) {
    border-radius: 4px;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: hsl(var(--accent) / 0.8);
    }
  }

  :deep([data-radix-menubar-sub-trigger]) {
    border-radius: 4px;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: hsl(var(--accent) / 0.8);
    }
  }
}

kbd {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 1.5rem;
  height: 1.375rem;
  border: 1px solid hsl(var(--border));
  background: linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--muted) / 0.9));
  padding: 0 0.375rem;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  box-shadow:
    0 1px 0 hsl(var(--border)),
    inset 0 0.5px 0 hsl(var(--background));
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

@keyframes slideDownAndFade {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .menubar {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;

    > * {
      width: 100%;
      justify-content: flex-start;
    }
  }
}
</style>
