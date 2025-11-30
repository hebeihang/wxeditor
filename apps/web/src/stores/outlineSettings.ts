import { store as kvStore } from '@/utils/storage'

export function useOutlineSettings() {
  const outline_granularity = kvStore.reactive<string>('ai_outline_granularity', '中等')
  const outline_depth = kvStore.reactive<string>('ai_outline_depth', '两层')
  const outline_type = kvStore.reactive<string>('ai_outline_type', '')
  const preserve_order = kvStore.reactive<boolean>('ai_outline_preserve_order', true)
  const compression_level = kvStore.reactive<string>('ai_outline_compression_level', '适度压缩')
  const preserve_terms = kvStore.reactive<boolean>('ai_outline_preserve_terms', true)
  const outline_style = kvStore.reactive<string>('ai_outline_style', '直述')
  const output_format = kvStore.reactive<string>('ai_outline_output_format', 'markdown')
  const analysis_focus = kvStore.reactive<string>('ai_outline_analysis_focus', '')
  const merge_similar_points = kvStore.reactive<boolean>('ai_outline_merge_similar_points', true)
  const infer_implied_points = kvStore.reactive<boolean>('ai_outline_infer_implied_points', false)
  const allow_expansion = kvStore.reactive<boolean>('ai_outline_allow_expansion', false)
  const custom_instruction = kvStore.reactive<string>('ai_outline_custom_instruction', '')

  function buildUserPrompt(inputText: string): string {
    const typeText = outline_type.value ? `类型：${outline_type.value}。` : ''
    const focusText = analysis_focus.value ? `分析重点：${analysis_focus.value}。` : ''
    const mergeText = merge_similar_points.value ? '自动合并相似要点。' : '保留所有细点不做合并。'
    const inferText = infer_implied_points.value ? '允许识别隐含信息并补全合理隐含观点。' : '仅基于字面内容，不推断隐含信息。'
    const expandText = allow_expansion.value ? '遇到逻辑不清可补充一点。' : '只分解不扩写。'
    const preserveOrderText = preserve_order.value ? '严格按原文顺序拆点。' : '允许重新组织提纲结构。'
    const preserveTermsText = preserve_terms.value ? '保留原文关键术语原词。' : '术语可概括。'
    const compressionText = compression_level.value === '逐句拆解'
      ? '逐句拆解，几乎不总结。'
      : compression_level.value === '稍作总结'
        ? '稍作总结，简化为关键句。'
        : compression_level.value === '适度压缩'
          ? '适度压缩，提炼重点。'
          : '大幅抽象，高度归纳。'
    const depthText = outline_depth.value === '单层'
      ? '层级：单层。'
      : outline_depth.value === '两层'
        ? '层级：两层（大点+小点）。'
        : outline_depth.value === '三层'
          ? '层级：三层（大点+小点+例证）。'
          : '层级：自动按内容判断。'
    const granularityText = outline_granularity.value === '粗略'
      ? '粒度：粗略（三大点结构）。'
      : outline_granularity.value === '中等'
        ? '粒度：中等（3–6 个要点）。'
        : outline_granularity.value === '精细'
          ? '粒度：精细（6–12 个要点）。'
          : '粒度：超细（每句话一个要点）。'
    const styleText = `呈现风格：${outline_style.value}。`
    const customText = custom_instruction.value?.trim() ? `自定义指令：${custom_instruction.value.trim()}。` : ''
    const formatHint = output_format.value === 'markdown'
      ? '输出 Markdown（#、##、-）。'
      : output_format.value === 'list'
        ? '输出编号列表（1. 2. 3.）。'
        : output_format.value === 'mindmap'
          ? '输出思维导图结构（根节点到子节点的层级列表或嵌套结构）。'
          : output_format.value === 'json'
            ? '只输出 JSON，不要额外文字。键名使用 title、children。'
            : '输出大纲并在顶部附带简短摘要（1–2 句）。'
    const rules = [
      '输出必须遵循用户选择的结构层级与粒度。',
      preserveOrderText,
      preserveTermsText,
      typeText,
      focusText,
      compressionText,
      mergeText,
      inferText,
      expandText,
      styleText,
      depthText,
      granularityText,
      formatHint,
      '不得加入结论性内容，除非用户要求。',
    ].filter(Boolean).join('\n')

    const header = output_format.value === 'json'
      ? '只输出 <replacement>...</replacement> 包裹的严格 JSON，不要 <notes>。'
      : '只输出 <replacement>...</replacement> 包裹的大纲文本，不要 <notes>。'

    const body = `设置:\n${rules}\n\n原文或思路:\n${inputText}`
    return `${header}\n\n${body}\n\n${customText}`
  }

  function exportSettingsJSON(): string {
    const obj = {
      outline_granularity: outline_granularity.value,
      outline_depth: outline_depth.value,
      outline_type: outline_type.value,
      preserve_order: preserve_order.value,
      compression_level: compression_level.value,
      preserve_terms: preserve_terms.value,
      outline_style: outline_style.value,
      output_format: output_format.value,
      analysis_focus: analysis_focus.value,
      merge_similar_points: merge_similar_points.value,
      infer_implied_points: infer_implied_points.value,
      allow_expansion: allow_expansion.value,
      custom_instruction: custom_instruction.value || '',
    }
    try { return JSON.stringify(obj, null, 2) }
    catch { return '{}' }
  }

  return {
    outline_granularity,
    outline_depth,
    outline_type,
    preserve_order,
    compression_level,
    preserve_terms,
    outline_style,
    output_format,
    analysis_focus,
    merge_similar_points,
    infer_implied_points,
    allow_expansion,
    custom_instruction,
    buildUserPrompt,
    exportSettingsJSON,
  }
}

export default useOutlineSettings
