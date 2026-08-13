import DefaultTheme from 'vitepress/theme'
import type { EnhanceAppContext } from 'vitepress'
import MermaidDiagramClient from './components/MermaidDiagram.client.vue'
import Comments from './components/Comments.vue'
import MyLayout from './MyLayout.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    app.component('MermaidDiagram', MermaidDiagramClient)
    app.component('Comments', Comments)
  },
  Layout: MyLayout
}