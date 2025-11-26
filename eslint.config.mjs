import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  formatters: true,
  ignores: [`.github`, `scripts`, `docker`, `packages/md-cli`, `src/assets`, `example`, `**/*.md`, `markdown-viewer-extension-main/**/*.html`],
}, {
  rules: {
    'semi': [`error`, `never`],
    'no-unused-vars': `off`,
    'no-console': `off`,
    'no-debugger': `off`,
    'ts/no-namespace': `off`,
    'style/max-statements-per-line': `off`,
    'unused-imports/no-unused-vars': `off`,
  },
  languageOptions: {
    globals: {
      chrome: 'readonly',
    },
  },
}, {
  files: ['markdown-viewer-extension-main/**/*.js'],
  rules: {
    'unused-imports/no-unused-vars': 'off',
    'no-useless-catch': 'off',
    'no-alert': 'off',
    'regexp/no-super-linear-backtracking': 'off',
    'regexp/no-useless-assertions': 'off',
    'regexp/optimal-quantifier-concatenation': 'off',
    'style/no-mixed-operators': 'off',
    'no-case-declarations': 'off',
    'node/handle-callback-err': 'off',
    'no-prototype-builtins': 'off',
    'no-unused-expressions': 'off',
  },
  languageOptions: {
    globals: {
      chrome: 'readonly',
      html2canvas: 'readonly',
    },
  },
}, {
  files: ['markdown-viewer-extension-main/scripts/**/*.js'],
  rules: {
    'node/prefer-global/buffer': 'off',
    'node/prefer-global/process': 'off',
    'no-cond-assign': 'off',
  },
}, {
  files: ['apps/web/src/utils/export-docx.ts'],
  rules: {
    'regexp/no-super-linear-backtracking': 'off',
    'regexp/optimal-quantifier-concatenation': 'off',
    'ts/no-use-before-define': 'off',
    'no-case-declarations': 'off',
  },
})
