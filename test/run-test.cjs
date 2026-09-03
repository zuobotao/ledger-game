// CommonJS 启动脚本，使用 jiti 加载 TypeScript 测试
const path = require('path')
const createJiti = require('jiti').default || require('jiti')

const jiti = createJiti(__filename, {
  debug: false,
  cache: false,
  alias: {
    '@': path.resolve(__dirname, '../src'),
  },
})

// 加载测试文件
jiti(path.resolve(__dirname, 'auto-game-test.ts'))
