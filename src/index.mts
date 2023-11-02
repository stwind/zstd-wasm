import { BINARY } from './binary';
import createModule from './zstd';
import { type TypedArray, type Struct, u32, struct, instance } from './ctypes.mjs';

const decodeBinary = (bin: string) => {
  const raw = atob(bin), size = raw.length;
  const res = new Uint8Array(size);
  for (let i = 0; i < size; i++)
    res[i] = raw.charCodeAt(i);
  return res;
};

const wasmBinary = decodeBinary(BINARY);

type ZSTDInBuffer = Record<"src" | "size" | "pos", number>;
type ZSTDOutBuffer = Record<"dst" | "size" | "pos", number>;
const ZSTD_inBuffer = struct(["src", u32()], ["size", u32()], ["pos", u32()]);
const ZSTD_outBuffer = struct(["dst", u32()], ["size", u32()], ["pos", u32()]);

interface Allocated<T> { ptr: number; value: T; }
const alloc = <T,>(mod: EmscriptenModule, type: Struct, ptr = mod._malloc(type.size)): Allocated<T> =>
  ({ ptr, value: instance(type, mod.HEAPU8.buffer, ptr) as T });

const bufRead = (out: TypedArray, input: TypedArray, offset: number) => {
  out.set(input, offset);
  return input.length;
}

export class Decompressor {
  mod!: EmscriptenModule & {
    // https://raw.githack.com/facebook/zstd/release/doc/zstd_manual.html
    _ZSTD_isError(code: number): number;
    _ZSTD_getFrameContentSize(src: number, size: number): number;
    _ZSTD_decompress(dst: number, dstCapacity: number, src: number, compressedSize: number): number;
    _ZSTD_DStreamInSize(): number;
    _ZSTD_DStreamOutSize(): number;
    _ZSTD_createDCtx(): number;
    _ZSTD_freeDCtx(dctx: number): number;
    _ZSTD_decompressStream(zds: number, output: number, input: number): number
  }
  ZSTD_DStreamInSize!: number;
  ZSTD_DStreamOutSize!: number;

  async init() {
    this.mod = await createModule({ wasmBinary });
    this.ZSTD_DStreamInSize = this.mod._ZSTD_DStreamInSize();
    this.ZSTD_DStreamOutSize = this.mod._ZSTD_DStreamOutSize();

    return this;
  }

  allocInBuffer() {
    const input = alloc<ZSTDInBuffer>(this.mod, ZSTD_inBuffer);
    input.value.src = this.mod._malloc(this.ZSTD_DStreamInSize);
    return input;
  }

  allocOutBuffer() {
    const output = alloc<ZSTDOutBuffer>(this.mod, ZSTD_outBuffer);
    output.value.dst = this.mod._malloc(this.ZSTD_DStreamOutSize);
    output.value.size = this.ZSTD_DStreamOutSize;
    return output;
  }

  decompress(data: Uint8Array) {
    const mod = this.mod;
    const buf = mod._malloc(data.length);
    mod.HEAPU8.set(data, buf);
    const contentSize = mod._ZSTD_getFrameContentSize(buf, data.length);
    if (mod._ZSTD_isError(contentSize))
      throw new Error('[zstd] Unable to get frame content size.');

    const out = mod._malloc(contentSize);
    try {
      const rc = mod._ZSTD_decompress(out, contentSize, buf, data.length);
      if (mod._ZSTD_isError(rc) || rc != contentSize)
        throw new Error('[zstd] Unable to decompress.');

      return new Uint8Array(mod.HEAPU8.buffer, out, contentSize).slice();
    } finally {
      mod._free(buf);
      mod._free(out);
    }
  }

  *stream(data: Uint8Array) {
    const mod = this.mod;

    const dctx = mod._ZSTD_createDCtx();
    const input = this.allocInBuffer(), output = this.allocOutBuffer();

    try {
      let pos = 0, readSize = 0;
      while (readSize = bufRead(mod.HEAPU8, data.subarray(pos, this.ZSTD_DStreamInSize), input.value.src)) {
        pos += readSize;
        input.value.size = readSize;
        input.value.pos = 0;

        while (input.value.pos < input.value.size) {
          output.value.pos = 0;
          const ret = mod._ZSTD_decompressStream(dctx, output.ptr, input.ptr);
          if (mod._ZSTD_isError(ret))
            throw new Error("[zstd] failed stream decompressing");

          yield new Uint8Array(mod.HEAPU8.buffer, output.value.dst, output.value.pos);
        }
      }
    } finally {
      mod._free(dctx);
      mod._free(input.value.src);
      mod._free(output.value.dst);
      mod._free(input.ptr);
      mod._free(output.ptr);
    }
  }
}
