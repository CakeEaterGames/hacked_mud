export function bigintToFloat64(rawBits: bigint): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Number(rawBits & 0xffffffffn), true);
  view.setUint32(4, Number((rawBits >> 32n) & 0xffffffffn), true);
  return view.getFloat64(0, true);
}

export function bigintToFloat32(rawBits: bigint): number {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, Number(rawBits & 0xffffffffn), true);
  return view.getFloat32(0, true);
}
