"""Речь бойцов: облачный синтез (Microsoft Edge TTS) + «патина радиосвязи» и крик «Ура» толпой через ffmpeg.

Запуск: python make_audio.py <папка>. Результат: soldier.wav, reichstag.wav.
"""
import asyncio
import subprocess
import sys
from pathlib import Path

import edge_tts
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = "ru-RU-DmitryNeural"
RADIO = "highpass=f=250,lowpass=f=3600,acompressor=threshold=-18dB:ratio=3,volume=1.4"
SPEECH = {
    "soldier": "Здравствуй, потомок! Я прошёл эту войну до самой Победы. Мы выстояли, потому что были вместе, "
    "весь Советский Союз: и солдат на фронте, и мать у станка, и мальчишка в тылу. "
    "Победа досталась нам дорогой ценой. Береги мир, береги память и гордись своей страной. Помни нас!",
    "reichstag": "Товарищи! Мы дошли до Берлина! Четыре долгих года мы шли к этому дню, через огонь и потери, "
    "от Москвы и Орла до самого Рейхстага. Враг разбит, победа за нами! "
    "Слава советскому народу! Слава нашей Родине!",
}


def ff(*args: str) -> None:
    subprocess.run([FF, "-y", "-loglevel", "error", *args], check=True)


async def tts(text: str, out: Path, pitch: str = "-4Hz", rate: str = "-5%") -> None:
    await edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch).save(str(out))


async def main(d: Path) -> None:
    for key, text in SPEECH.items():
        await tts(text, d / f"{key}_raw.mp3")
    # «Ура» — шесть голосов с разной высотой: из них собирается толпа
    for i, pitch in enumerate(["-4Hz", "-12Hz", "-6Hz", "+0Hz", "+6Hz", "-18Hz"]):
        await tts("Ура-а-а!", d / f"ura_{i}.mp3", pitch=pitch, rate="+0%")

    ff("-i", str(d / "soldier_raw.mp3"), "-filter_complex",
       f"[0:a]{RADIO}[v];anoisesrc=color=pink:amplitude=0.012:d=60[n];[v][n]amix=inputs=2:duration=first:normalize=0",
       "-ac", "1", "-ar", "44100", str(d / "soldier.wav"))

    tempos, delays = [0.8, 0.75, 0.85, 0.78, 0.82, 0.7], [0, 120, 60, 200, 90, 260]
    inputs = sum([["-i", str(d / f"ura_{i}.mp3")] for i in range(6)], [])
    chains = ";".join(f"[{i}]atempo={t},adelay={dl}|{dl}[u{i}]" for i, (t, dl) in enumerate(zip(tempos, delays)))
    mix = "".join(f"[u{i}]" for i in range(6))
    ff(*inputs, "-filter_complex",
       f"{chains};{mix}amix=inputs=6:normalize=0,volume=0.9,aecho=0.8:0.6:60|110:0.35|0.25,{RADIO}",
       "-ac", "1", "-ar", "44100", str(d / "crowd_ura.wav"))
    ff("-i", str(d / "reichstag_raw.mp3"), "-filter_complex", f"[0:a]{RADIO}",
       "-ac", "1", "-ar", "44100", str(d / "reichstag_speech.wav"))
    ff("-i", str(d / "reichstag_speech.wav"), "-f", "lavfi", "-t", "0.35", "-i", "anullsrc=r=44100:cl=mono",
       "-i", str(d / "crowd_ura.wav"), "-filter_complex", "[0][1][2]concat=n=3:v=0:a=1,apad=pad_dur=0.3",
       str(d / "reichstag.wav"))
    print("готово:", d / "soldier.wav", d / "reichstag.wav")


if __name__ == "__main__":
    asyncio.run(main(Path(sys.argv[1] if len(sys.argv) > 1 else ".")))
