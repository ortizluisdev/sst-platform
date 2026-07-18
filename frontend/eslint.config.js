import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import vueTsConfigs from '@vue/eslint-config-typescript'
import vueEslintConfigPrettier from '@vue/eslint-config-prettier'
import globals from 'globals'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/node_modules/**'],
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  ...vueTsConfigs(),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Vue SFCs commonly define single-word component names for pages/views —
      // this project's naming (LandingView, HeroSection, etc.) is already fine,
      // but multi-word isn't enforced strictly to avoid friction on section components.
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },

  vueEslintConfigPrettier,
]
