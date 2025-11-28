import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { store } from '@/utils/storage'
import { ACTION_COMMANDS } from './quick-commands/actions'
import { CONNECT_COMMANDS } from './quick-commands/connect'
import { EXPAND_COMMANDS } from './quick-commands/expand'
import { GENERAL_COMMANDS } from './quick-commands/general'
import { STYLE_COMMANDS, STYLE_IDS } from './quick-commands/styles'
import { TITLE_COMMANDS } from './quick-commands/title'
import { TONE_COMMANDS } from './quick-commands/tones'

export interface QuickCommandPersisted {
  id: string
  label: string
  template: string // 用 {{sel}} 占位
}

export interface QuickCommandRuntime extends QuickCommandPersisted {
  buildPrompt: (sel?: string) => string
}

const STORAGE_KEY = `quick_commands`

// 把持久化的对象转换为可执行的 buildPrompt
function hydrate(cmd: QuickCommandPersisted): QuickCommandRuntime {
  return {
    ...cmd,
    buildPrompt: (sel = ``) =>
      cmd.template.replace(/\{\{\s*sel\s*\}\}/gi, sel),
  }
}

const DEFAULT_COMMANDS: QuickCommandPersisted[] = [
  ...ACTION_COMMANDS,
  ...TITLE_COMMANDS,
  ...STYLE_COMMANDS,
  ...TONE_COMMANDS,
  ...GENERAL_COMMANDS,
  ...EXPAND_COMMANDS,
  ...CONNECT_COMMANDS,
]

export const useQuickCommands = defineStore(`quickCommands`, () => {
  // ---------- state ----------
  const commands = ref<QuickCommandRuntime[]>([])

  // ---------- helpers ----------
  async function save() {
    const toSave: QuickCommandPersisted[] = commands.value.map(
      ({ id, label, template }) => ({ id, label, template }),
    )
    await store.setJSON(STORAGE_KEY, toSave)
  }

  async function load() {
    const parsed = await store.getJSON<QuickCommandPersisted[]>(STORAGE_KEY)

    if (parsed && Array.isArray(parsed)) {
      try {
        commands.value = parsed.map(hydrate)
      }
      catch (e) {
        console.warn(`解析快捷指令失败，已恢复默认值`, e)
        commands.value = DEFAULT_COMMANDS.map(hydrate)
        await save()
      }
    }
    else {
      commands.value = DEFAULT_COMMANDS.map(hydrate)
      await save()
    }

    const ensure = (cmd: QuickCommandPersisted) => {
      const i = commands.value.findIndex(c => c.id === cmd.id)
      if (i === -1)
        commands.value.push(hydrate(cmd))
      else
        commands.value[i] = hydrate({ ...commands.value[i], template: cmd.template, label: cmd.label })
    }
    for (const cmd of DEFAULT_COMMANDS) ensure(cmd)
    commands.value = commands.value.filter(c => !c.id.startsWith('style:') || STYLE_IDS.includes(c.id))
    await save()
  }

  // ---------- CRUD ----------
  function add(label: string, template: string, id?: string) {
    const finalId = id && id.trim().length > 0 ? id : crypto.randomUUID()
    commands.value.push(hydrate({ id: finalId, label, template }))
  }

  function update(id: string, label: string, template: string) {
    const idx = commands.value.findIndex(c => c.id === id)
    if (idx !== -1)
      commands.value[idx] = hydrate({ id, label, template })
  }

  function remove(id: string) {
    commands.value = commands.value.filter(c => c.id !== id)
  }

  // ---------- init ----------
  load()
  watch(commands, save, { deep: true })

  return { commands, add, update, remove }
})
