/**
 * 设备显示模式：运行时自动判断 Mobile / Desktop，而非依赖用户选择。
 *
 * 这是「同一套游戏引擎 + 两套交互布局」架构的统一入口。
 * 规则：不通过 CSS media query 修补移动端；由此处 JS 层 reactive 驱动布局分支。
 */
import { computed, ref } from 'vue'

export type DisplayMode = 'mobile' | 'desktop'

/** 视口宽度 <= 768px 判定为移动端 */
export const MOBILE_BREAKPOINT = 768

const mode = ref<DisplayMode>('desktop')

const query =
  typeof window !== 'undefined'
    ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    : null

let initialized = false

function updateMode() {
  mode.value = query?.matches ? 'mobile' : 'desktop'
}

function init() {
  if (initialized) return
  initialized = true
  updateMode()
  // 监听视口变化：手机横屏 / 平板 / PC 缩放窗口均可自然切换
  query?.addEventListener('change', updateMode)
}

export function useDisplayMode() {
  init()
  const isMobile = computed(() => mode.value === 'mobile')
  const isDesktop = computed(() => mode.value === 'desktop')
  return { mode, isMobile, isDesktop }
}