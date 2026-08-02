import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SetupView from '../views/SetupView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
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
  ],
})

export default router
