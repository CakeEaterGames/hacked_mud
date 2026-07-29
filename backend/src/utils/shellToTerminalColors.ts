export function shellToTerminalColors(input: string): string {
  const resetCode = "\x1b[0m";
  interface ColorMap {
    [key: string]: string;
  }

  const exactColorMap: ColorMap = {
    "#FFFFFFFF": "\x1b[38;5;231m", // White
    "#9B9B9BFF": "\x1b[38;5;247m", // Gray
    "#FF8000FF": "\x1b[38;5;208m", // Orange
    "#1EFF00FF": "\x1b[38;5;46m", // Bright green
    "#CACACAFF": "\x1b[38;5;252m", // Light gray
  };

  let result = input;

  // Replace closing tags
  result = result.replace(/<\/color>/g, resetCode);

  // Replace opening tags
  result = result.replace(/<color=#([A-Fa-f0-9]{8})>/g, (match, hexColor: string) => {
    const fullHex = `#${hexColor.toUpperCase()}`;

    // Check for exact matches first
    if (exactColorMap[fullHex]) {
      return exactColorMap[fullHex];
    }

    // Convert hex to RGB
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);

    // Convert RGB to 256-color ANSI code
    // Using the 6x6x6 color cube (16 + 36*r + 6*g + b)
    const ansiColor =
      16 +
      Math.round((r / 255) * 5) * 36 +
      Math.round((g / 255) * 5) * 6 +
      Math.round((b / 255) * 5);

    return `\x1b[38;5;${ansiColor}m`;
  });

  // Clean up any remaining tags
  result = result.replace(/<[^>]*>/g, "");

  return result;
}
