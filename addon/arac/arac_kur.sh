#!/bin/bash
# Film araclarini kurar: Blender 5.2.2 LTS + MCprep 3.6.3 dokulari + Thomas Rig
# Legacy 1.2.8 iskeleti (+ ffmpeg, numpy, Pillow yoksa) + hazir efekt/animasyon/
# ses paketleri (REFERANS_HAZIR_PAKETLER.md; VDB'ler yalniz --vdb).  v7.99.15
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
# (BLENDER, MCPREP_DOKU ve THOMAS_RIG degiskenleri).
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
# Thomas Rig Legacy (goz sistemi, REFERANS_THOMAS_RIG.md): GPL-3.0, resmi Blender
# eklenti sitesi. Paketten YALNIZ iskelet .blend'i acilir; paketteki Mojang
# dokulari (Steve-base.png, vanilla zirh) alinmaz -- skin her zaman bizimki.
THOMAS_SURUM=1.2.8
THOMAS_SHA=9a3e7a31cb7fedeb7ed71bc6295e682dcc0c129f1b65c7de04c0dd34295469fe
THOMAS_URL="https://extensions.blender.org/download/sha256:${THOMAS_SHA}/add-on-thomas-rig-legacy-v${THOMAS_SURUM}.zip?repository=%2Fapi%2Fv1%2Fextensions%2F&blender_version_min=4.2.0"
THOMAS_ICI="assets/rigs/Thomas Rig Legacy.blend"

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

# ---- Thomas Rig Legacy: yalniz iskelet dosyasi ----
# Yalniz goz sahneleri icin. Kurulamazsa Blender/MCprep kurulumu BOZULMAZ:
# bulut ortami bu betigi her yeni oturumda calistiriyor; bir gece indirme
# takilirsa butun cizim iscileri BLENDER'siz kalirdi. SHA-256 tutmayan dosya
# yine ASLA kurulmaz; film araci o sahnede acik hata verir (THOMAS_RIG yok).
if [ -f "$KOK/thomas_rig/thomas_rig_legacy.blend" ] && [ -f "$KOK/thomas_rig/.surum_${THOMAS_SURUM}" ]; then
  echo "thomas rig ${THOMAS_SURUM}: zaten kurulu"
elif ! curl -fsSL -o "$gecici/thomas.zip" "$THOMAS_URL"; then
  echo "UYARI: Thomas Rig indirilemedi; goz sahneleri cizilemez (gerisi kuruluyor)." >&2
else
  gercek=$(sha256sum "$gecici/thomas.zip" | awk '{print $1}')
  if [ "$gercek" != "$THOMAS_SHA" ]; then
    echo "HATA: Thomas Rig SHA-256 TUTMUYOR (beklenen $THOMAS_SHA, gelen $gercek). Kurulmadi." >&2
  else
    echo "thomas rig ${THOMAS_SURUM}: SHA-256 resmi kaynakla ayni, yalniz iskelet aciliyor"
    rm -rf "$KOK/thomas_rig"
    mkdir -p "$KOK/thomas_rig"
    python3 -c "import sys, zipfile; open(sys.argv[3], 'wb').write(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]))" \
      "$gecici/thomas.zip" "$THOMAS_ICI" "$KOK/thomas_rig/thomas_rig_legacy.blend"
    touch "$KOK/thomas_rig/.surum_${THOMAS_SURUM}"
  fi
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
# "python3 -m pip": duz "pip" baska bir Python'a kurabiliyor (olculdu: PATH'teki
# python3 3.11, pip 3.13'unku -- kurulum "basarili" ama birlestirme numpy bulamadi)
python3 -c "import numpy, PIL" 2>/dev/null || python3 -m pip install -q numpy pillow
python3 -c "import numpy, PIL" || { echo "HATA: numpy/Pillow python3 icin kurulamadi" >&2; exit 1; }

# ---- Hazir paketler: efekt, animasyon, ses (REFERANS_HAZIR_PAKETLER.md) ----
# Kullanici: "yeni actigim oturumda da kullanabilsin." Iki kaynak:
#   * CC0 paketler RESMI kaynaktan (OpenGameArt; JangaFX'in MediaFire'i),
#   * kullanicinin indirip verdigi paketler gizli already-exists deposunun
#     "araclar" dalindan (Pooka'nin temiz kopyasi + Quaternius). Erisim yoksa
#     oturum once add_repo barisguveloglu-bit/already-exists yapar.
# Her dosya SABIT SHA-256 ile karsilastirilir; tutmayan KURULMAZ. Biri
# inemezse gerisi BOZULMAZ (Thomas Rig'deki gerekce). JangaFX VDB'leri ~2 GB:
# yalniz "--vdb" (ya da FILM_VDB=1) ile, her oturumun basi yavaslamasin.
PAKET="$KOK/paketler"
VDB=${FILM_VDB:-0}
for a in "$@"; do [ "$a" = "--vdb" ] && VDB=1; done
mkdir -p "$PAKET"
if ! command -v bsdtar >/dev/null 2>&1 && command -v apt-get >/dev/null 2>&1; then
  (apt-get update -qq && apt-get install -y -qq libarchive-tools) >/dev/null 2>&1 || true
fi
# paket_kur <klasor> <dosya> <sha256> <url | araclar:<yol> | mediafire:<sayfa>>
paket_kur() {
  local ad=$1 dosya=$2 sha=$3 kaynak=$4 hedef="$PAKET/$1" url gercek
  if [ -f "$hedef/.sha_${sha:0:16}" ]; then echo "paket $ad/$dosya: zaten kurulu"; return 0; fi
  case "$kaynak" in
    araclar:*)
      [ -d "$gecici/araclar" ] || GIT_TERMINAL_PROMPT=0 git clone -q --depth 1 --branch araclar \
          https://github.com/barisguveloglu-bit/already-exists "$gecici/araclar" 2>/dev/null \
        || { echo "UYARI: gizli depo (araclar dali) okunamadi, $ad atlandi. Once: add_repo barisguveloglu-bit/already-exists" >&2; return 0; }
      cp "$gecici/araclar/${kaynak#araclar:}" "$gecici/$dosya" ;;
    mediafire:*)
      url=$(curl -fsSL "${kaynak#mediafire:}" | grep -oE 'href="https://download[0-9]*\.mediafire\.com/[^"]+"' | head -1 | sed 's/^href="//; s/"$//') || true
      { [ -n "$url" ] && curl -fsSL -o "$gecici/$dosya" "$url"; } \
        || { echo "UYARI: $ad/$dosya indirilemedi (gerisi kuruluyor)." >&2; return 0; } ;;
    *)
      curl -fsSL -o "$gecici/$dosya" "$kaynak" || { echo "UYARI: $ad/$dosya indirilemedi (gerisi kuruluyor)." >&2; return 0; } ;;
  esac
  gercek=$(sha256sum "$gecici/$dosya" | awk '{print $1}')
  if [ "$gercek" != "$sha" ]; then
    echo "HATA: $ad/$dosya SHA-256 TUTMUYOR (beklenen $sha, gelen $gercek). Kurulmadi." >&2
    rm -f "$gecici/$dosya"; return 0
  fi
  mkdir -p "$hedef"
  case "$dosya" in
    *.zip|*.7z|*.rar) bsdtar -xf "$gecici/$dosya" -C "$hedef" || { echo "UYARI: $ad/$dosya acilamadi (bsdtar?)." >&2; return 0; } ;;
    *) cp "$gecici/$dosya" "$hedef/$dosya" ;;
  esac
  rm -f "$gecici/$dosya"; touch "$hedef/.sha_${sha:0:16}"
  echo "paket $ad/$dosya: SHA-256 ayni, kuruldu"
}
OGA=https://opengameart.org/sites/default/files
paket_kur kenney_parcacik kenney_particlePack.zip 163b839ba7f62f8a420da93a62beaa80013588d5d6b1eb30841e1a553635ad70 "$OGA/kenney_particlePack.zip"
paket_kur kenney_duman smokeParticleAssets.zip da9260580d0f6a522496d03783fc9f740f13faa70844b52fb8df90ea9b72cb7a "$OGA/smokeParticleAssets.zip"
paket_kur ses_yumruk qubodupPunch.7z 757795e8778acc377abacea902052c2dc707583c69d00b8baa2e76b670a02398 "$OGA/qubodupPunch.7z"
paket_kur pooka pooka_efektler_temiz.blend 1a83586d726fbbb176a539dc43c089f9f3a0762307c4e64395068487d7b452ed araclar:pooka/pooka_efektler_temiz.blend
paket_kur quaternius License.txt 6d01f55c6e4c49a2c9963e147e561945ae2c83958c8ca667d90a6bffdbfac061 araclar:quaternius/License.txt
paket_kur quaternius UAL1_Standard.glb 69591853d817488edaa8fd9bf8fc1d821eaeaf789f8627b3cd23b41c4ed67997 araclar:quaternius/UAL1_Standard.glb
paket_kur quaternius UAL1_Standard_RM.glb be684571ed655a1b892c2c07e6e2aeca053b606c442d34004adaf1d944090d01 araclar:quaternius/UAL1_Standard_RM.glb
paket_kur quaternius UAL2_Standard.glb 8cee20ab1bc55130092447e810e26df22dd2803eccc54f52137a7d54d7ab88a8 araclar:quaternius/UAL2_Standard.glb
paket_kur quaternius UAL2_Standard_RM.glb 814eee878f82934992d3ea746c539df25e981487109c591f5efbb8dd03286f99 araclar:quaternius/UAL2_Standard_RM.glb
if [ "$VDB" = 1 ]; then
  MF=https://www.mediafire.com/file
  paket_kur jangafx_ates Fire_01.rar c130c42bf2ffc52254691e2d870c5c54cfda40e73bde4831d1603ccee94fb681 "mediafire:$MF/j9yvua10nfvhkvu/Fire_01.rar/file"
  paket_kur jangafx_kamp_atesi SmallCampfireVDB.zip fce2ad670a4738957f15b742410162e26bb84790e8bddb72ec2a4bd64bcebe30 "mediafire:$MF/9xx9icyomy2txv7/SmallCampfireVDB.zip/file"
  paket_kur jangafx_yer_patlamasi GroundExplosionVDB.zip 47c2c1d352b3c0dce31e462d09ede9f8bc95b5333ca9764564073b02113dc7b9 "mediafire:$MF/vm64xg0vta64qgl/GroundExplosionVDB.zip/file"
  paket_kur jangafx_hava_patlamasi Midair_Explosion_01.rar a0d3429e44611fa46872b61657608e97a398dc44e1da031462c964b6f0d380b6 "mediafire:$MF/uwmxisgj9xagrdh/Midair_Explosion_01.rar/file"
else
  echo "jangafx VDB: atlandi (patlama sahnesi icin: bash addon/arac/arac_kur.sh --vdb)"
fi

# ---- ortam degiskenleri ----
cat > "$KOK/film_araclari.sh" <<EOF
export BLENDER="$KOK/blender/blender"
export MCPREP_DOKU="$KOK/mcprep/$DOKU_YOL"
export THOMAS_RIG="$KOK/thomas_rig/thomas_rig_legacy.blend"
export FILM_PAKETLER="$PAKET"
EOF
if [ -w /etc/profile.d ]; then cp "$KOK/film_araclari.sh" /etc/profile.d/film_araclari.sh; fi

echo "HAZIR: BLENDER=$KOK/blender/blender  MCPREP_DOKU=$KOK/mcprep/$DOKU_YOL  THOMAS_RIG=$KOK/thomas_rig/thomas_rig_legacy.blend  FILM_PAKETLER=$PAKET ($(ls "$PAKET" | tr '\n' ' '))"
