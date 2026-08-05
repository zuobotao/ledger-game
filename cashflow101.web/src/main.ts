import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useGameStore } from '@/stores/game'
import { useGameHistoryStore } from '@/stores/gameHistory'

declare global {
  interface Window {
    gameStore: ReturnType<typeof useGameStore>
    gameHistoryStore: ReturnType<typeof useGameHistoryStore>
  }
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

// Dev mode: expose stores for testing
if (import.meta.env.DEV) {
  window.gameStore = useGameStore()
  window.gameHistoryStore = useGameHistoryStore()
}
