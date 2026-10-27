#!/bin/bash
# SIMSEK DUELLO SUNUCUSU -- Bedrock Dedicated Server kurulumu.   v7.99.16
#
# Kullanici: "BDS + siki ayarlar + izin listesi tamam, sunucuya basla."
# Rehber: addon/SUNUCU_REHBERI.md
#
#   bash addon/sunucu/sunucu_kur.sh [--hedef KLASOR] [--izin "Ad1,Ad2"]
#                                   [--dunya dunya.mcworld] [--arenasiz]
#   bash addon/sunucu/baslat.sh     (ayni --hedef ya da SUNUCU_KOK)
#
# Ne yapiyor:
#   1. BDS'i RESMI adresten indirir (minecraft.net), SHA-256'sini bu
#      dosyada yazili degerle karsilastirir; tutmazsa KURMAZ.
#   2. Mojang'in server.properties'ini taban alip sunucu.properties'teki
#      siki ayarlari uygular, sonucu denetler.
#   3. Paket hiz siniri (packetlimitconfig.json) koyar.
#   4. Bizim uc paketi (mod, gorunum, oyuncu modeli) kurar ve dunyaya
#      baglar. Surum/kimlik manifest'ten okunur.
#   5. --izin ile verilen Gamertag'leri izin listesine ekler.
#   6. Sunucu kimlik anahtari yoksa uretir (her acilista yeni kimlik
#      oyuncuya "guven" sorusunu yeniden sordurur).
#   7. Duello arenasini kurar (arena_kur.py + arena.komut): gokte kapali
#      kutu, dovus kurallari. --arenasiz ile atlanir.
#
# Kurallar:
#   * BDS ikili dosyalari DEPOYA GIRMEZ; hedef klasor depo DISINDA olmali.
#   * Surum SABIT. Atlamak icin BDS_SURUM ve BDS_SHA256 elle degisir, sonra
#     node addon/test/sunucu.mjs ve gercek acilis denemesi.
#   * Var olan dunya, izin listesi, yetkiler ve anahtar KORUNUR; kurulum
#     tekrar calistirilabilir (guncelleme de ayni komut).
#   * addon/yerel/ OKUNMAZ: oradaki izin kisisel kullanim, sunucu ise
#     paketi baglanan herkese gonderir.
#   * BDS'i kullanmak Minecraft EULA'sini kabul etmek demek:
#     https://www.minecraft.net/eula
set -euo pipefail

BDS_SURUM=1.26.52.3
BDS_SHA256=f6348d84fa714d04ca194f207e89453ca6bba0a1359396475271a52a150471c6
BDS_URL=https://www.minecraft.net/bedrockdedicatedserver/bin-linux/bedrock-server-${BDS_SURUM}.zip
PAKETLER=(Simsek_TNT_ToprakTopu Simsek_Kol_Kaynak Simsek_Oyuncu_Modeli)

BURASI="$(cd "$(dirname "$0")" && pwd)"
ADDON="$(cd "$BURASI/.." && pwd)"
DEPO="$(cd "$ADDON/.." && pwd)"
HEDEF=${SUNUCU_KOK:-$HOME/simsek_sunucu}
IZIN=""
DUNYA=""
ARENA=1
while [ $# -gt 0 ]; do
  case "$1" in
    --hedef) HEDEF="$2"; shift 2 ;;
    --izin)  IZIN="$2"; shift 2 ;;
    --dunya) DUNYA="$2"; shift 2 ;;
    --arenasiz) ARENA=0; shift ;;
    *) echo "bilinmeyen secenek: $1" >&2; exit 2 ;;
  esac
done
# Depo denetimi klasor ACILMADAN: once acip sonra reddetmek depoda bos
# bir klasor birakiyordu (ilk denemede boyle oldu).
HEDEF="$(realpath -m "$HEDEF")"
case "$HEDEF/" in
  "$DEPO"/*) echo "HATA: hedef depo icinde ($HEDEF). BDS depoya girmez; depo disi bir klasor ver." >&2; exit 1 ;;
esac
mkdir -p "$HEDEF"
# Fonksiyon, degisken degil: yolda bosluk olursa bolunmesin.
ayar() { python3 -B "$BURASI/sunucu_ayar.py" "$@"; }
# Calisan sunucunun ikilisini ve dunyasini degistirmek bozar.
if python3 -B -c "import sys; sys.path.insert(0, sys.argv[1]); from konsol import calisiyor_mu; sys.exit(0 if calisiyor_mu(sys.argv[2]) else 1)" "$BURASI" "$HEDEF"; then
  echo "HATA: bu klasorde sunucu calisiyor. Once konsolda stop, sonra kurulum." >&2
  exit 1
fi

# ---- 1. BDS ----
if [ -x "$HEDEF/bedrock_server" ] && [ -f "$HEDEF/.surum_$BDS_SURUM" ]; then
  echo "bds $BDS_SURUM: zaten kurulu"
else
  echo "bds $BDS_SURUM: indiriliyor (minecraft.net)"
  gecici=$(mktemp -d)
  trap 'rm -rf "$gecici"' EXIT
  curl -fsSL -A "Mozilla/5.0" -o "$gecici/bds.zip" "$BDS_URL"
  gercek=$(sha256sum "$gecici/bds.zip" | awk '{print $1}')
  if [ "$gercek" != "$BDS_SHA256" ]; then
    echo "HATA: BDS SHA-256 tutmuyor (beklenen $BDS_SHA256, gelen $gercek). Kurulmadi." >&2
    exit 1
  fi
  echo "bds SHA-256 ayni: ${gercek:0:8}...${gercek: -4}"
  mkdir -p "$gecici/ac"
  python3 -c "import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$gecici/bds.zip" "$gecici/ac"
  # Kullanicinin verisi korunuyor: bu uc dosya yalniz ilk kurulumda gelir.
  for korunan in allowlist.json permissions.json; do
    if [ -f "$HEDEF/$korunan" ]; then rm -f "$gecici/ac/$korunan"; fi
  done
  mv "$gecici/ac/server.properties" "$gecici/ac/server.properties.mojang"
  cp -a "$gecici/ac/." "$HEDEF/"
  chmod +x "$HEDEF/bedrock_server"
  rm -f "$HEDEF"/.surum_*
  touch "$HEDEF/.surum_$BDS_SURUM"
fi

# ---- 2. AYARLAR ----
# Elle yapilmis degisiklik kaybolmasin: sonuc farkliysa eskisi saklanir.
ayar birlestir "$HEDEF/server.properties.mojang" "$BURASI/sunucu.properties" "$HEDEF/server.properties.yeni" >/dev/null
if [ -f "$HEDEF/server.properties" ] && ! cmp -s "$HEDEF/server.properties" "$HEDEF/server.properties.yeni"; then
  cp "$HEDEF/server.properties" "$HEDEF/server.properties.onceki"
  echo "ayarlar: eski server.properties farkliydi, server.properties.onceki olarak saklandi"
fi
mv "$HEDEF/server.properties.yeni" "$HEDEF/server.properties"
ayar denetle "$HEDEF/server.properties" "$BURASI/sunucu.properties"

# ---- 3. PAKET HIZ SINIRI ----
cp "$BURASI/packetlimitconfig.json" "$HEDEF/packetlimitconfig.json"

DUNYA_ADI=$(ayar dunya_adi "$HEDEF/server.properties")

# ---- 4. DUNYA (istege bagli) ----
# Beta API'leri acik bir dunya gerekiyorsa: telefonda deneyi acik bir
# dunya kur, .mcworld olarak disa aktar, --dunya ile ver. Var olan
# dunyanin USTUNE YAZILMAZ.
# Kural tek yerde (sunucu_ayar.py dunya_ac): var olan dunya reddedilir.
if [ -n "$DUNYA" ]; then
  ayar dunya_ac "$DUNYA" "$HEDEF/worlds/$DUNYA_ADI"
  echo "dunya: $DUNYA -> worlds/$DUNYA_ADI"
fi

# ---- 5. PAKETLER ----
ayar paketler "$ADDON" "$HEDEF" "$DUNYA_ADI" "${PAKETLER[@]}" >/dev/null
echo "paketler: ${PAKETLER[*]} -> worlds/$DUNYA_ADI"

# ---- 6. IZIN LISTESI ----
if [ -n "$IZIN" ]; then
  IFS=',' read -r -a adlar <<< "$IZIN"
  ayar izin "$HEDEF/allowlist.json" "${adlar[@]}" >/dev/null
fi
kac=$(python3 -c "import json,sys; print(len(json.load(open(sys.argv[1]))))" "$HEDEF/allowlist.json")
echo "izin listesi: $kac oyuncu"
if [ "$kac" = "0" ]; then
  echo "  DIKKAT: liste bos, KIMSE giremez. Konsoldan: allowlist add <Gamertag>"
fi

# ---- 7. SUNUCU KIMLIGI ----
if [ ! -f "$HEDEF/keys/server_identity_key.pem" ]; then
  if command -v openssl >/dev/null 2>&1; then
    mkdir -p "$HEDEF/keys"
    openssl ecparam -name secp384r1 -genkey -noout -out "$HEDEF/keys/server_identity_key.pem"
    chmod 600 "$HEDEF/keys/server_identity_key.pem"
    echo "sunucu kimligi: uretildi (keys/server_identity_key.pem)"
  else
    echo "sunucu kimligi: openssl yok, uretilmedi (her acilista yeni kimlik)"
  fi
fi

# ---- 8. ARENA ----
if [ "$ARENA" = "1" ]; then
  python3 "$BURASI/arena_kur.py" --hedef "$HEDEF"
else
  echo "arena: atlandi (--arenasiz)"
fi

echo ""
echo "KURULDU: $HEDEF"
echo "  baslat:  SUNUCU_KOK=\"$HEDEF\" bash $BURASI/baslat.sh"
echo "  disaridan baglanti icin TCP 19132 ve UDP 19140-19199 acik olmali"
