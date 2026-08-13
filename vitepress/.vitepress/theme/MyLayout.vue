<script setup>
import DefaultTheme from 'vitepress/theme'
import Comments from './components/Comments.vue'
import { useData } from 'vitepress'

const { Layout } = DefaultTheme
const { page, frontmatter } = useData()
</script>

<template>
  <Layout>
    <template #doc-footer-before>
      <!-- Automatically adds comments to all doc pages -->
      <div v-if="frontmatter.comments !== false" class="comments-wrapper">
        <Comments />
      </div>
    </template>
  </Layout>
</template>

<style>
.comments-wrapper {
  max-width: 688px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
</style>