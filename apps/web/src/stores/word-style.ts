export type WordStyleId = 'default' | 'academic' | 'business' | 'minimal'

export interface WordStylePreset {
  id: WordStyleId
  name: string
  bodyFont: string
  bodySizePt: number
  heading: { sizesPt: number[], bold: boolean, align: 'left' | 'center' }
  hyperlink: { color: string }
  code: { font: string, sizePt: number, background: string }
  table: { borders: 'full' | 'horizontal' | 'none', cellPaddingPt: number }
  paragraph: { lineSpacing: number, beforePt: number, afterPt: number }
}

const PRESETS: WordStylePreset[] = [
  {
    id: 'default',
    name: '默认',
    bodyFont: 'Calibri',
    bodySizePt: 12,
    heading: { sizesPt: [24, 20, 18, 16, 14, 12], bold: true, align: 'left' },
    hyperlink: { color: '0366D6' },
    code: { font: 'Consolas', sizePt: 11, background: 'f6f8fa' },
    table: { borders: 'full', cellPaddingPt: 6 },
    paragraph: { lineSpacing: 360, beforePt: 6, afterPt: 6 },
  },
  {
    id: 'academic',
    name: '学术',
    bodyFont: 'Times New Roman',
    bodySizePt: 12,
    heading: { sizesPt: [24, 20, 18, 16, 14, 12], bold: true, align: 'center' },
    hyperlink: { color: '1A5FB4' },
    code: { font: 'Courier New', sizePt: 11, background: 'f0f0f0' },
    table: { borders: 'full', cellPaddingPt: 6 },
    paragraph: { lineSpacing: 360, beforePt: 8, afterPt: 8 },
  },
  {
    id: 'business',
    name: '商务',
    bodyFont: 'Arial',
    bodySizePt: 11,
    heading: { sizesPt: [22, 18, 16, 14, 13, 12], bold: true, align: 'left' },
    hyperlink: { color: '0056B3' },
    code: { font: 'Consolas', sizePt: 10, background: 'f8f9fa' },
    table: { borders: 'horizontal', cellPaddingPt: 5 },
    paragraph: { lineSpacing: 340, beforePt: 4, afterPt: 4 },
  },
  {
    id: 'minimal',
    name: '极简',
    bodyFont: 'Segoe UI',
    bodySizePt: 11,
    heading: { sizesPt: [22, 18, 16, 14, 13, 12], bold: false, align: 'left' },
    hyperlink: { color: '0A84FF' },
    code: { font: 'Consolas', sizePt: 10, background: 'f7f7f7' },
    table: { borders: 'none', cellPaddingPt: 4 },
    paragraph: { lineSpacing: 320, beforePt: 3, afterPt: 3 },
  },
]

export const useWordStyleStore = defineStore('word-style', () => {
  const current = ref<WordStyleId>('default')
  const presets = ref<WordStylePreset[]>(PRESETS)

  function setStyle(id: WordStyleId) {
    current.value = id
  }

  function getCurrentPreset(): WordStylePreset {
    return presets.value.find(p => p.id === current.value) || PRESETS[0]
  }

  return { current, presets, setStyle, getCurrentPreset }
})
