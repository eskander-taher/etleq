import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const physical = '(^|\\s)-?(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r)-|(^|\\s)text-(left|right)(\\s|$)'

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'src/app/(payload)/**',
      'src/payload-types.ts',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  ...nextVitals,
  ...nextTs,
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
