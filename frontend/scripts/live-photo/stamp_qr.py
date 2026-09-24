"""QR-код в левый нижний угол снимка: белая плашка с подписью «Живое фото · ИИ».

python stamp_qr.py <снимок> <id> <out.jpg> [размер_кода_px]
Адрес кода: https://akaalexey.github.io/lexa-lepexa/live/<id>
"""
import sys

import qrcode
from PIL import Image, ImageDraw, ImageFont

BASE = "https://akaalexey.github.io/lexa-lepexa/live/"


def stamp(src: str, slug: str, out: str, qr_px: int = 160) -> None:
    im = Image.open(src).convert("RGB")
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
    q.add_data(BASE + slug)
    q.make(fit=True)
    code = q.make_image(fill_color="black", back_color="white").convert("RGB")
    code = code.resize((qr_px, qr_px), Image.NEAREST)
    try:
        font = ImageFont.truetype("arialbd.ttf", max(11, qr_px // 11))
    except OSError:
        font = ImageFont.load_default()
    label = "Живое фото · ИИ"
    tw, th = font.getbbox(label)[2], font.getbbox(label)[3] + 4
    pad = 6
    plate = Image.new("RGB", (qr_px + 2 * pad, qr_px + th + 2 * pad), "white")
    plate.paste(code, (pad, pad))
    ImageDraw.Draw(plate).text(((plate.width - tw) // 2, pad + qr_px), label, fill="black", font=font)
    im.paste(plate, (10, im.height - plate.height - 10))
    im.save(out, quality=95, subsampling=0)
    print(out, BASE + slug)


if __name__ == "__main__":
    stamp(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 160)
