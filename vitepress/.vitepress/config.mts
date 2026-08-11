import { defineConfig } from 'vitepress'
import { mermaidPlugin } from './theme/mermaid'


// https://vitepress.dev/reference/site-config
export default //withMermaid(
  defineConfig({

    title: "Hacked mud",
    description: "Guide",

    base: "/hacked_mud/",

    head: [
      ['link', { rel: 'icon', href: 'favicon.ico' }]
    ],

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
            { text: 'Development', link: '/docs/development' },
            { text: 'REST API', link: '/docs/rest-integration' },
            { text: 'Writing scripts', link: '/docs/ts-integration' },
          ]
        },
        {
          text: 'Memory reading guide',
          items: [
            { text: 'Preamble', link: '/docs/preamble' },
            { text: 'Problem and Solution', link: '/docs/problem' },
            { text: 'Flushing the terminal', link: '/docs/flush' },
            { text: 'Sending virtual inputs (Linux)', link: '/docs/sending-virtual-Inputs' },
            { text: 'Memory layout jargon', link: '/docs/memory-layout' },
            { text: 'Finding mono root domain (Linux)', link: '/docs/finding-mono-root-domain' },
            { text: 'Parsing mono', link: '/docs/parsing-mono' },
            { text: 'Reading objects', link: '/docs/reading-objects' },
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
    },

    ignoreDeadLinks: [
      // ignore all localhost links
      /^https?:\/\/localhost/,
    ]
  })
//)
