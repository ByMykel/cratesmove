import { type BinaryLike, createHash } from 'node:crypto';

export function sha256sum(data: BinaryLike) {
  const input = typeof data === 'string' || ArrayBuffer.isView(data) ? data : new Uint8Array(data);
  return createHash('sha256').update(input).digest('hex');
}
