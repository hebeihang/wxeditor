## 问题判断与目标

- 该提示通常是 Word 将文件识别为“嵌入的 OLE 对象（Package）”而非有效 DOCX，常见原因：文档结构/内容类型不完整或下载过程导致内容不匹配。
- 为增强兼容性与可编辑性，显式定义 DOCX 样式（Normal/Heading/Hyperlink/Code/Table/Numbering），并提供“样式”菜单供用户在导出前选择。

## 方案概述

- 新增“样式”菜单，提供预设（默认、学术、商务、极简），允许用户选择导出到 Word 的样式。
- 将所选样式映射为 docx 的 `styles.default`、`paragraphStyles(Heading1..6)`、`characterStyles(code/hyperlink)`、`table 样式`、`numbering` 配置。
- 在 DOCX 导出实现中应用所选样式，确保包含默认 Normal、Hyperlink、Heading 系列、代码背景/字体、表格边框与单元格内边距。

## 详细实现

- UI 菜单
  - 在编辑器头部新增“样式”菜单（与“文件/导入/导出”同级），包含样式预设列表、预览与选择。
- 状态存储
  - 新增 `useWordStyleStore`（Pinia）：保存当前样式 ID、预设列表；持久化到本地存储。
- 样式预设
  - 默认：正文 Calibri/12pt，1.5 倍行距；标题 1–6 递减字号；超链接蓝色带下划线；代码灰底、等宽字体；表格居中、适度边框与内边距。
  - 学术：正文 Times New Roman/12pt，标题加粗，表格网格线；代码背景更浅。
  - 商务：正文 Arial/11pt，标题间距更紧凑，表格水平线为主。
  - 极简：正文 Segoe UI/11pt，边框尽量去除，表格仅水平线。
- 导出应用
  - 修改 `export-docx.ts`：
    - 接收并使用 Store 当前样式，构造 `Document({ styles: { default, paragraphStyles, characterStyles } })`。
    - 为列表添加 `numbering.config`（十级编号模板），确保有序列表稳定显示。
    - 保持现有节点转换：标题、段落、列表/任务列表、代码块、引用、表格、分隔线、链接、图片；将代码背景、表格边框/padding、超链接颜色来自样式预设。
- 兼容细节
  - 显式定义 `Hyperlink` 样式，避免超链接默认样式缺失。
  - 明确 `Normal`（default）字体与段落 spacing，避免 Word 使用不可预期的默认。

## 文件与位置

- `apps/web/src/components/editor/editor-header`：新增“样式”菜单组件，或在现有头部入口加一项。
- `apps/web/src/stores/word-style.ts`：样式 Store（当前 ID、预设定义）。
- `apps/web/src/utils/export-docx.ts`：应用样式到 `Document`，补充 numbering 与样式映射。

## 验证

- 生成包含多元素的文档（标题、列表、代码、引用、表格、图片、超链接），用 Word 打开验证不再出现“Package”提示，并可在 Word“样式”窗格看到对应样式生效。
- 切换不同预设导出，确认样式变化正确。

## 交付

- 新增“样式”菜单与样式 Store。
- 完成样式预设与 DOCX 样式映射，增强兼容性与可编辑性。

确认后我将按以上方案实现并接入到导出流程。
