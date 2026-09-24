#!/usr/bin/env bash
# Финальная склейка роликов «Живого фото» из облачных заготовок (ERA2.ai: ElevenLabs v3, Kling 3.0, Hedra).
# Локально — только ffmpeg: нарезка реплик, хор «Ура», «патина радиосвязи», заплатка на месте QR, пометка ИИ.
#
#   bash scripts/live-photo/assemble.sh <папка-этапов> <исходники> <шрифт.ttf>
#
# <папка-этапов>/01_voice: reichstag_dialog_elevenlabs_v3.mp3, ura_5voices_elevenlabs_v3.mp3
# <папка-этапов>/02_video: reichstag_kling3_talk10_raw.mp4 (10 с, первый и последний кадр = снимок),
#                          reichstag_kling3_raw.mp4 (5 с, «Ура»), soldier_hedra_raw.mp4
# <исходники>: reichstag_photo.png, soldier_photo.png (снимки без QR)
set -euo pipefail
ST=$1; IN=$2; FONT=$3
V=$ST/01_voice; D=$ST/02_video; F=$ST/03_final; mkdir -p "$F"
RADIO="highpass=f=250,lowpass=f=3600,acompressor=threshold=-18dB:ratio=3,volume=1.4"
LABEL=$(mktemp); printf 'Реконструкция с помощью ИИ · демо' > "$LABEL"
ff() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# Бойцы: три реплики из диалога ElevenLabs (командир, старшина, боец 2)
ff -i "$V/reichstag_dialog_elevenlabs_v3.mp3" -af "atrim=0:3.45,asetpts=PTS-STARTPTS" "$V/cut_1_valery.wav"
ff -i "$V/reichstag_dialog_elevenlabs_v3.mp3" -af "atrim=7.42:12.26,asetpts=PTS-STARTPTS,afade=t=in:d=0.03" "$V/cut_2_evelon.wav"
ff -i "$V/reichstag_dialog_elevenlabs_v3.mp3" -af "atrim=13.08:15.98,asetpts=PTS-STARTPTS,afade=t=in:d=0.03" "$V/cut_3_zion.wav"
# «Ура»: пять голосов со сдвигом 40–220 мс — хор
ff -i "$V/ura_5voices_elevenlabs_v3.mp3" -filter_complex "[0]asplit=5[a][b][c][d][e];\
[a]atrim=0:1.88,asetpts=PTS-STARTPTS[a1];\
[b]atrim=2.25:3.28,asetpts=PTS-STARTPTS,adelay=90|90,volume=0.9[b1];\
[c]atrim=3.69:4.86,asetpts=PTS-STARTPTS,adelay=160|160,volume=0.95[c1];\
[d]atrim=5.23:6.19,asetpts=PTS-STARTPTS,adelay=40|40,volume=0.85[d1];\
[e]atrim=6.56:7.70,asetpts=PTS-STARTPTS,adelay=220|220,volume=0.9[e1];\
[a1][b1][c1][d1][e1]amix=inputs=5:normalize=0,volume=0.75,aecho=0.8:0.6:70|130:0.35|0.22,apad=pad_dur=0.8" "$V/cut_4_ura_chorus.wav"
# Раскладка: реплики на 0,5 / 4,7 / 10,6 с; хор — в момент, когда бойцы вскидывают руки (10,04 + 3,65 с)
ff -i "$V/cut_1_valery.wav" -i "$V/cut_2_evelon.wav" -i "$V/cut_3_zion.wav" -i "$V/cut_4_ura_chorus.wav" -filter_complex "\
[0]adelay=500|500[a];[1]adelay=4700|4700[b];[2]adelay=10600|10600[c];[3]adelay=13690|13690[d];\
[a][b][c][d]amix=inputs=4:normalize=0,apad,atrim=0:16.5,$RADIO[r];anoisesrc=color=pink:amplitude=0.012:d=16.5[n];\
[r][n]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=16.1:d=0.4" "$V/reichstag_group_radio.wav"
# Видео: разговор 10 с + «Ура» 5 с + 1,4 с стоп-кадра; Kling отдаёт 16:9 с полями — обрезаем до снимка
ff -i "$D/reichstag_kling3_talk10_raw.mp4" -i "$D/reichstag_kling3_raw.mp4" -loop 1 -i "$IN/reichstag_photo.png" -i "$V/reichstag_group_radio.wav" -filter_complex "\
[0:v][1:v]concat=n=2:v=1:a=0,crop=1002:720:139:0,scale=960:690:flags=lanczos,tpad=stop_mode=clone:stop_duration=1.42,setsar=1[vid];\
[2]scale=960:690,format=rgba,crop=216:245:0:445,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*min(1,(W-1-X)/12)*min(1,Y/18)'[patch];\
[vid][patch]overlay=0:445:shortest=1,drawtext=fontfile=$FONT:textfile=$LABEL:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=6:x=w-tw-14:y=14,format=yuv420p[v]" \
  -map "[v]" -map 3:a -t 16.5 -c:v libx264 -preset slow -crf 21 -r 24 -c:a aac -b:a 128k -movflags +faststart "$F/reichstag.mp4"

# Офицер: кадр Hedra (2:3) ложится на снимок 500×716 со сдвигом 11 px, звук — дорожка Hedra с «радио»
ff -loop 1 -i "$IN/soldier_photo.png" -i "$D/soldier_hedra_raw.mp4" -filter_complex "\
[0]scale=500:716,format=rgb24,split[bg][qr];\
[qr]crop=200:210:0:506,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*min(1,(W-1-X)/24)*min(1,Y/24)'[patch];\
[1:v]scale=477:716:flags=lanczos,fps=25[h];[bg][h]overlay=11:0:shortest=1[m];[m][patch]overlay=0:506:format=auto,\
drawtext=fontfile=$FONT:textfile=$LABEL:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=6:x=w-tw-12:y=12,format=yuv420p[v];\
[1:a]$RADIO[ra];anoisesrc=color=pink:amplitude=0.012:d=60[n];[ra][n]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=22.3:d=0.3[a]" \
  -map "[v]" -map "[a]" -t 22.64 -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 128k -movflags +faststart "$F/soldier.mp4"
rm -f "$LABEL"
echo "Готово: $F/reichstag.mp4, $F/soldier.mp4"
