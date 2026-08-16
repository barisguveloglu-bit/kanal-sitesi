#!/bin/sh
# Behavior pack'i kurulabilir .mcpack olarak paketler.
# Kullanim: sh addon/paketle.sh
set -e
KAYNAK="$(dirname "$0")/Simsek_TNT_ToprakTopu"
CIKTI="$(dirname "$0")/Simsek_TNT_ToprakTopu_v2_5.mcpack"
rm -f "$CIKTI"
cd "$KAYNAK"
zip -r -X "../$(basename "$CIKTI")" manifest.json scripts >/dev/null
echo "Olusturuldu: $CIKTI"
