export function execRg(rg: RegExp, str: string): string[] {
  const arr = [];
  while (true) {
    const n = rg.exec(str);
    if (!n) break;
    arr.push(n[1]);
  }
  return arr.filter(a => a !== undefined);
}
