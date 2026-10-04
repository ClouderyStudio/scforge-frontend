<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import SnackbarHost from '@/components/ui/SnackbarHost.vue'
import { useAuth } from '@/composables/useAuth'

// Every route renders inside the shell, so the header can reflect the session.
const { load } = useAuth()
void load()
</script>

<template>
  <div class="sc-page">
    <a class="md-skip-link" href="#main">跳到主要内容</a>

    <AppHeader />

    <main id="main" class="sc-main">
      <RouterView v-slot="{ Component, route }">
        <Transition name="sc-page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>

    <AppFooter />

    <SnackbarHost />
  </div>
</template>

<style>
/* Route transition: a short, restrained fade-up that never blocks input. */
.sc-page-enter-active,
.sc-page-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-decelerate),
    translate var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-decelerate);
}

.sc-page-enter-from {
  opacity: 0;
  translate: 0 12px;
}

.sc-page-leave-to {
  opacity: 0;
}
</style>
