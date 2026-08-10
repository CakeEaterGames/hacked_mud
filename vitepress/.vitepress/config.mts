import { defineConfig } from 'vitepress'
import { mermaidPlugin } from './theme/mermaid'


// https://vitepress.dev/reference/site-config
export default //withMermaid(
  defineConfig({

    title: "Hacked mud",
    description: "Guide",

    base: "/hacked_mud/",

    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      nav: [
        { text: 'Home', link: '/' },
      ],

      sidebar: [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/docs/installation' },
            { text: 'REST Integration', link: '/docs/rest-integration' },
            { text: 'TS Integration', link: '/docs/ts-integration' },
          ]
        },
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
        { icon: 'github', link: 'https://github.com/CakeEaterGames/hacked_mud' }
      ]
    },

    markdown: {
      config: (md) => {
        mermaidPlugin(md)
      }
    }
  })
//)
