#!/usr/bin/env bash
# Country Balls üretim ortamını kurar (Ubuntu/Debian, root).
# Bulut konteyneri geçici: her yeni oturumda bir kez çalıştır ya da içeriğini
# ortamın "Setup script" alanına yapıştır.
#
#   bash video/kur.sh            # her şey (Blender dahil, ~1.6 GB disk)
#   BLENDER_ATLA=1 bash video/kur.sh   # yalnız 2D zinciri
set -euo pipefail

BLENDER_SURUM="${BLENDER_SURUM:-5.2.3}"
BLENDER_SERI="${BLENDER_SURUM%.*}"
ARAC_KOK="${ARAC_KOK:-/opt/araclar}"
YAZI_KOK=/usr/local/share/fonts/video

echo "==> Sistem paketleri (ffmpeg, cairo, Blender'ın çalışma kitaplıkları)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ffmpeg libcairo2-dev pkg-config python3-dev \
    libegl1 libgl1 libxi6 libxkbcommon0 libsm6 libxrender1 libxxf86vm1 libxfixes3 >/dev/null

echo "==> Python paketleri"
pip3 install -q pycairo numpy

echo "==> Yazı tipi: Baloo 2 (SIL Open Font License, tam Türkçe karakter desteği)"
mkdir -p "$YAZI_KOK"
curl -fsSL -o "$YAZI_KOK/Baloo2.ttf" \
    "https://raw.githubusercontent.com/google/fonts/main/ofl/baloo2/Baloo2%5Bwght%5D.ttf"
curl -fsSL -o "$YAZI_KOK/OFL-Baloo2.txt" \
    "https://raw.githubusercontent.com/google/fonts/main/ofl/baloo2/OFL.txt"
fc-cache -f >/dev/null

if [[ "${BLENDER_ATLA:-0}" != "1" ]]; then
    echo "==> Blender $BLENDER_SURUM (resmî derleme, SHA-256 doğrulamalı)"
    mkdir -p "$ARAC_KOK/indirme"
    cd "$ARAC_KOK/indirme"
    ARSIV="blender-$BLENDER_SURUM-linux-x64.tar.xz"
    TABAN="https://download.blender.org/release/Blender$BLENDER_SERI"
    [[ -f "$ARSIV" ]] || curl -fsSL -o "$ARSIV" "$TABAN/$ARSIV"
    curl -fsSL -o "blender-$BLENDER_SURUM.sha256" "$TABAN/blender-$BLENDER_SURUM.sha256"
    grep "$ARSIV" "blender-$BLENDER_SURUM.sha256" | sha256sum -c -
    tar -xf "$ARSIV" -C "$ARAC_KOK"
    ln -sf "$ARAC_KOK/blender-$BLENDER_SURUM-linux-x64/blender" /usr/local/bin/blender
    blender --version | head -1
fi

echo "==> Hazır. Deneme: python3 video/bolum01.py"
