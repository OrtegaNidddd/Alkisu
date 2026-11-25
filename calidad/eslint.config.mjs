// Configuración única usada en la medición ANTES y DESPUÉS de la refactorización.
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommended,
      sonarjs.configs.recommended,
      security.configs.recommended,
    ],
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
    rules: {
      // Umbrales de diseño (escala de complejidad de la guía: >10 = alta)
      complexity: ['error', { max: 10 }],
      'sonarjs/cognitive-complexity': ['error', 15],
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      'max-depth': ['error', 4],
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
      // Estándares
      eqeqeq: 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  }
);
