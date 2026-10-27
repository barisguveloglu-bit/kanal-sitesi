#!/bin/bash
# SIMSEK DUELLO SUNUCUSU -- baslatma.                         v7.99.16
#
#   SUNUCU_KOK=~/simsek_sunucu bash addon/sunucu/baslat.sh [--bir-kez]
#
# Her acilistan once dunyanin yedegini alir (yedek/, son YEDEK_SAYI tane).
# Sunucu cokerse 10 sn sonra yeniden acar; 10 dakikada 5 cokmeden sonra
# vazgecer (dongu halinde coken bir dunyayi yedeklerle ezmesin diye).
# Konsolda "stop" yazmak sunucuyu duzgun kapatir ve donguden cikar.
set -uo pipefail

HEDEF=${SUNUCU_KOK:-$HOME/simsek_sunucu}
YEDEK_SAYI=${YEDEK_SAYI:-7}
TEK=0
[ "${1:-}" = "--bir-kez" ] && TEK=1
BURASI="$(cd "$(dirname "$0")" && pwd)"
cd "$HEDEF" || { echo "HATA: $HEDEF yok. Once sunucu_kur.sh" >&2; exit 1; }
[ -x ./bedrock_server ] || { echo "HATA: bedrock_server yok. Once sunucu_kur.sh" >&2; exit 1; }
# Ikinci kopya ayni porta baglanamaz ve ayni dunyayi iki surec yazar.
if python3 -B -c "import sys; sys.path.insert(0, sys.argv[1]); from konsol import calisiyor_mu; sys.exit(0 if calisiyor_mu(sys.argv[2]) else 1)" "$BURASI" "$PWD"; then
  echo "HATA: bu klasorde sunucu zaten calisiyor." >&2
  exit 1
fi

# Ayarlar kurulumdan beri elle gevsetildiyse acmadan soyle.
python3 -B "$BURASI/sunucu_ayar.py" denetle server.properties "$BURASI/sunucu.properties" || {
  echo "UYARI: server.properties siki ayarlardan sapmis. Duzeltmek icin sunucu_kur.sh'i yeniden calistir." >&2
}
DUNYA_ADI=$(python3 -B "$BURASI/sunucu_ayar.py" dunya_adi server.properties)

yedekle() {
  [ -f "worlds/$DUNYA_ADI/level.dat" ] || return 0
  mkdir -p yedek
  ad="yedek/$(echo "$DUNYA_ADI" | tr ' ' '_')_$(date +%Y%m%d_%H%M%S).tar.gz"
  tar -czf "$ad" -C worlds "$DUNYA_ADI" && echo "yedek: $ad"
  ls -1t yedek/*.tar.gz 2>/dev/null | tail -n +$((YEDEK_SAYI + 1)) | xargs -r rm -f
}

cokmeler=()
while true; do
  yedekle
  LD_LIBRARY_PATH=. ./bedrock_server
  kod=$?
  [ "$kod" -eq 0 ] && { echo "sunucu kapandi (stop)"; exit 0; }
  [ "$TEK" -eq 1 ] && exit "$kod"
  simdi=$(date +%s)
  cokmeler+=("$simdi")
  son=()
  for t in "${cokmeler[@]}"; do [ $((simdi - t)) -lt 600 ] && son+=("$t"); done
  cokmeler=("${son[@]}")
  if [ "${#cokmeler[@]}" -ge 5 ]; then
    echo "HATA: 10 dakikada 5 cokme, yeniden acilmiyor. Sebep konsolda ve ContentLog* dosyalarinda." >&2
    exit "$kod"
  fi
  echo "sunucu coktu (kod $kod), 10 sn sonra yeniden aciliyor"
  sleep 10
done
