import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: () => import('@/pages/InventoryPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/storage/:id',
      name: 'storage',
      component: () => import('@/pages/StoragePage.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

export default router;
