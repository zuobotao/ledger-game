import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceFiles = [
  'src/views/HomeView.vue',
  'src/views/GuideView.vue',
  'src/views/RulesView.vue',
  'src/views/DisclaimerView.vue',
  'src/views/TermsView.vue',
  'src/views/PrivacyView.vue',
  'src/components/AppFooter.vue',
  'src/components/AITutorAdvice.vue',
].map((path) => readFileSync(resolve(process.cwd(), path), 'utf8'))

describe('education copy safety', () => {
  it('keeps the reviewed surfaces framed as fictional simulation content', () => {
    expect(sourceFiles.join('\n')).toContain('虚构')
    expect(sourceFiles.join('\n')).toContain('不构成任何投资建议')
  })

  it('does not reintroduce direct real-world financial guidance into the tutor', () => {
    const tutor = sourceFiles[sourceFiles.length - 1]
    expect(tutor).not.toMatch(/通常建议|风险回报比不错|建议尽快还清|价值投资的基本思路/)
  })
})
