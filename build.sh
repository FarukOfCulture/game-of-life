#!/bin/sh

set -xe

mkdir -p build
clang -Wall -Wextra -pedantic -lraylib main.c -o build/game_of_life
clang --target=wasm32 -I./include -DWASM --no-standard-libraries -Wl,--no-entry -Wl,--allow-undefined -Wl,--export-table -Wl,--export=main -o build/game_of_life.wasm main.c
