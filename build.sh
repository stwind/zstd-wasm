#!/bin/sh

ZSTD_VERSION=v1.4.9

docker run -i --rm -v $(pwd):/src emscripten/emsdk:2.0.19 bash <<-EOF
set -euxo pipefail

git clone https://github.com/facebook/zstd.git /opt/zstd && cd /opt/zstd && git checkout "${ZSTD_VERSION}"

V=1 ZSTD_LIB_MINIFY=1 ZSTD_NO_INLINE=1 \
  ZSTD_LIB_COMPRESSION=0 ZSTD_LIB_DEPRECATED=0 \
  CFLAGS="-flto -fmerge-all-constants" \
  emmake make lib-release

emcc -flto --closure 1 -Oz \
  -o /src/zstd.js \
  --memory-init-file 0 \
  -s EXPORTED_FUNCTIONS="['_ZSTD_isError', '_ZSTD_getFrameContentSize', '_ZSTD_decompress', '_malloc', '_free']" \
  -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" \
  -s MODULARIZE -s EXPORT_ES6 -s ENVIRONMENT=web -s WASM=1 \
  lib/libzstd.so
EOF

echo "/** @internal */\nexport const BINARY = \"$(scripts/base64.js zstd.wasm)\";" > src/binary.ts
mv zstd.js src/zstd.js