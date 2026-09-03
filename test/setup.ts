import { config } from '@vue/test-utils'

config.global.stubs = {}

beforeEach(() => {
  localStorage.clear()
})
