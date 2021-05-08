import { BINARY } from './binary';
import createModule from './wrapper';

const decodeBinary = (bin: string) => {
  const raw = atob(bin);
  const size = raw.length;
  const res = new Uint8Array(size);

  for (let i = 0; i < size; i++) {
    res[i] = raw.charCodeAt(i);
  }
  return res;
};

const wasmBinary = decodeBinary(BINARY);
export default createModule({ wasmBinary });
