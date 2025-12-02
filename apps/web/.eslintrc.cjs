module.exports = {
  extends: ['@antfu/eslint-config'],
  rules: {
    'vue/html-self-closing': ['error', {
      html: { void: 'always', normal: 'never', component: 'always' },
      svg: 'always',
      math: 'always',
    }],
  },
}
