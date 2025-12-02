import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fetch from 'node-fetch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function readSample() {
  const p = path.resolve(__dirname, 'polish-sample.txt')
  try {
    return await fs.promises.readFile(p, 'utf8')
  }
  catch {
    return 'OpenAI 宣布推出新模型 Qwen，该模型在多项基准测试中超过 DeepSeek。但业内人士对其商业化前景持不同意见。'
  }
}

async function readStyles() {
  const stylesPath = path.resolve(__dirname, '../src/stores/quick-commands/styles.ts')
  const code = await fs.promises.readFile(stylesPath, 'utf8')
  const out = []
  const re = /id:\s*`([^`]+)`[\s\S]*?label:\s*`([^`]+)`[\s\S]*?template:\s*`([\s\S]*?)`/g
  let m
  while ((m = re.exec(code)) !== null) {
    const tpl = m[3].replace(/\n\s*\{\{\s*sel\s*\}\}/i, '').trim()
    out.push({ id: m[1], label: m[2], detail: tpl })
  }
  return out
}

async function readDefaultEndpoint() {
  const p = path.resolve(__dirname, '../../packages/shared/src/constants/ai-config.ts')
  try {
    const code = await fs.promises.readFile(p, 'utf8')
    const m = code.match(/DEFAULT_SERVICE_ENDPOINT\s*=\s*`([^`]+)`/)
    return m ? m[1] : 'https://proxy-ai.doocs.org/v1'
  }
  catch {
    return 'https://proxy-ai.doocs.org/v1'
  }
}

async function readDefaultModel() {
  const p = path.resolve(__dirname, '../../packages/shared/src/configs/ai-service-options.ts')
  try {
    const code = await fs.promises.readFile(p, 'utf8')
    const block = code.match(/value:\s*`default`[\s\S]*?models:\s*\[([\s\S]*?)\]/)
    if (block) {
      const list = [...block[1].matchAll(/`([^`]+)`/g)].map(m => m[1])
      return list[0] || 'Qwen/Qwen2.5-7B-Instruct'
    }
    return 'Qwen/Qwen2.5-7B-Instruct'
  }
  catch {
    return 'Qwen/Qwen2.5-7B-Instruct'
  }
}

function extractReplacementAndNotes(raw) {
  let replacement = ''
  let notes = ''
  const allNotes = raw.match(/<notes>[\s\S]*?<\/notes>/gi) || []
  if (allNotes.length) {
    notes = allNotes.map(n => n.replace(/<\/?notes>/gi, '').trim()).join('\n\n')
  }
  else {
    const incompleteNotes = raw.match(/<notes>[\s\S]*$/i)
    if (incompleteNotes)
      notes = incompleteNotes[0].replace(/<\/?notes>/gi, '').trim()
  }
  const rep = raw.match(/<replacement>[\s\S]*?<\/replacement>/i) || raw.match(/<replacement>[\s\S]*?(?=<notes>|$)/i)
  if (rep) {
    let candidateRep = rep[0]
      .replace(/<\/?replacement>/gi, '')
      .replace(/<notes>[\s\S]*?<\/notes>/gi, '')
      .replace(/<notes>[\s\S]*$/i, '')
      .trim()
    candidateRep = candidateRep.replace(/<\/?(?!replacement\b|notes\b)[a-z][\w-]*\b[^>]*>/gi, '').trim()
    replacement = candidateRep
  }
  if (!replacement) {
    let stripped = raw
      .replace(/<notes>[\s\S]*?<\/notes>/gi, '')
      .replace(/<notes>[\s\S]*$/i, '')
      .replace(/<\/?replacement>/gi, '')
      .trim()
    stripped = stripped.replace(/<\/?(?!replacement\b|notes\b)[a-z][\w-]*\b[^>]*>/gi, '')
    const idx = stripped.search(/\n#{1,6}\s|\n(?:术语与决策说明|说明|Notes)/i)
    if (idx > 0) {
      replacement = stripped.slice(0, idx).trim()
      if (!notes)
        notes = stripped.slice(idx).trim()
    }
    if (!replacement) {
      const fence = stripped.match(/```[\s\S]*?```/)
      if (fence)
        replacement = fence[0].replace(/```/g, '').trim()
    }
    if (!replacement)
      replacement = stripped
  }
  const idx2 = replacement.search(/\n(?:#{1,6}\s*)?(?:术语与决策说明|说明|Notes?|Explanation|Reasoning)\s*[:：\n]/i)
  if (idx2 > 0) {
    const extra = replacement.slice(idx2).replace(/<\/?(?!replacement\b|notes\b)[a-z][\w-]*\b[^>]*>/gi, '').trim()
    replacement = replacement.slice(0, idx2).trim()
    if (extra)
      notes = notes ? `${notes}\n\n${extra}` : extra
  }
  return { replacement, notes }
}

function sanitizeAIContent(raw) {
  let s = raw || ''
  s = s.replace(/<notes>[\s\S]*?<\/notes>/gi, '')
  s = s.replace(/<notes>[\s\S]*$/i, '')
  s = s.replace(/<\/?replacement>/gi, '')
  s = s.replace(/<\/?(?!replacement\b|notes\b)[a-z][\w-]*\b[^>]*>/gi, '')
  s = s.replace(/\{\{\s*sel\s*\}\}/gi, '')
  return s.trim()
}

function hasHeading(text) {
  return /(?:^|\n)\s{0,3}#{1,6}\s/.test(text)
}

function hasList(text) {
  return /(?:^|\n)\s*[-*+]\s+/.test(text)
}

// 风格特征模板（用于提示与自动化检测）
const styleSignatures = {
  'style:business': { requiredPhrases: ['核心观点：', '我们观察到', '商业价值在于', '可行性建议'], structureHints: ['分点', '结论先行'] },
  'style:academic': { requiredPhrases: ['首先', '其次', '此外', '因此'], structureHints: ['论证链条', '方法论'] },
  'style:official': { requiredPhrases: ['背景', '问题', '措施', '结语'], structureHints: ['四段结构'] },
  'style:news-report': { requiredPhrases: ['据报道', '消息人士称', '时间', '地点', '人物', '事件', '原因'], structureHints: ['导语', '倒金字塔'] },
  'style:ppt-brief': { requiredPhrases: ['要点：', '结论：', '建议：'], structureHints: ['短句', '项目符号'] },
  'style:editorial': { requiredPhrases: ['我们认为', '不可忽视', '必须正视', '值得警惕'], structureHints: ['观点—论据—反驳—结论'] },
  'style:legal': { requiredPhrases: ['事实', '争点', '适用法律', '分析', '结论'], structureHints: ['IRAC'] },
  'style:popular-science': { requiredPhrases: ['打个比方', '通俗地说', '想象一下'], structureHints: ['类比', '示例'] },
  'style:whitepaper': { requiredPhrases: ['背景与趋势', '技术路径', '应用场景', '潜在影响'], structureHints: ['章节结构'] },
  'style:business-letter': { requiredPhrases: ['尊敬的', '谨此', '期待您的回复', '此致'], structureHints: ['礼貌用语'] },
  'style:product-ops': { requiredPhrases: ['核心指标', '用户洞察', '增长路径', '策略建议'], structureHints: ['落地执行'] },
  'style:investment': { requiredPhrases: ['概况', '估值', '风险点', '预测', '结论'], structureHints: ['分节标题'] },
  'style:tech-writing': { requiredPhrases: ['问题', '原因', '方案', '步骤', '注意事项'], structureHints: ['过程解释'] },
}

// 风格宽容策略：长度范围与结构允许度
const stylePolicies = {
  'style:official': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: true, allowIfOriginalLists: false },
  'style:editorial': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: true, allowIfOriginalLists: false },
  'style:legal': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: true, allowIfOriginalLists: false },
  'style:business-letter': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: false, allowIfOriginalLists: false },
  'style:investment': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: true, allowIfOriginalLists: false },
  'style:ppt-brief': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: true, allowIfOriginalLists: true },
  'style:business': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: false, allowIfOriginalLists: true },
  'style:news-report': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: false, allowIfOriginalLists: false },
  'style:popular-science': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: false, allowIfOriginalLists: false },
  'style:tech-writing': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: false, allowIfOriginalLists: false },
  'style:academic': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: false, allowIfOriginalLists: false },
  'style:whitepaper': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: true, allowIfOriginalLists: false },
  'style:product-ops': { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: false, allowIfOriginalLists: true },
}

const styleConstraints = {
  'style:official': '保持与原文句子数量一致；不得新增段落结构；不得扩写“背景/问题/措施”等公文条目；仅替换为更正式、行政化、规范的表达。',
  'style:editorial': '仅将语气转换为更具观点性，不得新增论据、背景或论证段落；长度保持在原文范围内。',
  'style:legal': '可套用“事实/争点/法律/分析/结论”结构（仅当原文存在时），但每一要点只能复述原文信息，不得新增案例、法律条文或分析段落。',
  'style:business-letter': '格式固定：[称呼] 正文 [结束语] [署名]；不得新增额外的礼貌语或结尾语；长度保持原文范围。',
  'style:investment': '必须保持原有标题结构（概况/估值/风险点/预测/结论）；不得删除任何段落，也不得新增段落；仅句内风格化替换。',
  'style:ppt-brief': '不得新增标题或列表；如原文已有列表，仅可微调措辞不可增加条目；长度保持原文范围。',
}

function buildOptimizePrompt(styleLabel, inputText, styleDetail, styleId) {
  const tone = '无'
  const preserve = '保留专有名词（人名、品牌、技术名词、机构名等）原样不改。'
  const strength = '润色强度：60/100（强度越高改动越大）。'
  const lenText = '整体长度尽量与原文一致。'
  const structText = '禁止新增结构（标题、段落、列表、分析框架等）。'
  const readText = '目标读者：大众读者。术语解释充分，句式简洁，避免过多缩写。'
  const customText = ''
  const sig = styleSignatures[styleId] || { requiredPhrases: [], structureHints: [] }
  const sigText = (sig.requiredPhrases.length || sig.structureHints.length)
    ? `\n- 必须包含风格特征（可适度变体）：${[...sig.requiredPhrases, ...sig.structureHints].join('、')}`
    : ''
  const hard = `\n统一硬性规则：\n- 禁止扩写：生成文本字数必须在原文 ±10% 内。\n- 禁止新增结构（标题、段落、列表、分析框架等）。\n- 禁止新增信息（不得凭空加入背景、解释、推论、数字、来源等）。\n- 仅改变表达方式，不改变信息量和段落数量。`
  const constraint = styleConstraints[styleId] ? `\n- 约束：${styleConstraints[styleId]}` : ''
  const base = `请严格按照指定文风重写文本（不是仅润色）。不得新增或虚构信息，必须保持所有事实一致。\n\n设置：\n- 文风：${styleLabel}\n- 语气：${tone}\n- ${strength}\n- ${lenText}\n- ${structText}\n- ${readText}\n- ${preserve}\n- ${customText}${styleDetail ? `\n- 风格细则：${styleDetail}` : ''}${sigText}${hard}${constraint}\n\n只输出 <replacement>...</replacement>（Markdown），不要输出 <notes> 或其他标签。\n\n文本：\n${inputText}`
  return base
}

async function callAI(prompt, endpoint, model) {
  const systemPrompt = '你是一名专业的多语言文本助手，请根据用户的指令处理下列内容。在输出时，不要输出任何额外的信息，只输出处理后的文本。'
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]
  const payload = {
    model,
    messages,
    temperature: 1,
    max_tokens: 1024,
    stream: false,
  }
  const headers = { 'Content-Type': 'application/json' }
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) })
  const text = await res.text()
  if (!res.ok)
    throw new Error(text)
  const json = JSON.parse(text)
  const content = json.choices?.[0]?.message?.content || ''
  return content
}

// 系统检测器指令（严格 JSON 输出）
function buildDetectorSystemPrompt(styleId) {
  const p = stylePolicies[styleId] || { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: false, allowIfOriginalLists: false }
  const allowHead = p.allowHeadings
    ? '允许新增小标题（须与原信息一致）'
    : (p.allowIfOriginalHeadings ? '仅当原文存在时可保留小标题，不允许新增' : '不允许新增标题')
  const allowList = p.allowLists
    ? '允许新增要点式列表（须与原信息一致）'
    : (p.allowIfOriginalLists ? '仅当原文存在时可保留列表，不允许新增' : '不允许新增列表')
  return `你是一名写作风格一致性与内容差异检测器，任务是根据输入的原文（raw）、模型的风格化结果（replacement）以及目标风格（style），判断是否存在以下问题：\n\n长度异常扩写或缩写（按风格宽容度）：\n- 若 replacement/raw > ${p.lenMax.toFixed(2)} 判定为“扩写违规”；\n- 若 replacement/raw < ${p.lenMin.toFixed(2)} 判定为“缩写违规”。\n\n结构新增（按风格允许度）：\n- ${allowHead}；\n- ${allowList}。\n\n标签使用检查：\n- 不允许出现 <replacement>、</replacement>、<notes>、<raw> 等标签。\n\n风格特征缺失：\n- 根据不同 style 检查是否缺失对应风格特征（如 新闻体未写导语、公文缺少“针对…建议…”结构、PPT 风格未分点等）。\n\n只输出 JSON，结构如下：\n{\n  "lenRatio": number,\n  "addedHeadings": boolean,\n  "addedLists": boolean,\n  "hasNotesTag": boolean,\n  "hasOtherTags": boolean,\n  "tooLong": boolean,\n  "tooShort": boolean,\n  "phraseScore": number,\n  "structureScore": number,\n  "issues": [string]\n}\n`
}

async function detectWithAI(styleId, raw, replacement, endpoint, model) {
  const user = JSON.stringify({ style: styleId, raw, replacement })
  const messages = [
    { role: 'system', content: buildDetectorSystemPrompt(styleId) },
    { role: 'user', content: user },
  ]
  const payload = { model, messages, temperature: 0, max_tokens: 512, stream: false }
  const headers = { 'Content-Type': 'application/json' }
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) })
  const text = await res.text()
  if (!res.ok)
    throw new Error(text)
  let parsed
  try { parsed = JSON.parse(text)?.choices?.[0]?.message?.content || '' }
  catch { parsed = '' }
  let json
  try { json = JSON.parse(parsed) }
  catch { json = null }
  return json
}

function analyze(original, rawMessage, replacement, styleId) {
  const addedHeadings = !hasHeading(original) && hasHeading(replacement)
  const addedLists = !hasList(original) && hasList(replacement)
  const lenRatio = replacement.length / Math.max(1, original.length)
  const hasNotesTag = /<notes>[\s\S]*?<\/notes>|<notes>[\s\S]*$/i.test(rawMessage)
  const hasOtherTags = /<(?!replacement\b|notes\b)[a-z][\w-]*\b[^>]*>/.test(rawMessage)
  const policy = stylePolicies[styleId] || { lenMin: 0.9, lenMax: 1.1, allowHeadings: false, allowLists: false, allowIfOriginalHeadings: false, allowIfOriginalLists: false }
  const tooLong = lenRatio > policy.lenMax
  const tooShort = lenRatio < policy.lenMin
  const sig = styleSignatures[styleId] || { requiredPhrases: [], structureHints: [] }
  const phrasesHits = Object.fromEntries((sig.requiredPhrases || []).map(p => [p, (replacement.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length]))
  const structureHits = Object.fromEntries((sig.structureHints || []).map(p => [p, (replacement.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length]))
  const phraseScore = Object.values(phrasesHits).reduce((a, b) => a + (b > 0 ? 1 : 0), 0)
  const structureScore = Object.values(structureHits).reduce((a, b) => a + (b > 0 ? 1 : 0), 0)
  const styleStrength = phraseScore + structureScore
  const issues = []
  if (hasNotesTag)
    issues.push('出现 <notes> 标签')
  if (hasOtherTags)
    issues.push('出现非允许标签')
  const originalHasHeadings = hasHeading(original)
  const originalHasLists = hasList(original)
  const allowHeadingsFinal = policy.allowHeadings || (policy.allowIfOriginalHeadings && originalHasHeadings)
  const allowListsFinal = policy.allowLists || (policy.allowIfOriginalLists && originalHasLists)
  if (addedHeadings && !allowHeadingsFinal)
    issues.push('新增标题')
  if (addedLists && !allowListsFinal)
    issues.push('新增列表')
  if (tooLong)
    issues.push('长度扩写超过20%')
  if (tooShort)
    issues.push('长度缩减超过20%')
  if (styleStrength === 0)
    issues.push('风格特征缺失')
  return { lenRatio, addedHeadings, addedLists, hasNotesTag, hasOtherTags, tooLong, tooShort, phraseScore, structureScore, issues }
}

async function main() {
  const sample = await readSample()
  const styles = await readStyles()
  const defaultEndpoint = await readDefaultEndpoint()
  const endpoint = new URL(defaultEndpoint)
  if (!endpoint.pathname.endsWith('/chat/completions'))
    endpoint.pathname = endpoint.pathname.replace(/\/?$/, '/chat/completions')
  const endpointUrl = endpoint.toString()
  const model = process.env.POLISH_MODEL || await readDefaultModel()
  const results = []
  for (const style of styles) {
    const prompt = buildOptimizePrompt(style.label, sample, style.detail, style.id)
    let raw = ''
    let replacement = ''
    let notes = ''
    let error = ''
    try {
      raw = await callAI(prompt, endpointUrl, model)
      const parsed = extractReplacementAndNotes(raw)
      replacement = sanitizeAIContent(parsed.replacement || raw)
      notes = parsed.notes || ''
    }
    catch (e) {
      error = String(e?.message || e)
    }
    const analysis = error ? null : analyze(sample, raw, replacement, style.id)
    let aiDetect = null
    if (!error) {
      try { aiDetect = await detectWithAI(style.id, sample, replacement, endpointUrl, model) }
      catch {}
      if (!aiDetect) {
        aiDetect = analysis
        if (aiDetect)
          aiDetect.issues = [...(aiDetect.issues || []), 'AI检测返回非JSON或为空，使用本地分析']
      }
    }
    results.push({ styleId: style.id, styleLabel: style.label, raw, replacement, notes, analysis: aiDetect || analysis, error })
    await new Promise(r => setTimeout(r, 300))
  }
  const dir = path.resolve(__dirname, '../test-results/polish')
  await fs.promises.mkdir(dir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const jsonPath = path.join(dir, `results-${ts}.json`)
  const mdPath = path.join(dir, `results-${ts}.md`)
  await fs.promises.writeFile(jsonPath, JSON.stringify({ model, endpoint: endpointUrl, results }, null, 2), 'utf8')
  const lines = []
  lines.push(`# Polish Style Test\n`)
  lines.push(`模型: ${model}`)
  lines.push(`端点: ${endpointUrl}\n`)
  for (const r of results) {
    lines.push(`## ${r.styleLabel} (${r.styleId})`)
    if (r.error) {
      lines.push(`错误: ${r.error}`)
      continue
    }
    lines.push(`长度比: ${r.analysis.lenRatio.toFixed(3)}`)
    lines.push(`风格特征得分: 关键词 ${r.analysis.phraseScore} / 结构 ${r.analysis.structureScore}`)
    lines.push(`问题: ${r.analysis.issues.join('，') || '无'}`)
    lines.push(`原文:`)
    lines.push('')
    lines.push('```')
    lines.push(sample)
    lines.push('```\n')
    lines.push(`润色后:`)
    lines.push('')
    lines.push('```')
    lines.push(r.replacement)
    lines.push('```\n')
  }
  await fs.promises.writeFile(mdPath, lines.join('\n'), 'utf8')
  console.log(jsonPath)
  console.log(mdPath)
}

main().catch((e) => { console.error(e); process.exit(1) })
