import type { QuickCommandPersisted } from '../quickCommands'

export const STYLE_BUSINESS: QuickCommandPersisted = {
  id: `style:business`,
  label: `商业分析风`,
  template: `采用商业分析风格，语言专业、逻辑严密、结构清晰，注重市场数据、行业趋势、竞争格局、商业模式与战略解读。避免文学化描述，偏向咨询公司写作风格（如麦肯锡/BCG）。语气客观理性。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_ACADEMIC: QuickCommandPersisted = {
  id: `style:academic`,
  label: `学术论文风`,
  template: `采用学术论文风格，表达严谨克制，引用理论框架，强调因果关系、论证链条与方法论。句式规范、术语精确、避免主观情绪。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_OFFICIAL: QuickCommandPersisted = {
  id: `style:official`,
  label: `公文/官样文风`,
  template: `采用公文写作风格（官样文章），语言庄重正式，表达规范统一，逻辑按照‘背景—问题—措施—结语’展开。用词中性稳妥，不使用夸张、口语化词语。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_NEWS: QuickCommandPersisted = {
  id: `style:news-report`,
  label: `新闻报道风`,
  template: `采用新闻报道风格，使用倒金字塔结构，客观呈现事实、数据与观点，不带主观情绪。语句简洁，强调信息准确性与时效性。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_PPT: QuickCommandPersisted = {
  id: `style:ppt-brief`,
  label: `咨询简报风（PPT 汇报风）`,
  template: `采用咨询简报式表达（PPT 汇报风），信息高度浓缩，句子短促，重点突出，常用分点结构。强调观点先行和 actionable insights。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_EDITORIAL: QuickCommandPersisted = {
  id: `style:editorial`,
  label: `评论/社论风（议论文风）`,
  template: `采用评论/社论风格，立场鲜明、论证清晰，逻辑性强。适合输出观点类文章。语气理性但有力度，重结论、重论据。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_LEGAL: QuickCommandPersisted = {
  id: `style:legal`,
  label: `法律分析风`,
  template: `采用法律分析风格，结构遵循‘事实—争点—适用法律—分析—结论’。语言严谨正式，用词准确，避免模糊表达。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_POPSCI: QuickCommandPersisted = {
  id: `style:popular-science`,
  label: `科普说明风`,
  template: `采用科普说明文风，语言清晰易懂，适合非专业读者。通过类比与示例解释复杂概念，不使用过度晦涩的术语。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_WHITEPAPER: QuickCommandPersisted = {
  id: `style:whitepaper`,
  label: `报告书/白皮书风`,
  template: `采用白皮书式写作风，结构化、全面、系统性强。注重宏观趋势、技术背景、应用场景、潜在影响等分析。语气中性客观。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_BUSINESS_LETTER: QuickCommandPersisted = {
  id: `style:business-letter`,
  label: `商务正式信函风`,
  template: `采用商务信函风格，表达专业得体，态度礼貌但明确。用词规范、句式稳重，适合 B2B/B2C 正式沟通场景。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_PRODUCT_OPS: QuickCommandPersisted = {
  id: `style:product-ops`,
  label: `产品运营风`,
  template: `采用产品运营和增长文风，强调核心指标、用户洞察、痛点分析、增长路径和策略建议。语言偏实战、直接、可执行。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_INVESTMENT: QuickCommandPersisted = {
  id: `style:investment`,
  label: `投资分析风（金融机构口吻）`,
  template: `采用投资研究/投行报告风格，语言专业，结构包括概况、估值、风险点、预测和结论。强调数据支撑和风险提示。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}
export const STYLE_TECH_WRITING: QuickCommandPersisted = {
  id: `style:tech-writing`,
  label: `科技写作风（技术博客/Tech Note）`,
  template: `采用技术写作风格，结构清晰，逻辑分明，解释过程与原理。语言专业但不生硬，适合科技行业的分析文章。\n\n请用上述文风改写以下文本：\n\n{{sel}}`,
}

export const STYLE_COMMANDS: QuickCommandPersisted[] = [
  STYLE_BUSINESS,
  STYLE_ACADEMIC,
  STYLE_OFFICIAL,
  STYLE_NEWS,
  STYLE_PPT,
  STYLE_EDITORIAL,
  STYLE_LEGAL,
  STYLE_POPSCI,
  STYLE_WHITEPAPER,
  STYLE_BUSINESS_LETTER,
  STYLE_PRODUCT_OPS,
  STYLE_INVESTMENT,
  STYLE_TECH_WRITING,
]

export const STYLE_IDS = STYLE_COMMANDS.map(c => c.id)
