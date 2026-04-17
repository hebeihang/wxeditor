import { toPng } from 'html-to-image'
import {
  downloadFile,
  downloadMD,
  exportHTML,
  exportPDF,
  exportPureHTML,
  getHtmlContent,
  sanitizeTitle,
} from '@/utils'
import { exportDOCX } from '@/utils/export-docx'
import { usePostStore } from './post'
import { useRenderStore } from './render'
import { useUIStore } from './ui'

export const useExportStore = defineStore(`export`, () => {
  const postStore = usePostStore()
  const renderStore = useRenderStore()
  const uiStore = useUIStore()

  const editorContent2HTML = () => {
    const temp = getHtmlContent()
    document.querySelector(`#output`)!.innerHTML = renderStore.output
    return temp
  }

  const exportEditorContent2HTML = async () => {
    const currentPost = postStore.currentPost
    if (!currentPost)
      return
    await exportHTML(currentPost.title)
    document.querySelector(`#output`)!.innerHTML = renderStore.output
  }

  const exportEditorContent2PureHTML = (content: string) => {
    const currentPost = postStore.currentPost
    if (!currentPost)
      return
    exportPureHTML(content, currentPost.title)
  }

  const downloadAsCardImage = async () => {
    const currentPost = postStore.currentPost
    if (!currentPost)
      return
    const el = document.querySelector<HTMLElement>(`#output-wrapper>.preview`)
    if (!el)
      return
    // 添加临时样式：禁用代码块滚动，启用换行
    const style = document.createElement('style')
    style.textContent = `
      .preview pre.code__pre,
      .preview .hljs.code__pre,
      .preview pre.code__pre > code,
      .preview .hljs.code__pre > code,
      .preview .code-scroll,
      .preview pre section,
      .preview code section {
        overflow: visible !important;
      }
      .preview pre.code__pre > code,
      .preview .code-scroll,
      .preview .code-scroll > div {
        white-space: pre-wrap !important;
        word-break: break-all !important;
        min-width: auto !important;
      }
    `
    document.head.appendChild(style)

    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      const url = await toPng(el, {
        backgroundColor: uiStore.isDark ? `` : `#fff`,
        skipFonts: true,
        pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
        style: { margin: `0` },
      })
      downloadFile(url, `${sanitizeTitle(currentPost.title)}.png`, `image/png`)
    }
    finally {
      style.remove()
    }
  }

  const exportEditorContent2PDF = async () => {
    const currentPost = postStore.currentPost
    if (!currentPost)
      return
    await exportPDF(currentPost.title)
    document.querySelector(`#output`)!.innerHTML = renderStore.output
  }

  const exportEditorContent2MD = (content: string) => {
    const currentPost = postStore.currentPost
    if (!currentPost)
      return
    downloadMD(content, currentPost.title)
  }

  const exportEditorContent2DOCX = async () => {
    const currentPost = postStore.currentPost
    if (!currentPost)
      return
    const content = currentPost.content || ''
    await exportDOCX(currentPost.title || 'document', content)
    document.querySelector(`#output`)!.innerHTML = renderStore.output
  }

  return {
    editorContent2HTML,
    exportEditorContent2HTML,
    exportEditorContent2PureHTML,
    downloadAsCardImage,
    exportEditorContent2PDF,
    exportEditorContent2MD,
    exportEditorContent2DOCX,
  }
})
