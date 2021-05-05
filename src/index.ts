import { BINARY } from './binary';
import createModule from './wrapper';

const decodeBinary = (bin: string) => {
  var raw = window.atob(bin);
  var rawLength = raw.length;
  var res = new Uint8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i++) {
    res[i] = raw.charCodeAt(i);
  }
  return res;
};

const wasmBinary = decodeBinary(BINARY);
export default createModule({ wasmBinary });
