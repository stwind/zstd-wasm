import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { TypedArray } from "../src/ctypes.mjs";
import { Decompressor } from "../src/index.mjs";

const isClose = (a: number, b: number, eps: number = Number.EPSILON) => Math.abs(a - b) < eps;
const allclose = (a: TypedArray, b: TypedArray, eps?: number) =>
  a.length == b.length && a.every((x: number, i: number) => isClose(x, b[i], eps));

const decompressor = await new Decompressor().init();
const data = new Uint8Array(readFileSync("test/x.zst").buffer);

const check = (x: Float32Array) => {
  expect(x.length).toBe(32768);
  expect(
    allclose(x.subarray(0, 20),
      Float32Array.of(0.38525409, -0.08592036, -0.64582974, 0.02100991, 0.16344102,
        0.51768357, -0.38365448, -0.1093862, 0.839755, -0.28504312,
        0.19465728, 0.6241806, 1.0734307, 0.2500418, -0.20402758,
        0.7916968, -0.6584594, 0.16226813, -0.5275283, -2.3635936), 1e-6)
  ).toBeTruthy();
  expect(
    allclose(x.subarray(1024, 1044),
      Float32Array.of(0.65772486, -0.27814507, -1.2150396, 0.5190026, 0.31170344,
        0.24395111, -1.2340962, 1.3685087, 0.1449956, 0.6068229,
        0.1215992, 0.24950479, 0.42018878, 0.5811435, -0.1564216,
        -0.7777232, 0.2623963, -0.4609894, 0.5322635, -0.5661196), 1e-6)
  ).toBeTruthy();
  expect(
    allclose(x.subarray(-20),
      Float32Array.of(0.6148855, -0.72464526, 0.80810386, 0.2864332, 0.40589708,
        -1.344274, -0.54143816, 1.1083049, 0.7828361, -0.5222781,
        -0.4416833, 1.8882153, 0.15927616, 0.31272778, 2.6609573,
        0.6613082, -1.8880373, 0.40281072, -0.64218354, -0.4284711), 1e-6)
  ).toBeTruthy();
};

describe("zstd", () => {
  test("decompress", () => {
    check(new Float32Array(decompressor.decompress(data).buffer));
  });

  test.only("stream", () => {
    const chunks: Uint8Array[] = [];
    for (const chunk of decompressor.stream(data))
      chunks.push(chunk.slice());

    const out = new Uint8Array(chunks.reduce((a, x) => a + x.length, 0));
    chunks.reduce((offset, chunk) => (out.set(chunk, offset), offset + chunk.length), 0);
    check(new Float32Array(out.buffer));
  });
});