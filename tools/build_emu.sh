#!/bin/sh
# Сборка Genesis Plus GX для tools/emu.py:
#   third_party/gpgx/gpgx_full.so       — обычная сборка с открытыми символами (vram, cram, m68k ...)
#   third_party/gpgx_hook/gpgx_hook.so  — сборка с хуками CPU (HOOK_CPU) для трассировки
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$ROOT/third_party"
cd "$ROOT/third_party"
[ -d gpgx ] || git clone --depth 1 https://github.com/ekeeke/Genesis-Plus-GX gpgx

relink() {  # пересобрать .so без version script, чтобы глобальные переменные ядра были видны из ctypes
    objs=$(grep -o '^cc -o genesis_plus_gx_libretro.so.*' build.log | sed 's/^cc -o genesis_plus_gx_libretro.so -fPIC //; s/-Wl,--version-script=.\/libretro\/link.T//; s/-Wl,--no-undefined//')
    cc -o "$1" -fPIC $2 $objs $3
}

cd gpgx
make -f Makefile.libretro -j4 > build.log 2>&1 || true
relink gpgx_full.so ""
cd ..

rm -rf gpgx_hook && cp -r gpgx gpgx_hook && cd gpgx_hook
make -f Makefile.libretro clean > /dev/null 2>&1
CFLAGS="-DHOOK_CPU -fcommon -I$PWD/core/debug" make -f Makefile.libretro -j4 > build.log 2>&1 || true
gcc -O2 -fPIC -fcommon -DHOOK_CPU -c core/debug/cpuhook.c -o core/debug/cpuhook.o
relink gpgx_hook.so "-fcommon" core/debug/cpuhook.o
echo "Готово: third_party/gpgx/gpgx_full.so, third_party/gpgx_hook/gpgx_hook.so"
