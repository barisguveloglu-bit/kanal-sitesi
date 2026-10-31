#!/usr/bin/env bash
# Country Balls üretim ortamını kurar (Ubuntu/Debian, root).
# Bulut konteyneri geçici: her yeni oturumda bir kez çalıştır ya da içeriğini
# ortamın "Setup script" alanına yapıştır.
#
#   bash video/kur.sh            # her şey (Blender + Krita dahil, ~3 GB disk)
#   BLENDER_ATLA=1 KRITA_ATLA=1 bash video/kur.sh   # yalnız 2D zinciri
set -euo pipefail

BLENDER_SURUM="${BLENDER_SURUM:-5.2.3}"
KRITA_SURUM="${KRITA_SURUM:-5.3.4.1}"
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

if [[ "${KRITA_ATLA:-0}" != "1" ]]; then
    echo "==> Krita $KRITA_SURUM (resmî AppImage, KDE SHA-256 doğrulamalı) + Xvfb"
    # AppImage yalnız X11 (xcb) eklentisi taşıyor: ekransız ortamda Xvfb şart.
    apt-get install -y -qq xvfb xauth libxcb-xinerama0 libxcb-icccm4 libxcb-image0 \
        libxcb-keysyms1 libxcb-randr0 libxcb-render-util0 libxcb-shape0 libxcb-xkb1 \
        libxkbcommon-x11-0 libxcb-cursor0 >/dev/null
    mkdir -p "$ARAC_KOK/indirme"
    cd "$ARAC_KOK/indirme"
    KRITA_DOSYA="krita-$KRITA_SURUM-x86_64.AppImage"
    KRITA_TABAN="https://download.kde.org/stable/krita/$KRITA_SURUM"
    [[ -f "$KRITA_DOSYA" ]] || curl -fsSL -o "$KRITA_DOSYA" "$KRITA_TABAN/$KRITA_DOSYA"
    BEKLENEN=$(curl -fsSL "$KRITA_TABAN/$KRITA_DOSYA.mirrorlist" | sed 's/<[^>]*>/ /g' \
        | grep -iA1 'sha-256\|sha256' | grep -oE '[0-9a-f]{64}' | head -1 || true)
    [[ -n "$BEKLENEN" ]] || { echo "KDE SHA-256 değeri alınamadı"; exit 1; }
    echo "$BEKLENEN  $KRITA_DOSYA" | sha256sum -c -
    chmod +x "$KRITA_DOSYA"
    KRITA_KOK="$ARAC_KOK/krita-$KRITA_SURUM"
    rm -rf "$KRITA_KOK"
    mkdir -p "$KRITA_KOK"
    (cd "$KRITA_KOK" && "$ARAC_KOK/indirme/$KRITA_DOSYA" --appimage-extract >/dev/null)
    cat > /usr/local/bin/krita <<SARMAL
#!/usr/bin/env bash
# Krita $KRITA_SURUM (resmî AppImage, açılmış hâli). Ekran yoksa sanal X (Xvfb).
KRITA_APPRUN="$KRITA_KOK/squashfs-root/AppRun"
if [[ -z "\${DISPLAY:-}" ]]; then
    exec xvfb-run -a -s "-screen 0 1920x1080x24" "\$KRITA_APPRUN" "\$@"
fi
exec "\$KRITA_APPRUN" "\$@"
SARMAL
    chmod +x /usr/local/bin/krita
    krita --version 2>/dev/null | tail -1
fi

echo "==> Hazır. Deneme: python3 video/bolum01.py"
