#!/usr/bin/env bash
# Country Balls üretim ortamını kurar (Ubuntu 24.04, root).
# Bulut konteyneri geçici: her yeni oturumda bir kez çalıştır ya da içeriğini
# ortamın "Setup script" alanına yapıştır.
#
#   bash video/kur.sh                 # temel: FFmpeg, pycairo, yazı tipi,
#                                     #        Blender, Krita, Inkscape (~3.5 GB)
#   TAM=1 bash video/kur.sh           # + Synfig, GIMP, Kdenlive/MLT (~+2 GB)
#   BLENDER_ATLA=1 KRITA_ATLA=1 bash video/kur.sh   # yalnız 2D zinciri + Inkscape
#
# Her indirme yayıncının kendi sağlama değeriyle (SHA-256) ya da apt'nin imza
# denetimiyle doğrulanır. Sürüm satırları yalnız bilgi amaçlı (|| true): bazı araçlar
# --version için sıfır olmayan kodla çıkıyor. Asıl denetim: python3 video/araclari_sina.py
set -euo pipefail

BLENDER_SURUM="${BLENDER_SURUM:-5.2.3}"
KRITA_SURUM="${KRITA_SURUM:-5.3.4.1}"
GIMP_SURUM="${GIMP_SURUM:-3.2.6}"
KDENLIVE_SURUM="${KDENLIVE_SURUM:-26.08.2}"
ARAC_KOK="${ARAC_KOK:-/opt/araclar}"
YAZI_KOK=/usr/local/share/fonts/video
INKSCAPE_PPA_ANAHTAR=56BDFFD2F1C96B3D1575E3B85C9A0B86CD2FCB38   # Launchpad: ~inkscape.dev/stable
export DEBIAN_FRONTEND=noninteractive

# ------------------------------------------------------------ yardımcılar

# KDE indirme sunucusunun yayımladığı SHA-256 (.mirrorlist sayfası).
kde_sha256() {
    curl -fsSL "$1.mirrorlist" | sed 's/<[^>]*>/ /g' \
        | grep -iA1 'sha-256\|sha256' | grep -oE '[0-9a-f]{64}' | head -1 || true
}

# appimage_kur <ad-sürüm> <url> <beklenen-sha256>
# İndirir, doğrular, $ARAC_KOK/<ad-sürüm>/squashfs-root altına açar.
# (FUSE gerekmesin diye AppImage çalıştırılmaz, açılır.)
appimage_kur() {
    local ad=$1 url=$2 sha=$3 dosya
    dosya=$(basename "$url")
    [[ -n "$sha" ]] || { echo "$ad: yayıncının SHA-256 değeri alınamadı"; exit 1; }
    mkdir -p "$ARAC_KOK/indirme"
    (
        cd "$ARAC_KOK/indirme"
        [[ -f "$dosya" ]] || curl -fsSL -o "$dosya" "$url"
        echo "$sha  $dosya" | sha256sum -c -
        chmod +x "$dosya"
        rm -rf "${ARAC_KOK:?}/$ad"
        mkdir -p "$ARAC_KOK/$ad"
        cd "$ARAC_KOK/$ad" && "$ARAC_KOK/indirme/$dosya" --appimage-extract >/dev/null
    )
}

# sarmal_yaz <komut> <çalıştırılacak> — ekran yoksa sanal X (Xvfb) ile açar.
sarmal_yaz() {
    cat > "/usr/local/bin/$1" <<SARMAL
#!/usr/bin/env bash
# $1 → $2 (resmî AppImage'ın açılmış hâli). Ekran yoksa sanal X (Xvfb).
if [[ -z "\${DISPLAY:-}" ]]; then
    exec xvfb-run -a -s "-screen 0 1920x1080x24" "$2" "\$@"
fi
exec "$2" "\$@"
SARMAL
    chmod +x "/usr/local/bin/$1"
}

# ------------------------------------------------------------------ temel

echo "==> Sistem paketleri (FFmpeg, cairo, Xvfb, uygulama kitaplıkları)"
apt-get update -qq
apt-get install -y -qq ffmpeg libcairo2-dev pkg-config python3-dev gnupg curl \
    libegl1 libgl1 libxi6 libxkbcommon0 libsm6 libxrender1 libxxf86vm1 libxfixes3 \
    xvfb xauth libxcb-xinerama0 libxcb-icccm4 libxcb-image0 libxcb-keysyms1 \
    libxcb-randr0 libxcb-render-util0 libxcb-shape0 libxcb-xkb1 libxkbcommon-x11-0 \
    libxcb-cursor0 >/dev/null

echo "==> Python paketleri"
pip3 install -q pycairo numpy

echo "==> Yazı tipi: Baloo 2 (SIL Open Font License, tam Türkçe karakter desteği)"
mkdir -p "$YAZI_KOK"
curl -fsSL -o "$YAZI_KOK/Baloo2.ttf" \
    "https://raw.githubusercontent.com/google/fonts/main/ofl/baloo2/Baloo2%5Bwght%5D.ttf"
curl -fsSL -o "$YAZI_KOK/OFL-Baloo2.txt" \
    "https://raw.githubusercontent.com/google/fonts/main/ofl/baloo2/OFL.txt"
fc-cache -f >/dev/null

echo "==> Inkscape (resmî kararlı PPA; Ubuntu'nun kendi paketi eski 1.2)"
# add-apt-repository bu imajda bozuk Python yüzünden çalışmıyor; PPA elle eklenir.
mkdir -p /etc/apt/keyrings
curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x$INKSCAPE_PPA_ANAHTAR" \
    | gpg --dearmor > /etc/apt/keyrings/inkscape-stable.gpg
gpg --show-keys --with-colons /etc/apt/keyrings/inkscape-stable.gpg 2>/dev/null \
    | grep -q "fpr:::::::::$INKSCAPE_PPA_ANAHTAR:" || { echo "Inkscape PPA anahtarı tutmuyor"; exit 1; }
echo "deb [signed-by=/etc/apt/keyrings/inkscape-stable.gpg] https://ppa.launchpadcontent.net/inkscape.dev/stable/ubuntu noble main" \
    > /etc/apt/sources.list.d/inkscape-stable.list
apt-get update -qq
apt-get install -y -qq inkscape >/dev/null
inkscape --version 2>/dev/null || true

if [[ "${BLENDER_ATLA:-0}" != "1" ]]; then
    echo "==> Blender $BLENDER_SURUM (resmî derleme, SHA-256 doğrulamalı)"
    mkdir -p "$ARAC_KOK/indirme"
    (
        cd "$ARAC_KOK/indirme"
        ARSIV="blender-$BLENDER_SURUM-linux-x64.tar.xz"
        TABAN="https://download.blender.org/release/Blender${BLENDER_SURUM%.*}"
        [[ -f "$ARSIV" ]] || curl -fsSL -o "$ARSIV" "$TABAN/$ARSIV"
        curl -fsSL -o "blender-$BLENDER_SURUM.sha256" "$TABAN/blender-$BLENDER_SURUM.sha256"
        grep "$ARSIV" "blender-$BLENDER_SURUM.sha256" | sha256sum -c -
        tar -xf "$ARSIV" -C "$ARAC_KOK"
    )
    ln -sf "$ARAC_KOK/blender-$BLENDER_SURUM-linux-x64/blender" /usr/local/bin/blender
    blender --version 2>/dev/null | head -1 || true
fi

if [[ "${KRITA_ATLA:-0}" != "1" ]]; then
    echo "==> Krita $KRITA_SURUM (resmî AppImage, KDE SHA-256 doğrulamalı)"
    # AppImage yalnız X11 (xcb) eklentisi taşıyor: ekransız ortamda Xvfb şart.
    URL="https://download.kde.org/stable/krita/$KRITA_SURUM/krita-$KRITA_SURUM-x86_64.AppImage"
    appimage_kur "krita-$KRITA_SURUM" "$URL" "$(kde_sha256 "$URL")"
    sarmal_yaz krita "$ARAC_KOK/krita-$KRITA_SURUM/squashfs-root/AppRun"
    krita --version 2>/dev/null | tail -1 || true
fi

# ------------------------------------------------------- isteğe bağlı (TAM=1)

if [[ "${TAM:-0}" == "1" ]]; then
    echo "==> Synfig (Ubuntu paketi; GitHub sürüm dosyalarına bu ağdan erişilemiyor)"
    apt-get install -y -qq synfig synfigstudio >/dev/null
    synfig --version 2>&1 | head -1 || true   # synfig --version 3 ile çıkıyor

    echo "==> GIMP $GIMP_SURUM (resmî AppImage, gimp.org SHA-256 doğrulamalı)"
    GIMP_SERI="${GIMP_SURUM%.*}"
    URL="https://download.gimp.org/gimp/v$GIMP_SERI/linux/GIMP-$GIMP_SURUM-x86_64.AppImage"
    SHA=$(curl -fsSL "https://download.gimp.org/gimp/v$GIMP_SERI/linux/SHA256SUMS" \
        | awk -v f="GIMP-$GIMP_SURUM-x86_64.AppImage" '$2 == f {print $1}')
    appimage_kur "gimp-$GIMP_SURUM" "$URL" "$SHA"
    G="$ARAC_KOK/gimp-$GIMP_SURUM/squashfs-root"
    # AppRun yalnız arayüzü açıyor; aynı ortamla konsol (toplu iş) sürümü:
    sed '$ s#^exec "\$APPDIR"/usr/bin/org.gimp.GIMP.Stable "\$@"#exec "$APPDIR"/usr/bin/gimp-console-'"$GIMP_SERI"' "$@"#' \
        "$G/AppRun" > "$G/AppRun.konsol"
    chmod +x "$G/AppRun.konsol"
    printf '#!/usr/bin/env bash\n# GIMP %s ekransız toplu iş modu.\nexec "%s" "$@"\n' \
        "$GIMP_SURUM" "$G/AppRun.konsol" > /usr/local/bin/gimp-console
    chmod +x /usr/local/bin/gimp-console
    sarmal_yaz gimp "$G/AppRun"
    gimp-console --version 2>&1 | tail -1 || true

    echo "==> Kdenlive $KDENLIVE_SURUM + MLT/melt (resmî AppImage, KDE SHA-256 doğrulamalı)"
    URL="https://download.kde.org/stable/kdenlive/${KDENLIVE_SURUM%.*}/linux/kdenlive-$KDENLIVE_SURUM-x86_64.AppImage"
    appimage_kur "kdenlive-$KDENLIVE_SURUM" "$URL" "$(kde_sha256 "$URL")"
    K="$ARAC_KOK/kdenlive-$KDENLIVE_SURUM/squashfs-root"
    sarmal_yaz kdenlive "$K/AppRun"
    cat > /usr/local/bin/melt <<SARMAL
#!/usr/bin/env bash
# Kdenlive $KDENLIVE_SURUM AppImage'ının içindeki MLT motoru (melt).
this_dir="$K"
source "$K/apprun-hooks/craft-runenv-hook.sh"
exec "$K/usr/bin/melt" "\$@"
SARMAL
    chmod +x /usr/local/bin/melt
    melt --version 2>&1 | head -1 || true
fi

echo "==> Hazır. Araç sınaması: python3 video/araclari_sina.py"
