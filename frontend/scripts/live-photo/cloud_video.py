"""Облачная генерация роликов на Hugging Face Spaces (ZeroGPU) — видеокарта компьютера не используется.

  python cloud_video.py ltx  <фото> "<промпт>" <секунды> <высота> <ширина> <out.mp4>  # фото → видео (групповой снимок)
  python cloud_video.py moda <лицо 512x512> <речь.wav> <out.mp4>                     # говорящая голова по звуку
  python cloud_video.py sync <видео.mp4> <речь.wav> <out.mp4>                        # подгонка губ (LatentSync)

Без входа квота ZeroGPU — около 3 минут в сутки, а MoDA и LatentSync просят по 180 с на запуск.
С бесплатным аккаунтом Hugging Face квоты больше: задайте токен в своей консоли (переменная HF_TOKEN),
скрипт возьмёт его сам. Токен никуда не записывается.
"""
import os
import shutil
import sys
import time

from gradio_client import Client, handle_file

NEGATIVE = (
    "worst quality, inconsistent motion, blurry, jittery, distorted, camera movement, zoom in, zoom out, "
    "camera pan, dolly, deformed faces, extra limbs, text, watermark"
)


def client(space: str) -> Client:
    return Client(space, token=os.environ.get("HF_TOKEN"), verbose=False)


def save(res, out: str, started: float) -> None:
    path = res["video"] if isinstance(res, dict) else res
    shutil.copy(path, out)
    print("готово:", out, f"{time.time() - started:.0f} с")


def main(cmd: str, *a: str) -> None:
    started = time.time()
    if cmd == "ltx":
        img, prompt, secs, h, w, out = a
        res, _ = client("Lightricks/ltx-video-distilled").predict(
            prompt, NEGATIVE, handle_file(img), None, int(h), int(w), "image-to-video",
            float(secs), 9, 7, False, 1, True, api_name="/image_to_video",
        )
        save(res, out, started)
    elif cmd == "moda":
        img, audio, out = a
        res = client("multimodalart/MoDA-fast-talking-head").predict(
            handle_file(img), handle_file(audio), "Happiness", 1.2, api_name="/generate_motion"
        )
        save(res, out, started)
    elif cmd == "sync":
        video, audio, out = a
        res = client("fffiloni/LatentSync").predict(
            handle_file(video), handle_file(audio), api_name="/generate_lip_sync_video"
        )
        save(res, out, started)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
