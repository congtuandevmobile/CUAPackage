/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // The package tsconfig targets Metro (esnext modules); Jest needs CommonJS.
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node10',
          target: 'es2022',
          strict: true,
          esModuleInterop: true,
          verbatimModuleSyntax: false,
          skipLibCheck: true,
          noUncheckedIndexedAccess: true,
        },
        diagnostics: true,
      },
    ],
  },
}
