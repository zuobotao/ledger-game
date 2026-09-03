/**
 * P0-001 仓库清理冒烟测试
 * 验证项目可在根目录直接安装、构建和运行。
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const root = path.resolve(__dirname, '..')

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
}

function exists(file) {
  return fs.existsSync(path.join(root, file))
}

const tests = [
  {
    name: 'package.json 名称应为 ledger-game',
    run: () => {
      const pkg = readJSON('package.json')
      assert.strictEqual(pkg.name, 'ledger-game')
    },
  },
  {
    name: 'vite.config.ts 应配置 GitHub Pages 子路径',
    run: () => {
      const config = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8')
      assert(config.includes("base: '/ledger-game/"), '未找到 base: "/ledger-game/"')
    },
  },
  {
    name: '关键源码文件应存在',
    run: () => {
      assert(exists('src/main.ts'))
      assert(exists('src/App.vue'))
      assert(exists('src/stores/game.ts'))
      assert(exists('src/types/game.ts'))
    },
  },
  {
    name: '旧项目目录不应存在',
    run: () => {
      assert(!exists('cashflow101.web'), 'cashflow101.web 仍存在')
      assert(!exists('cashflow101.prototype.design'), 'cashflow101.prototype.design 仍存在')
      assert(!exists('ledger-game'), 'ledger-game 嵌套目录仍存在')
    },
  },
  {
    name: 'GitHub Pages 部署配置应存在',
    run: () => {
      assert(exists('.github/workflows/deploy.yml'))
      const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8')
      assert(workflow.includes('actions/deploy-pages'), '缺少 deploy-pages 步骤')
    },
  },
]

let passed = 0
let failed = 0

for (const test of tests) {
  try {
    test.run()
    console.log(`✅ ${test.name}`)
    passed++
  } catch (error) {
    console.log(`❌ ${test.name}: ${error.message}`)
    failed++
  }
}

console.log(`\n总计: ${tests.length} 个测试，通过 ${passed} 个，失败 ${failed} 个`)

if (failed > 0) {
  process.exit(1)
}
