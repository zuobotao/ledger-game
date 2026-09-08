import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('privacy and legal copy', () => {
  it('describes the actual local save and multiplayer data boundary', () => {
    const privacy = read('src/views/PrivacyView.vue')
    const terms = read('src/views/TermsView.vue')
    const footer = read('src/components/AppFooter.vue')

    for (const copy of [privacy, terms, footer]) {
      expect(copy).toContain('单机')
      expect(copy).toContain('浏览器本地')
      expect(copy).toContain('多人')
      expect(copy).toContain('昵称')
      expect(copy).toContain('房间状态')
      expect(copy).toContain('房间服务')
      expect(copy).toContain('没有账户功能')
      expect(copy).toContain('不承诺')
      expect(copy).toContain('云端')
    }
  })

  it('does not retain the old absolute local-only claim', () => {
    const privacy = read('src/views/PrivacyView.vue')
    const terms = read('src/views/TermsView.vue')
    const privacyMarkdown = read('PRIVACY.md')

    for (const copy of [privacy, terms, privacyMarkdown]) {
      expect(copy).not.toContain('所有游戏数据仅保存在您的浏览器本地，永远不会发送到任何服务器')
      expect(copy).not.toContain('No personal data collected')
      expect(copy).not.toContain('all game data is stored locally')
    }
  })
})
