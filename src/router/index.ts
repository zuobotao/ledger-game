import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SetupView from '../views/SetupView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/rules',
      name: 'rules',
      component: () => import('../views/RulesView.vue'),
    },
    {
      path: '/guide',
      name: 'guide',
      component: () => import('../views/GuideView.vue'),
    },
    {
      path: '/setup',
      name: 'setup',
      component: SetupView,
    },
    {
      path: '/rat-race',
      name: 'rat-race',
      component: () => import('../views/RatRaceView.vue'),
    },
    {
      path: '/fast-track',
      name: 'fast-track',
      component: () => import('../views/FastTrackView.vue'),
    },
    {
      path: '/victory',
      name: 'victory',
      component: () => import('../views/VictoryView.vue'),
    },
    {
      path: '/game-over',
      name: 'game-over',
      component: () => import('../views/GameOverView.vue'),
    },
    {
      path: '/retirement',
      name: 'retirement',
      component: () => import('../views/RetirementView.vue'),
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/HistoryView.vue'),
    },
    {
      path: '/test',
      name: 'test',
      component: () => import('../views/TestView.vue'),
    },
  ],
})

export default router
