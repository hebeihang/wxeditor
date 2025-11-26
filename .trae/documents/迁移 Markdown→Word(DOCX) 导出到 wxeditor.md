## 目标与范围

- 在 `文件 → 导出` 菜单新增 “Word 文档（.docx）” 项，支持将当前 Markdown 内容导出为 DOCX。
- 迁移并适配 `markdown-viewer-extension` 的 DOCX 导出能力（标题、段落、列表、任务列表、代码高亮、引用、表格、分隔线、链接/图片、内联换行），初版以默认样式工作。
- 后续可扩展数学公式、图表/流程图（Mermaid/Vega）、主题映射等高级能力。

## 集成点

- 菜单：`apps/web/src/components/editor/editor-header/FileDropdown.vue`
  - 在导出子菜单中新增：`MenubarItem @click="exportEditorContent2DOCX()"`（位置与现有导出项一致）。
- Store：`apps/web/src/stores/export.ts`
  - 新增方法：`exportEditorContent2DOCX()`，从 `usePostStore.currentPost.title` 与编辑器/文章内容取源，调用工具函数完成导出。
- 工具函数：`apps/web/src/utils/export-docx.ts`（新增文件）或放入 `utils/index.ts`
  - 暴露 `exportDOCX(title: string, markdown: string): Promise<void>`，内部执行 Markdown→DOCX 转换与下载。

## 实现方案

- 解析管线（沿用并简化插件实现）：
  - 使用 `unified + remark-parse + remark-gfm + remark-breaks + remark-math` 生成 MDAST；遍历 AST，逐类节点生成 `docx` 元素。
- 节点转换（迁移 `docx-exporter.js` 的核心逻辑，去除扩展特定依赖）：
  - 标题：`heading(depth)` → `Paragraph({ heading })` 并按主题/默认对齐。
  - 段落/内联：`text/strong/emphasis/delete/inlineCode/break/html(<br>)` → `TextRun/Paragraph`；`inlineCode` 使用代码字体与背景色。
  - 列表：有序/无序/嵌套/任务列表（GFM）→ 编号/项目符号；为任务列表前置“☐/▣”。
  - 代码块：`hljs` 渲染 token，按颜色生成 `TextRun` 序列；段前后/行距按默认样式；加边框与底色。
  - 引用：压缩行距、左侧竖线与灰底，支持嵌套缩进。
  - 表格：表头居中、单元格 padding/对齐、可选斑马线（默认禁用），单元边框按简化策略。
  - 分隔线：用段落底边框生成水平线，并设置前后间距。
  - 链接：`ExternalHyperlink`，保持蓝色带下划线样式。
  - 图片：直接 `fetch`/`data:` 解析为 `Uint8Array`，计算尺寸约束（页面安全宽 6 英寸，高 9.5 英寸），生成 `ImageRun`。
  - 数学：初版将 `math/inlineMath` 以代码样式文本回退；第二阶段引入 MathJax→OMML 转换（见下）。
- 主题样式（初版）：
  - 默认正文：字体采用系统常用（如 `Calibri` 或从页面 `#md-theme` 读取失败则回退），字号按网页正文近似值（12pt）。
  - 段落行距：按 1.5 倍（360）与合理前后间距；标题按 1.5 倍行距并设置 before/after。
  - 代码样式：独立字体、字号与底色；颜色来自 `hljs` 的 token 映射，若无法解析则回退为前景色。
- 下载：生成 `Blob` 后通过 `<a download>` 触发保存（沿用项目内的下载工具或自定义 Blob URL）。

## 依赖与变更

- 在 `apps/web/package.json` 添加：
  - `docx`（构建 DOCX 文档）
  - `remark-gfm`、`remark-breaks`、`remark-math`（管线插件）
  - 可选第二阶段：`mathjax-full`、`mathml2omml`、`xml-js`（TeX→OMML 转换）
- 复用现有：`unified`、`remark-parse`、`highlight.js` 已在项目中。

## 菜单更新

- 文案：新增 `Word 文档（.docx）`；如需更多格式，后续可增加“DOCX（默认主题）/ DOCX（自定义主题）”。
- 交互：与现有导出项一致，导出后恢复 `#output` 内容（参考 HTML/PDF 导出）。

## 验证与兼容

- 用包含以下元素的 Markdown 用例验证：
  - 标题/段落、粗斜体/删除线、内联代码/换行、任务列表、嵌套列表、引用（含嵌套）、表格（对齐/斑马）、代码块（带语言）、链接/图片（http/data）、分隔线。
- 文件体积与性能：`docx` 打包耗时与体积可接受；图片按最大显示尺寸缩放。
- 国际化：菜单项沿用 UI 中文文案；无额外 i18n 变更。

## 第二阶段（可选增强）

- 数学公式：引入 `mathjax-full + mathml2omml`，实现 TeX→OMML；与内联/块级渲染一致。
- 主题映射：将页面主题变量映射为 DOCX 样式（标题/段落/代码/表格）；如需提供主题选择器，可参照扩展的 `themes/*` 结构。
- 插件渲染：如需支持 Mermaid/Vega，复用现有渲染产物（PNG）并插入 DOCX。

## 交付项

- 新增菜单项与 Store 方法，完成 DOCX 导出。
- 可选：提供一个演示 Markdown 文件用于验收。

请确认以上计划，我将开始按该方案实现并接入菜单与导出流程。
