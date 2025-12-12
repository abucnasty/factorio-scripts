import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [],
  test: {
    exclude:[
      ...configDefaults.exclude, 
      'dist/*'
    ]
  },
});