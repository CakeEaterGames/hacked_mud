/**
 * Removes the color tags from a hackmud shell string
 */
export function uncolorShell(shell: string): string {
  return shell.replace(/<color=#\w+>/g, "").replace(/<\/color>/g, "");
}
