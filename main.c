#include "raylib.h"
#ifndef WASM
#include <stdlib.h>
#include <string.h>
#else
void js_set_entry(void(void));
#endif

#define SCREEN_WIDTH 1000
#define SCREEN_HEIGHT SCREEN_WIDTH
#define FPS 60
#define EACH_FRAMES 6
#define SCALE_FACTOR 10
#define WIDTH SCREEN_WIDTH / SCALE_FACTOR
#define HEIGHT SCREEN_WIDTH / SCALE_FACTOR
#define BG_COLOR BLACK
#define FG_COLOR WHITE

typedef struct {
  bool *scene;
  bool *backscene;
  bool scene0[WIDTH * HEIGHT];
  bool scene1[WIDTH * HEIGHT];
  int width;
  int height;
  int scale_factor;
} Matrix_;

bool paused = true;
int frame = 0;

Matrix_ matrix;

#ifndef WASM
void matrix_save(const char *file_name) {
  int size = matrix.width * matrix.height + sizeof(matrix.width) +
             sizeof(matrix.height);
  unsigned char *scene = malloc(size);
  memcpy(scene, &matrix.width, sizeof(matrix.width));
  memcpy(scene + sizeof(matrix.width), &matrix.height, sizeof(matrix.height));
  memcpy(scene + sizeof(matrix.width) + sizeof(matrix.height), matrix.scene,
         matrix.width * matrix.height);
  SaveFileData(file_name, scene, size);
}

void matrix_load(const char *file_name) {
  int size = GetFileLength(file_name);
  unsigned char *scene = LoadFileData(file_name, &size);

  if (memcmp(scene, &matrix.width, sizeof(matrix.width)) == 0 &&
      memcmp(scene + sizeof(matrix.width), &matrix.height,
             sizeof(matrix.height)) == 0) {
    memcpy(matrix.scene0, scene + sizeof(matrix.width) + sizeof(matrix.height),
           matrix.width * matrix.height);
  }
  UnloadFileData(scene);
}
#endif

bool *matrix_index(int col, int row) {
  if (col < 0 | row < 0 | col >= WIDTH || row >= HEIGHT)
    return 0;
  return &matrix.scene[row * matrix.width + col];
}
void matrix_change(int col, int row, bool state) {
  bool *cell = matrix_index(col, row);
  if (cell) {
    *cell = state;
  }
}

static char matrix_pixel(int index) {
  int top = -matrix.width;
  int left = -1;
  int right = 1;
  int bottom = matrix.width;

  if (index < matrix.width)
    top = (matrix.height - 1) * matrix.width;

  if (index >= matrix.width * (matrix.height - 1))
    bottom = -(matrix.height - 1) * matrix.width;

  if (index % matrix.width == 0)
    left = matrix.width - 1;

  if (index % matrix.width == matrix.width - 1)
    right = 1 - matrix.width;

  return (matrix.scene[index + top + left] + matrix.scene[index + top] +
          matrix.scene[index + top + right]) +
         (matrix.scene[index + left] + matrix.scene[index + right]) +
         (matrix.scene[index + bottom + left] + matrix.scene[index + bottom] +
          matrix.scene[index + bottom + right]);
}
void matrix_update(void) {
  char index;
  for (int i = 0; i < matrix.width * matrix.height; ++i) {
    index = matrix_pixel(i);
    switch (index) {
    case 2:
      matrix.backscene[i] = matrix.scene[i];
      break;
    case 3:
      matrix.backscene[i] = true;
      break;
    default:
      matrix.backscene[i] = false;
      break;
    }
  }
  if (matrix.scene == matrix.scene0) {
    matrix.scene = matrix.scene1;
    matrix.backscene = matrix.scene0;
  } else {
    matrix.scene = matrix.scene0;
    matrix.backscene = matrix.scene1;
  }
}

void matrix_draw(Color color) {
  for (int row = 0; row < matrix.height; ++row) {
    for (int col = 0; col < matrix.width; ++col) {
      if (*matrix_index(col, row)) {
        DrawRectangle(col * matrix.scale_factor, row * matrix.scale_factor,
                      matrix.scale_factor, matrix.scale_factor, color);
      }
    }
  }
}

void game_frame(void) {
  if (frame == FPS)
    frame -= FPS;
  frame++;

  if (IsMouseButtonDown(MOUSE_BUTTON_LEFT)) {
    matrix_change(GetMouseX() / SCALE_FACTOR, GetMouseY() / SCALE_FACTOR, true);
  }
  if (IsKeyPressed(KEY_P))
    paused = !paused;

  if (IsMouseButtonDown(MOUSE_BUTTON_RIGHT)) {
    matrix_change(GetMouseX() / SCALE_FACTOR, GetMouseY() / SCALE_FACTOR,
                  false);
  }
#ifndef WASM
  if (IsKeyPressed(KEY_S))
    matrix_save("file");

  if (IsKeyPressed(KEY_L))
    matrix_load("file");
#endif

  BeginDrawing();
  ClearBackground(BG_COLOR);

  if (!paused && frame % EACH_FRAMES == 0)
    matrix_update();

  matrix_draw(FG_COLOR);

  DrawFPS(10, 10);
  EndDrawing();
}

int main(void) {

  matrix.width = WIDTH;
  matrix.height = HEIGHT;
  matrix.scale_factor = SCALE_FACTOR;
  matrix.scene = matrix.scene0;
  matrix.backscene = matrix.scene1;

  SetTraceLogLevel(LOG_WARNING);
  InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "Game Of Life");
  SetTargetFPS(FPS);

#ifdef WASM
  js_set_entry(game_frame);
#else
  while (!WindowShouldClose()) {
    game_frame();
  }
#endif

  CloseWindow();

  return 0;
}
