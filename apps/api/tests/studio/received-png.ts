import assert from 'node:assert/strict';
import { inspectPng } from '@tileset/image-adapter';

/** Validate the captured bytes before decoding; transport/SHA/RGBA are separate evidence. */
export function assertReceivedPng(bytes: Uint8Array, expected: { width: number; height: number }) {
  assert.deepEqual(
    inspectPng(bytes),
    expected,
    'Received PNG dimensions do not match the consumer.',
  );
}
