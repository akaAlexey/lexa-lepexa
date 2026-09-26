"""Виртуальная камера для AR-теста: снимок в кадре 640×480, поток .y4m для Chromium.

python fake_camera.py <снимок.jpg> <out.y4m>
Затем: LIVE_AR_CAMERA=<out.y4m> LIVE_AR_PHOTO=<id> npx playwright test e2e/live-photo-ar.spec.ts
(на Windows путь к .y4m — в виде C:\\...)
"""

import sys

from PIL import Image

W, H, FRAMES = 640, 480, 30


def main(src: str, out: str) -> None:
    photo = Image.open(src).convert("RGB")
    scale = min(W * 0.8 / photo.width, H * 0.9 / photo.height)
    photo = photo.resize((round(photo.width * scale), round(photo.height * scale)))
    frame = Image.new("RGB", (W, H), (200, 200, 200))
    frame.paste(photo, ((W - photo.width) // 2, (H - photo.height) // 2))
    # YUV 4:2:0: яркость в полном размере, цвет — вдвое меньше по каждой стороне
    y, cb, cr = frame.convert("YCbCr").split()
    half = (W // 2, H // 2)
    data = y.tobytes() + cb.resize(half).tobytes() + cr.resize(half).tobytes()
    with open(out, "wb") as f:
        f.write(f"YUV4MPEG2 W{W} H{H} F10:1 Ip A1:1 C420jpeg\n".encode())
        for _ in range(FRAMES):
            f.write(b"FRAME\n" + data)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
