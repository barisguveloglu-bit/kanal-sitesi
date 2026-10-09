#!/bin/bash
# Film araclarini kurar: Blender 5.2.2 LTS + MCprep 3.6.3 dokulari (+ ffmpeg,
# numpy, Pillow yoksa).                                            v7.99.10
#
# Kullanici: "yeni sohbetlerde de bu otomatik olarak kurulu gelsin."
# Bulut ortaminin "Setup script" alanina tek satir:
#
#   curl -fsSL https://raw.githubusercontent.com/barisguveloglu-bit/kanal-sitesi/refs/heads/claude/v7-94-0-system-scan-fixes-7xc4ex/addon/arac/arac_kur.sh | bash
#
# Elle de calisir: bash addon/arac/arac_kur.sh
#
# Kurallar (REFERANS_BLENDER_MCPREP.md):
#   * Ikili dosyalar DEPOYA GIRMEZ (Blender 1.2 GB). Her seferinde RESMI
#     kaynaktan indirilir: download.blender.org ve MCprep'in GitHub surumu.
#   * Blender SHA-256'si Blender'in kendi resmi listesiyle, MCprep zip'i
#     bilinen md5 ile karsilastirilir; tutmazsa KURULMAZ, betik hata verir.
#   * Surum SABIT (5.2.2): film araci bu surumle olculdu ve dogrulandi.
#     "En yeni" diye kendiliginden atlamak sessiz bozulma demek; surum
#     atlanacaksa burada elle degistirilir, sonra testler kosulur.
#   * Zaten kurulu ve dogruysa hicbir sey indirmez (tekrar calistirilabilir).
#
# Sonuc: /opt/araclar/blender/blender ve /etc/profile.d/film_araclari.sh
# (BLENDER ve MCPREP_DOKU degiskenleri).
set -euo pipefail

KOK=${ARAC_KOK:-/opt/araclar}
BLENDER_SURUM=5.2.2
BLENDER_AD=blender-${BLENDER_SURUM}-linux-x64
BLENDER_URL=https://download.blender.org/release/Blender5.2/${BLENDER_AD}.tar.xz
BLENDER_SHA_LISTE=https://download.blender.org/release/Blender5.2/blender-${BLENDER_SURUM}.sha256
MCPREP_SURUM=3.6.3
MCPREP_URL=https://github.com/Moo-Ack-Productions/MCprep/releases/download/${MCPREP_SURUM}/MCprep_addon_${MCPREP_SURUM}.zip
MCPREP_MD5=22e6ac75cb2d48fed2cfa4be752af1a7
DOKU_YOL=MCprep_addon/MCprep_resources/resourcepacks/mcprep_default/assets/minecraft/textures/block

mkdir -p "$KOK"
gecici=$(mktemp -d)
trap 'rm -rf "$gecici"' EXIT

# ---- Blender ----
if [ -x "$KOK/blender/blender" ] && "$KOK/blender/blender" -b --version 2>/dev/null | grep -q "Blender ${BLENDER_SURUM}"; then
  echo "blender ${BLENDER_SURUM}: zaten kurulu"
else
  echo "blender ${BLENDER_SURUM}: indiriliyor (resmi kaynak)"
  curl -fsSL -o "$gecici/${BLENDER_AD}.tar.xz" "$BLENDER_URL"
  curl -fsSL -o "$gecici/liste.sha256" "$BLENDER_SHA_LISTE"
  beklenen=$(grep " ${BLENDER_AD}.tar.xz\$" "$gecici/liste.sha256" | awk '{print $1}')
  gercek=$(sha256sum "$gecici/${BLENDER_AD}.tar.xz" | awk '{print $1}')
  if [ -z "$beklenen" ] || [ "$beklenen" != "$gercek" ]; then
    echo "HATA: Blender SHA-256 resmi listeyle TUTMUYOR (beklenen '$beklenen', gelen '$gercek'). Kurulmadi." >&2
    exit 1
  fi
  echo "blender SHA-256 resmi listeyle ayni: ${gercek:0:8}...${gercek: -4}"
  rm -rf "$KOK/blender" "$KOK/$BLENDER_AD"
  tar -xJf "$gecici/${BLENDER_AD}.tar.xz" -C "$KOK"
  mv "$KOK/$BLENDER_AD" "$KOK/blender"
fi

# ---- MCprep dokulari ----
if [ -d "$KOK/mcprep/$DOKU_YOL" ] && [ -f "$KOK/mcprep/.surum_${MCPREP_SURUM}" ]; then
  echo "mcprep ${MCPREP_SURUM}: zaten kurulu"
else
  echo "mcprep ${MCPREP_SURUM}: indiriliyor (resmi GitHub surumu)"
  curl -fsSL -o "$gecici/mcprep.zip" "$MCPREP_URL"
  gercek=$(md5sum "$gecici/mcprep.zip" | awk '{print $1}')
  if [ "$gercek" != "$MCPREP_MD5" ]; then
    echo "HATA: MCprep md5 tutmuyor (beklenen $MCPREP_MD5, gelen $gercek). Kurulmadi." >&2
    exit 1
  fi
  rm -rf "$KOK/mcprep"
  mkdir -p "$KOK/mcprep"
  python3 -c "import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$gecici/mcprep.zip" "$KOK/mcprep"
  [ -d "$KOK/mcprep/$DOKU_YOL" ] || { echo "HATA: MCprep doku klasoru yok: $DOKU_YOL" >&2; exit 1; }
  touch "$KOK/mcprep/.surum_${MCPREP_SURUM}"
fi

# ---- ffmpeg, numpy, Pillow (birlestirme ve ses) ----
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg: kuruluyor"
  if command -v apt-get >/dev/null 2>&1; then
    (apt-get update -qq && apt-get install -y -qq ffmpeg) >/dev/null
  else
    echo "UYARI: ffmpeg yok ve apt-get de yok; birlestirme calismaz." >&2
  fi
fi
python3 -c "import numpy, PIL" 2>/dev/null || pip install -q numpy pillow

# ---- ortam degiskenleri ----
cat > "$KOK/film_araclari.sh" <<EOF
export BLENDER="$KOK/blender/blender"
export MCPREP_DOKU="$KOK/mcprep/$DOKU_YOL"
EOF
if [ -w /etc/profile.d ]; then cp "$KOK/film_araclari.sh" /etc/profile.d/film_araclari.sh; fi

echo "HAZIR: BLENDER=$KOK/blender/blender  MCPREP_DOKU=$KOK/mcprep/$DOKU_YOL"
