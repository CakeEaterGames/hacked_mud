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
            { text: 'Flushing the terminal', link: '/docs/flush' },
            { text: 'Sending virtual inputs (Linux)', link: '/docs/sending-virtual-Inputs' },
            { text: 'Memory layout jargon', link: '/docs/memory-layout' },
            { text: 'Finding mono root domain (Linux)', link: '/docs/finding-mono-root-domain' },
            { text: 'Parsing mono', link: '/docs/parsing-mono' },
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
