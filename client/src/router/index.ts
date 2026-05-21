import { createRouter, createWebHashHistory } from 'vue-router'
import LobbyView from '../views/LobbyView.vue'
import GameView from '../views/GameView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'lobby', component: LobbyView },
    { path: '/game/:gameId', name: 'game', component: GameView },
  ],
})

export default router
