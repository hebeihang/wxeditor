import { AlignmentType, BorderStyle, convertInchesToTwip, Document, ExternalHyperlink, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx'
import hljs from 'highlight.js/lib/common'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { useWordStyleStore } from '@/stores/word-style'

function extractText(node: any): string {
  if (node.value)
    return node.value
  let t = ''
  if (node.children) {
    for (const c of node.children) t += extractText(c)
  }
  return t
}

function calculateImageDimensions(w: number, h: number) {
  const mw = 6 * 96
  const mh = 9.5 * 96
  if (w <= mw && h <= mh)
    return { width: w, height: h }
  const r = Math.min(mw / w, mh / h)
  return { width: Math.round(w * r), height: Math.round(h * r) }
}

async function fetchImage(url: string): Promise<{ bytes: Uint8Array, contentType: string }> {
  if (url.startsWith('data:')) {
    const m = url.match(/^data:([^;,]+)[^,]*,(.+)$/)!
    const ct = m[1]
    const b64 = m[2]
    const bin = atob(b64)
    const len = bin.length
    const arr = new Uint8Array(len)
    for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i)
    return { bytes: arr, contentType: ct }
  }
  const res = await fetch(url)
  const ct = res.headers.get('content-type') || ''
  const buf = new Uint8Array(await res.arrayBuffer())
  return { bytes: buf, contentType: ct }
}

async function getImageSize(bytes: Uint8Array, contentType: string) {
  const ab = (bytes.buffer as ArrayBufferLike).slice ? (bytes.buffer as any).slice(0) as ArrayBuffer : new Uint8Array(bytes).buffer as ArrayBuffer
  const blob = new Blob([ab], { type: contentType || 'image/png' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => { resolve() }
    img.onerror = () => { reject(new Error('image')) }
    img.src = url
  })
  URL.revokeObjectURL(url)
  return { width: img.width, height: img.height }
}

function headingLevel(depth: number) {
  const m: any = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4, 5: HeadingLevel.HEADING_5, 6: HeadingLevel.HEADING_6 }
  return m[depth] || HeadingLevel.HEADING_1
}

function codeRuns(text: string, language?: string) {
  const runs: TextRun[] = []
  if (!text) {
    runs.push(new TextRun({ text: '' }))
    return runs
  }
  let result: any = null
  try {
    if (language && hljs.getLanguage(language))
      result = hljs.highlight(text, { language, ignoreIllegals: true })
  }
  catch {}
  if (result && result.value) {
    const div = document.createElement('div')
    div.innerHTML = result.value
    const walk = (n: Node) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const v = (n as any).nodeValue || ''
        if (v.length > 0)
          runs.push(new TextRun({ text: v }))
        return
      }
      if (n.nodeType !== Node.ELEMENT_NODE)
        return
      const el = n as HTMLElement
      for (const c of Array.from(el.childNodes)) walk(c)
    }
    for (const c of Array.from(div.childNodes)) walk(c)
  }
  if (runs.length === 0) {
    const segs = text.split('\n')
    segs.forEach((s, i) => {
      if (s.length > 0)
        runs.push(new TextRun({ text: s }))
      if (i < segs.length - 1)
        runs.push(new TextRun({ text: '', break: 1 }))
    })
  }
  return runs
}

function halfPoints(pt: number) { return Math.round(pt * 2) }
function twips(pt: number) { return Math.round(pt * 20) }

export async function exportDOCX(title: string, markdown: string) {
  const wordStyleStore = useWordStyleStore()
  const preset = wordStyleStore.getCurrentPreset()
  const headingStyles: any = {}
  preset.heading.sizesPt.forEach((size, idx) => {
    const level = idx + 1
    headingStyles[`heading${level}`] = {
      id: `Heading${level}`,
      name: `Heading ${level}`,
      basedOn: 'Normal',
      next: 'Normal',
      run: { size: halfPoints(size), bold: preset.heading.bold, font: preset.bodyFont },
      paragraph: {
        spacing: { before: twips(preset.paragraph.beforePt / 2), after: twips(preset.paragraph.afterPt / 2), line: preset.paragraph.lineSpacing },
        alignment: preset.heading.align,
      },
    }
  })
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkBreaks).use(remarkMath)
  const ast = processor.runSync(processor.parse(markdown)) as any
  const linkDefs = new Map<string, { url: string, title?: string }>()
  visit(ast, 'definition', (node: any) => { linkDefs.set(node.identifier.toLowerCase(), { url: node.url, title: node.title }) })
  const children: any[] = []
  const convertInline = async (nodes: any[]): Promise<(TextRun | ImageRun | ExternalHyperlink | TextRun)[]> => {
    const runs: any[] = []
    for (const node of nodes) {
      const r = await convertInlineNode(node)
      if (!r)
        continue
      if (Array.isArray(r))
        runs.push(...r)
      else runs.push(r)
    }
    return runs
  }
  const convertLink = async (node: any) => {
    const text = extractText(node)
    const url = node.url || '#'
    return new ExternalHyperlink({ children: [new TextRun({ text, color: preset.hyperlink.color, underline: { type: 'single', color: preset.hyperlink.color } })], link: url })
  }
  const convertLinkRef = async (node: any) => {
    const text = extractText(node)
    const def = linkDefs.get(node.identifier.toLowerCase())
    const url = def?.url || '#'
    return new ExternalHyperlink({ children: [new TextRun({ text, color: preset.hyperlink.color, underline: { type: 'single', color: preset.hyperlink.color } })], link: url })
  }
  const convertImage = async (node: any) => {
    try {
      const { bytes, contentType } = await fetchImage(node.url)
      const { width, height } = await getImageSize(bytes, contentType)
      const { width: w, height: h } = calculateImageDimensions(width, height)
      let t: 'png' | 'jpg' | 'gif' | 'bmp' = 'png'
      const lc = (contentType || '').toLowerCase()
      if (lc.includes('jpeg') || lc.includes('jpg'))
        t = 'jpg'
      else if (lc.includes('gif'))
        t = 'gif'
      else if (lc.includes('bmp'))
        t = 'bmp'
      return new ImageRun({ data: bytes, transformation: { width: w, height: h }, type: t, altText: { title: node.alt || 'Image', description: node.alt || '', name: node.alt || 'image' } })
    }
    catch {
      return new TextRun({ text: `[图片加载失败: ${node.alt || node.url}]`, italics: true, color: 'DC2626', bold: true })
    }
  }
  const convertInlineNode = async (node: any): Promise<any> => {
    switch (node.type) {
      case 'text':
        return new TextRun({ text: node.value })
      case 'strong':
        return await convertInline(node.children.map((c: any) => ({ ...c, strong: true })))
      case 'emphasis':
        return await convertInline(node.children.map((c: any) => ({ ...c, italics: true })))
      case 'delete':
        return await convertInline(node.children.map((c: any) => ({ ...c, strike: true })))
      case 'inlineCode':
        return new TextRun({ text: node.value, shading: { fill: 'f6f8fa' } })
      case 'link':
        return await convertLink(node)
      case 'linkReference':
        return await convertLinkRef(node)
      case 'image':
        return await convertImage(node)
      case 'inlineMath':
        return new TextRun({ text: node.value })
      case 'break':
        return new TextRun({ text: '', break: 1 })
      case 'html':
        const v = node.value?.trim() || ''
        if (/^<br\s*\/?>\s*$/i.test(v))
          return new TextRun({ text: '', break: 1 })
        return new TextRun({ text: v.replace(/<[^>]+>/g, '') })
      default:
        return null
    }
  }
  const convertCode = (node: any) => {
    const runs = codeRuns(node.value ?? '', node.lang)
    return new Paragraph({ children: runs, wordWrap: true, alignment: AlignmentType.LEFT, spacing: { before: 200, after: 200, line: 276 }, shading: { fill: 'f6f8fa' }, border: { top: { color: 'E1E4E8', space: 10, style: BorderStyle.SINGLE, size: 6 }, bottom: { color: 'E1E4E8', space: 10, style: BorderStyle.SINGLE, size: 6 }, left: { color: 'E1E4E8', space: 10, style: BorderStyle.SINGLE, size: 6 }, right: { color: 'E1E4E8', space: 10, style: BorderStyle.SINGLE, size: 6 } } })
  }
  const convertBlockquote = async (node: any) => {
    const ps: Paragraph[] = []
    let i = 0
    for (const child of node.children) {
      if (child.type === 'paragraph') {
        const runs = await convertInline(child.children)
        const isFirst = i === 0
        const isLast = i === node.children.length - 1
        const before = isFirst ? 200 : 120
        const after = isLast ? 300 : 0
        ps.push(new Paragraph({ children: runs, spacing: { before, after, line: 288 }, alignment: AlignmentType.LEFT, indent: { left: convertInchesToTwip(0.17), right: convertInchesToTwip(0.09) }, border: { left: { color: 'DFE2E5', space: 6, style: BorderStyle.SINGLE, size: 24 }, top: { color: 'F6F8FA', space: 4, style: BorderStyle.SINGLE, size: 1 }, bottom: { color: 'F6F8FA', space: 4, style: BorderStyle.SINGLE, size: 1 }, right: { color: 'F6F8FA', space: 6, style: BorderStyle.SINGLE, size: 1 } }, shading: { fill: 'F6F8FA' } }))
        i++
      }
    }
    return ps
  }
  const convertTable = async (node: any) => {
    const rows: TableRow[] = []
    const align = node.align || []
    const trs = node.children.filter((r: any) => r.type === 'tableRow')
    for (let ri = 0; ri < trs.length; ri++) {
      const row = trs[ri]
      const isHeader = ri === 0
      const cells: TableCell[] = []
      for (let ci = 0; ci < row.children.length; ci++) {
        const cell = row.children[ci]
        const runs = await convertInline(cell.children)
        let a: 'left' | 'center' | 'right' = 'left'
        if (isHeader)
          a = 'center'
        else if (align[ci] === 'center')
          a = 'center'
        else if (align[ci] === 'right')
          a = 'right'
        const padding = twips(preset.table.cellPaddingPt)
        const tc = new TableCell({ children: [new Paragraph({ children: runs, alignment: a, spacing: { before: 60, after: 60, line: 240 } })], margins: { top: padding, bottom: padding, left: padding, right: padding } })
        cells.push(tc)
      }
      rows.push(new TableRow({ children: cells, tableHeader: isHeader }))
    }
    return new Table({ rows, alignment: AlignmentType.CENTER })
  }
  const convertThematicBreak = () => new Paragraph({ text: '', alignment: AlignmentType.LEFT, spacing: { before: 300, after: 300, line: 120, lineRule: 'exact' as any }, border: { bottom: { color: 'E1E4E8', space: 1, style: BorderStyle.SINGLE, size: 12 } } })
  const convertParagraph = async (node: any) => {
    const runs = await convertInline(node.children)
    if (runs.length === 0)
      return new Paragraph({ text: '', spacing: { before: 240, after: 240, line: 360 }, alignment: AlignmentType.LEFT })
    return new Paragraph({ children: runs, spacing: { before: 240, after: 240, line: 360 }, alignment: AlignmentType.LEFT })
  }
  const convertHeading = (node: any) => {
    const lvl = headingLevel(node.depth)
    const text = extractText(node)
    return new Paragraph({ text, heading: lvl })
  }
  const convertListItem = async (ordered: boolean, node: any, level: number) => {
    const items: Paragraph[] = []
    const isTask = node.checked !== null && node.checked !== undefined
    for (const child of node.children) {
      if (child.type === 'paragraph') {
        const runs = await convertInline(child.children)
        if (isTask) {
          runs.unshift(new TextRun({ text: `${node.checked ? '▣' : '☐'} ` }))
        }
        const p: any = { children: runs, spacing: { before: 0, after: 0, line: 360 }, alignment: AlignmentType.LEFT }
        if (ordered && !isTask)
          p.numbering = { reference: 'default-ordered-list', level }
        else p.bullet = { level }
        items.push(new Paragraph(p))
      }
      else if (child.type === 'list') {
        for (const nested of child.children) {
          items.push(...await convertListItem(child.ordered, nested, level + 1))
        }
      }
    }
    return items
  }
  const convertList = async (node: any) => {
    const items: Paragraph[] = []
    for (const item of node.children) items.push(...await convertListItem(node.ordered, item, 0))
    return items
  }
  for (const node of ast.children) {
    if (node.type === 'thematicBreak' && children.length > 0 && (children[children.length - 1] as any)?._isHr === true) {
      children.push(new Paragraph({ text: '', alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0, line: 1, lineRule: 'exact' as any } }))
    }
    let converted: any = null
    switch (node.type) {
      case 'heading':
        converted = convertHeading(node)
        break
      case 'paragraph':
        converted = await convertParagraph(node)
        break
      case 'list':
        converted = await convertList(node)
        break
      case 'code':
        converted = convertCode(node)
        break
      case 'blockquote':
        converted = await convertBlockquote(node)
        break
      case 'table':
        converted = await convertTable(node)
        break
      case 'thematicBreak':
        converted = convertThematicBreak()
        ;(converted as any)._isHr = true
        break
      case 'html':
        converted = new Paragraph({ children: [new TextRun({ text: '[HTML]' })], alignment: AlignmentType.LEFT, spacing: { before: 120, after: 120 } })
        break
      case 'math':
        converted = new Paragraph({ children: [new TextRun({ text: node.value })], spacing: { before: 120, after: 120 }, alignment: AlignmentType.CENTER })
        break
      default:
        converted = null
    }
    if (converted) {
      if (Array.isArray(converted))
        children.push(...converted)
      else children.push(converted)
    }
  }
  const numbering = {
    config: [
      {
        reference: 'default-ordered-list',
        levels: Array.from({ length: 9 }).map((_, i) => ({ level: i, format: 'decimal', text: `%${i + 1}.`, alignment: 'left' })),
      },
    ],
  } as any

  const doc = new Document({
    title,
    numbering,
    styles: {
      default: {
        run: { font: preset.bodyFont, size: halfPoints(preset.bodySizePt) },
        paragraph: { spacing: { line: preset.paragraph.lineSpacing, before: twips(preset.paragraph.beforePt / 2), after: twips(preset.paragraph.afterPt / 2) } },
      },
      heading1: headingStyles.heading1,
      heading2: headingStyles.heading2,
      heading3: headingStyles.heading3,
      heading4: headingStyles.heading4,
      heading5: headingStyles.heading5,
      heading6: headingStyles.heading6,
    } as any,
    sections: [{ properties: { page: { margin: { top: convertInchesToTwip(1), right: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1) } } }, children }],
  })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/\s+/g, '_') || 'document'}.docx`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
}
