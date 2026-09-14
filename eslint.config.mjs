import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    // Сгенерированное и чужое не проверяем
    ignores: ['team/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    // Код сайта: браузер, ES-модули
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
  },
  {
    // Скрипты сборки и тесты: Node
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', 'eslint.config.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    rules: {
      // Необъявленная переменная в браузере молча ломает страницу без ошибки сборки
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
