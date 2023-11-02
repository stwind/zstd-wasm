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
  expect(x.length).toBe(262144);
  expect(
    allclose(x.subarray(0, 20),
      Float32Array.of(
        1.6480403, 0.25552583, -0.72318166, -0.51691353, -0.06549734,
        2.5576904, -0.91144747, -1.2094561, -1.7011988, -1.1754812,
        -0.42230922, -1.0911368, -0.0855936, 1.3549697, -1.2962663,
        -0.01826137, -0.5452136, -0.7983612, 0.04088933, 0.56739944), 1e-6)
  ).toBeTruthy();
  expect(
    allclose(x.subarray(32768, 32788),
      Float32Array.of(
        -0.5941249, 1.3379914, 0.34739453, 1.0515374, 0.7130765,
        -0.17587228, -0.8707528, 1.6297326, -0.44070548, 0.22469762,
        -0.56754833, -0.12420952, -1.0211381, 1.5395901, 1.0203553,
        -0.79551464, 0.34626165, 1.4527459, 1.5637317, 0.801609), 1e-6)
  ).toBeTruthy();
  expect(
    allclose(x.subarray(-20),
      Float32Array.of(
        -0.7759698, -0.12646766, 0.49096152, -0.6034477, -0.7716095,
        -0.502182, -0.8370165, -0.2780956, 1.1447728, 1.3889996,
        0.12285668, -0.2592213, -0.04654559, -0.02442732, 1.7220658,
        1.5280355, 0.81138855, -1.0626813, 1.1975397, -0.1557873), 1e-6)
  ).toBeTruthy();
};

describe("zstd", () => {
  test("decompress", () => {
    check(new Float32Array(decompressor.decompress(data).buffer));
  });

  test("stream", () => {
    const chunks: Uint8Array[] = [];
    for (const chunk of decompressor.stream(data))
      chunks.push(chunk.slice());

    const out = new Uint8Array(chunks.reduce((a, x) => a + x.length, 0));
    chunks.reduce((offset, chunk) => (out.set(chunk, offset), offset + chunk.length), 0);
    check(new Float32Array(out.buffer));
  });
});