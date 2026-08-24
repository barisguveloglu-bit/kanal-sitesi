#!/bin/sh
# Paketleri uretir.
#   SimsekTNT_v34.mcpack   -> behavior pack (TEK BASINA CALISIR)
#   SimsekKol_v34.mcpack   -> resource pack (kol gorunumu + ikonlar)
#   SimsekTNT_v34.mcaddon  -> ikisi birden, tek dosyada
# Kullanim: sh addon/paketle.sh
#
# v4.75'ten beri klasor listesi TUTULMUYOR: zip her iki paketin
# icindekilerin tamamini aliyor. Onceki hali elle listeliyordu ve
# dort klasor listede unutulmustu (bkz. asagidaki not).
#
# DIKKAT: kol esyalarinin IKONU ve 3B GORUNUMU resource pack'te.
# Sadece behavior pack kurulursa esyalar calisir ama mor-siyah
# "eksik doku" karesi olarak gorunur.
set -e
K="$(cd "$(dirname "$0")" && pwd)"
BP="Simsek_TNT_ToprakTopu"
RP="Simsek_Kol_Kaynak"
# Dosya adindaki surum de manifest'ten TURETILIYOR (v4.41).
# Elle yaziliyordu ve bir kez ayristi: paketin ici v4.41'di ama
# dosya adi SimsekTNT_v440.mcaddon diyordu. Hangi dosyanin yeni
# oldugunu ad'dan anlayamamak, bu is akisindaki en sinir bozucu
# hata sinifi (bkz. v4.40 notu).
S="v$(python3 -c "
import json
d = json.load(open('$K/$BP/manifest.json'))
v = d['header']['version']
print('%d%d' % (v[0], v[1]))
")"

# ---- PAKET ADINA SURUMU YAZ ----
# Neden: Bedrock'ta davranis paketi ile kaynak paketi AYRI iki
# pakettir ve dunyaya ayri ayri uygulanir. Biri guncellenip
# digeri eski kalirsa ortaya "isimler dogru ama skinler yanlis"
# gibi anlasilmaz bir durum cikiyor -- v4.39'da tam bu yasandi
# ve dosyada hata var sanildi.
#
# Artik surum paketin ADINDA: dunya ayarlarindaki paket
# listesine bakinca hangi surumun etkin oldugu okunuyor.
# Ad manifest'teki SURUMDEN uretiliyor, elle yazilmiyor.
python3 - "$K" <<'PYEOF'
import json, sys, os, re
kok = sys.argv[1]
for yol, taban in (("Simsek_TNT_ToprakTopu", "Simsek TNT ve Toprak Topu"),
                   ("Simsek_Kol_Kaynak", "Simsek Kol Gorunumleri")):
    p = os.path.join(kok, yol, "manifest.json")
    d = json.load(open(p, encoding="utf-8"))
    s = d["header"]["version"]
    d["header"]["name"] = "%s v%d.%d" % (taban, s[0], s[1])
    json.dump(d, open(p, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print("  ad:", d["header"]["name"])
PYEOF

rm -f "$K"/SimsekTNT_*.mcpack "$K"/SimsekKol_*.mcpack "$K"/SimsekTNT_*.mcaddon
rm -f "$K"/*_v3.mcpack "$K"/Simsek_TNT_v3.mcaddon

# ---- ICERIK ARTIK ELLE YAZILMIYOR (v4.75) ----
# Ustteki DIKKAT notu "yeni klasor eklersen buraya da ekle"
# diyordu ve tam olarak o unutuldu -- birden fazla kez:
#   BP .mcpack'te yok:  blocks, features, feature_rules, loot_tables
#   RP .mcpack'te yok:  blocks.json, render_controllers
# .mcaddon klasorun tamamini zipledigi icin oradaki paketler
# saglamdi; sorun yalnizca TEK BASINA kurulan .mcpack'lerdeydi
# ve "bazen calisiyor bazen calismiyor" gibi gorunuyordu.
#
# Cozum: liste tutma, klasorun ICINDEKI her seyi al. Uretim
# artiklari (__pycache__, gizli dosyalar) disarida.
(cd "$K/$BP" && zip -r -X "$K/SimsekTNT_$S.mcpack" . \
    -x '__pycache__/*' '*/__pycache__/*' '.*' '*/.*' >/dev/null)
(cd "$K/$RP" && zip -r -X "$K/SimsekKol_$S.mcpack" . \
    -x '__pycache__/*' '*/__pycache__/*' '.*' '*/.*' >/dev/null)
(cd "$K" && zip -r -X "$K/SimsekTNT_$S.mcaddon" "$BP" "$RP" >/dev/null)

echo "Olusturuldu:"
for f in "SimsekTNT_$S.mcpack" "SimsekKol_$S.mcpack" "SimsekTNT_$S.mcaddon"; do
  echo "  $f  ($(du -h "$K/$f" | cut -f1))"
done
