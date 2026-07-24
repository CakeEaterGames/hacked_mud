<template>
  <div class="mermaid-diagram" ref="diagramContainer">
    <div v-if="error" class="mermaid-error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import mermaid from 'mermaid'

const props = defineProps<{
  code: string
}>()

const diagramContainer = ref<HTMLElement>()
const error = ref('')

onMounted(async () => {
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      themeVariables: {
        fontSize: '14px',
        fontFamily: 'Inter, arial, sans-serif',
        // Increase node padding
        nodePadding: 15,
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        padding: 30,
        nodeSpacing: 50,
        rankSpacing: 50,
        // Make nodes wider by default
        // wrappingWidth: 200,
      },
    })
    
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const decodedCode = decodeURIComponent(props.code)
    
    const { svg } = await mermaid.render(id, decodedCode)
    
    if (diagramContainer.value) {
      diagramContainer.value.innerHTML = svg
      
      const svgElement = diagramContainer.value.querySelector('svg')
      if (svgElement) {
        svgElement.style.maxHeight = 'none'
        svgElement.style.height = 'auto'
        svgElement.style.width = '100%'
      }
    }
  } catch (err) {
    error.value = `Failed to render diagram: ${err}`
    console.error('Mermaid error:', err)
  }
})
</script>

<style scoped>
.mermaid-diagram {
  font-family: 'Inter';
  font-weight: bold;
  margin: 1.5em 0;
  padding: 3em;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: visible;
  display: flex;
  justify-content: center;
}

.mermaid-diagram :deep(svg) {
  max-width: 100%;
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
}

/* Allow foreignObject to contain text properly */
.mermaid-diagram :deep(.label foreignObject) {
  overflow: visible;
} 

.mermaid-error {
  color: #e53e3e;
  padding: 1em;
  background: #fff5f5;
  border-radius: 6px;
  border: 1px solid #fed7d7;
}
</style>