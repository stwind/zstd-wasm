interface ObjectOf<T> { [id: string | number | symbol]: T; }
export type TypedArray = Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array
  | Int8Array | Int16Array | Int32Array
  | Float32Array | Float64Array;
type Elements<A extends readonly unknown[]> = A extends readonly (infer T)[] ? T : never;

const isTypedArray = (x: any): x is TypedArray => x && (
  x instanceof Uint8Array || x instanceof Uint8ClampedArray ||
  x instanceof Uint16Array || x instanceof Uint32Array ||
  x instanceof Int8Array || x instanceof Int16Array || x instanceof Int32Array ||
  x instanceof Float32Array || x instanceof Float64Array);


const CTYPES = ["u8", "u16", "u32", "i8", "i16", "i32", "f32", "f64"] as const;
const SIZES: Record<CType, number> = {
  "u8": 1, "u16": 2, "u32": 4, "i8": 1, "i16": 2, "i32": 4, "f32": 4, "f64": 8
} as const;
const TYPED_ARRAY = {
  "i8": Int8Array, "i16": Int16Array, "i32": Int32Array,
  "u8": Uint8Array, "u16": Uint16Array, "u32": Uint32Array,
  "f32": Float32Array, "f64": Float64Array,
} as const;

type CType = Elements<typeof CTYPES>;
type Type = CType | Struct;
export interface Field { type: Type; num: number; }
export interface Struct {
  size: number; align: number;
  fields: ObjectOf<Field>;
  offsets: ObjectOf<number>;
};

const isCType = (t: any): t is CType => CTYPES.includes(t);

const sizeof = (type: Type) => isCType(type) ? SIZES[type] : type.size;
const alignof = (type: Type) => isCType(type) ? SIZES[type] : type.align;
const _align = (x: number, b: number) => (x + b - 1) & -b;

export const struct = (...fs: [string, Field][]): Struct => {
  let align = 0, offset = 0;
  const fields: Struct['fields'] = {}, offsets: Struct['offsets'] = {};
  fs.forEach(([name, f]) => {
    const a = alignof(f.type);
    align = Math.max(align, a);
    offset = _align(offset, a);
    fields[name] = f;
    offsets[name] = offset;
    offset += sizeof(f.type) * Math.max(f.num, 1);
  });
  return { align, size: _align(offset, align), fields, offsets };
};

type Instance = ObjectOf<number | TypedArray | Instance[] | Instance>;

const property = (value: TypedArray | Instance | Instance[]): PropertyDescriptor => ({
  enumerable: true,
  ...(isTypedArray(value) && value.length == 1 ? {
    get: () => value[0],
    set: (x: number) => value[0] = x,
  } : { value })
});

export const instance = (
  { fields, offsets, size }: Struct, buf = new ArrayBuffer(size), base = 0
) => {
  const res: Instance = {};
  for (const name in fields) {
    const out = deref(fields[name], buf, base + offsets[name]);
    Object.defineProperty(res, name, property(out));
  }
  return res;
};

export const deref = (
  { type, num }: Field, buf: ArrayBuffer, base = 0
): TypedArray | Instance | Instance[] => {
  if (isCType(type))
    return new TYPED_ARRAY[type](buf, base, Math.max(num, 1));

  return num == 0 ?
    instance(type, buf, base) :
    Array.from({ length: num }, (_, i) => instance(type, buf, base + i * type.size));
};

export type U8<K extends string> = Record<K, Uint8Array>;
export type U16<K extends string> = Record<K, Uint16Array>;
export type U32<K extends string> = Record<K, Uint32Array>;
export type I8<K extends string> = Record<K, Int8Array>;
export type I16<K extends string> = Record<K, Int16Array>;
export type UI32<K extends string> = Record<K, Int32Array>;
export type F32<K extends string> = Record<K, Float32Array>;
export type F64<K extends string> = Record<K, Float64Array>;

export const field = (type: Type) => (num = 0): Field => ({ type, num });
export const [u8, u16, u32, i8, i16, i32, f32, f64] = CTYPES.map(field);