import type MarkdownIt from 'markdown-it'

export function mermaidPlugin(md: MarkdownIt) {
  const defaultRender = md.renderer.rules.fence!
  
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    
    if (token.info.trim() === 'mermaid') {
      const code = token.content.trim()
      // Use ClientOnly to prevent SSR issues
      return `<ClientOnly><MermaidDiagram code="${encodeURIComponent(code)}" /></ClientOnly>`
    }
    
    return defaultRender(tokens, idx, options, env, self)
  }
}