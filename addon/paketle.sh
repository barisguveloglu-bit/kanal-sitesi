#!/bin/sh
# Paketleri uretir.
#   Simsek_TNT_ToprakTopu_v3.mcpack  -> behavior pack (TEK BASINA CALISIR)
#   Simsek_Kol_Kaynak_v3.mcpack      -> resource pack (istege bagli animasyonlar)
#   Simsek_TNT_v3.mcaddon            -> ikisi birden, tek dosyada
# Kullanim: sh addon/paketle.sh
set -e
K="$(cd "$(dirname "$0")" && pwd)"
BP="Simsek_TNT_ToprakTopu"
RP="Simsek_Kol_Kaynak"

rm -f "$K/${BP}_v3.mcpack" "$K/${RP}_v3.mcpack" "$K/Simsek_TNT_v3.mcaddon"

(cd "$K/$BP" && zip -r -X "$K/${BP}_v3.mcpack" manifest.json scripts items >/dev/null)
(cd "$K/$RP" && zip -r -X "$K/${RP}_v3.mcpack" manifest.json animations models attachables textures >/dev/null)
(cd "$K" && zip -r -X "$K/Simsek_TNT_v3.mcaddon" "$BP" "$RP" >/dev/null)

echo "Olusturuldu:"
for f in "${BP}_v3.mcpack" "${RP}_v3.mcpack" "Simsek_TNT_v3.mcaddon"; do
  echo "  $f  ($(du -h "$K/$f" | cut -f1))"
done
