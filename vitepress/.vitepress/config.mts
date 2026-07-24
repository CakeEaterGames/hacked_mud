import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { mermaidPlugin } from './theme/mermaid'


// import mermaid from 'mermaid'

// https://vitepress.dev/reference/site-config
export default //withMermaid(
  defineConfig({

    title: "Hacked mud",
    description: "Guide",


    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      nav: [
        { text: 'Home', link: '/' },
      ],

      sidebar: [
        {
          text: 'Guide',
          items: [
            { text: 'Preamble', link: '/docs/preamble' },
            { text: 'Problem and Solution', link: '/docs/problem' },
          ]
        },
 
      ],

      socialLinks: [
        { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
      ]
    },

    markdown: {
      config: (md) => {
        mermaidPlugin(md)
      }
    }
  })
//)
