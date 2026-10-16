import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const physical = '(^|\s)-?(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r)-|(^|\s)text-(left|right)(\s|$)'

export default [
  { ignores: ['.next/**', 'node_modules/**', 'src/app/(payload)/**', 'src/payload-types.ts', 'playwright-report/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=/${physical}/]`,
          message: 'Use logical utilities (ms/me/ps/pe/start/end/text-start/text-end). Guardrail 7.',
        },
      ],
    },
  },
]
