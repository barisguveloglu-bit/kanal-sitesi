#!/bin/sh
# Paketleri uretir.
#   SimsekTNT_v34.mcpack   -> behavior pack (TEK BASINA CALISIR)
#   SimsekKol_v34.mcpack   -> resource pack (kol gorunumu + ikonlar)
#   SimsekTNT_v34.mcaddon  -> ikisi birden, tek dosyada
# Kullanim: sh addon/paketle.sh
#
# DIKKAT: yeni bir KLASOR eklersen asagidaki zip satirlarina da
# ekle. v4.22'de bot varligi (entities/ ve entity/) unutulsaydi
# pakete hic girmeyecekti ve oyunda "bot kayitli degil" derdi.
#
# DIKKAT: kol esyalarinin IKONU ve 3B GORUNUMU resource pack'te.
# Sadece behavior pack kurulursa esyalar calisir ama mor-siyah
# "eksik doku" karesi olarak gorunur.
set -e
K="$(cd "$(dirname "$0")" && pwd)"
BP="Simsek_TNT_ToprakTopu"
RP="Simsek_Kol_Kaynak"
S="v431"

rm -f "$K"/SimsekTNT_*.mcpack "$K"/SimsekKol_*.mcpack "$K"/SimsekTNT_*.mcaddon
rm -f "$K"/*_v3.mcpack "$K"/Simsek_TNT_v3.mcaddon

(cd "$K/$BP" && zip -r -X "$K/SimsekTNT_$S.mcpack" manifest.json pack_icon.png scripts items entities >/dev/null)
(cd "$K/$RP" && zip -r -X "$K/SimsekKol_$S.mcpack" \
    manifest.json pack_icon.png animations models attachables textures texts entity >/dev/null)
(cd "$K" && zip -r -X "$K/SimsekTNT_$S.mcaddon" "$BP" "$RP" >/dev/null)

echo "Olusturuldu:"
for f in "SimsekTNT_$S.mcpack" "SimsekKol_$S.mcpack" "SimsekTNT_$S.mcaddon"; do
  echo "  $f  ($(du -h "$K/$f" | cut -f1))"
done
