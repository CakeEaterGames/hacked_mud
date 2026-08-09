/**
 * AI DISCLOSURE!
 * This was made with deepseek. While I could write this by hand, I really don't feel like it.
 * @param input Takes the hackmud flush string
 * @returns Returns HTML
 */
export function shellToHTML(input: string) {
  const colorRegex = /<color=([^>]+)>/g;
  const closeTag = '</color>';

  // Stack to track nested color tags
  const colorStack: string[] = [];
  let result = '';
  let currentIndex = 0;

  while (currentIndex < input.length) {
    // Check for opening color tag
    if (input.startsWith('<color=', currentIndex)) {
      const match = input.slice(currentIndex).match(/^<color=([^>]+)>/);
      if (match) {
        const color = match[1]!;
        colorStack.push(color);
        result += `<span style="color: ${color}">`;
        // result += `<span class="sps" style="color: ${color}">`;
        currentIndex += match[0].length;
        continue;
      }
    }

    // Check for closing color tag
    if (input.startsWith(closeTag, currentIndex)) {
      if (colorStack.length > 0) {
        colorStack.pop();
        result += '</span>';
        currentIndex += closeTag.length;
        continue;
      }
    }

    // Handle extra > and < characters that aren't part of tags
    const char = input[currentIndex];
    if (char === '<' || char === '>') {
      // Check if this is part of a valid tag we've already processed
      const remaining = input.slice(currentIndex);
      if (!remaining.startsWith('<color=') && !remaining.startsWith('</color>')) {
        // It's just a literal character, add it as-is
        result += char;
        currentIndex++;
        continue;
      }
    }

    // Regular character, add to result
    result += input[currentIndex];
    currentIndex++;
  }

  // Close any remaining open tags
  while (colorStack.length > 0) {
    colorStack.pop();
    result += '</span>';
  }

  // Wrap in a container with white-space: pre-wrap to preserve spaces and line breaks
  return `<span style="white-space: pre-wrap">${result}</span>`
    .replace(/\n/gm, "\n")
}