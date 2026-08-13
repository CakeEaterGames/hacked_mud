<template>
  <div class="comments-container">
    <div ref="giscusContainer"></div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useData, useRoute } from 'vitepress'

const giscusContainer = ref(null)
const { isDark, page } = useData()
const route = useRoute()

function loadGiscus() {
  if (!giscusContainer.value) return

  // Remove existing Giscus iframe
  giscusContainer.value.innerHTML = ''

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', 'CakeEaterGames/hacked_mud')
  script.setAttribute('data-repo-id', 'R_kgDOTcWtLA')
  script.setAttribute('data-category', 'Announcements')
  script.setAttribute('data-category-id', 'DIC_kwDOTcWtLM4DDRjs')
  script.setAttribute('data-mapping', 'pathname')
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'top')
  script.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  script.setAttribute('data-lang', 'en')
  script.setAttribute('crossorigin', 'anonymous')
  script.async = true

  giscusContainer.value.appendChild(script)
}

// Update theme when dark mode changes
watch(isDark, (dark) => {
  const iframe = document.querySelector('iframe.giscus-frame')
  if (iframe) {
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: dark ? 'dark' : 'light' } } },
      'https://giscus.app'
    )
  }
})

// Reload Giscus when route changes
watch(() => route.path, () => {
  // Small delay to ensure DOM is updated
  setTimeout(() => {
    loadGiscus()
  }, 100)
})

onMounted(() => {
  loadGiscus()
})
</script>

<style scoped>
/* .comments-container {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
} */
</style>