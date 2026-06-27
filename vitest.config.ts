import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*'],
            exclude: ['src/**/*.test.ts', 'src/main/index.ts', 'src/preload/index.ts']
        }
    }
})