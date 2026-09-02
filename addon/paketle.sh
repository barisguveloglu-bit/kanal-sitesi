#!/bin/sh
# Paketleri uretir.
#   SimsekTNT_v34.mcpack   -> behavior pack (TEK BASINA CALISIR)
#   SimsekKol_v34.mcpack   -> resource pack (kol gorunumu + ikonlar)
#   UzakAkraba_v34.mcpack  -> SKIN paketi (giyinme odasina duser)
#   OyuncuModeli_v34.mcpack-> OYUNCU MODELI (maskeyi al, O Sey ol)
#   SimsekTNT_v34.mcaddon  -> UCU BIRDEN, tek dosyada
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
# v4.88: skin paketi. Bedrock skin paketleri .mcaddon icinde de
# ice aktariliyor, yani kullanici TEK dosyaya dokunuyor ve hem
# mod hem skin kuruluyor. Ayrica tek basina da uretiliyor:
# sadece skini isteyen biri onu kurar.
SK="Simsek_Skin"
# v4.90: oyuncunun KENDI modelini degistiren paket. AYRI tutuluyor
# cunku player.entity.json'u ezen iki paket ayni anda calisamaz --
# sorun cikarsa tek dokunusla yalniz bu kapatilir.
OM="Simsek_Oyuncu_Modeli"
# Dosya adindaki surum de manifest'ten TURETILIYOR (v4.41).
# Elle yaziliyordu ve bir kez ayristi: paketin ici v4.41'di ama
# dosya adi SimsekTNT_v440.mcaddon diyordu. Hangi dosyanin yeni
# oldugunu ad'dan anlayamamak, bu is akisindaki en sinir bozucu
# hata sinifi (bkz. v4.40 notu).
S="v$(python3 -c "
import json
d = json.load(open('$K/$BP/manifest.json'))
v = d['header']['version']
# v7.9.8: YAMA NUMARASI da adda. Onceden '%d%d' idi, yani
# 7.9.0 ile 7.9.7 ayni dosya adini aliyordu ("v79") ve
# kullanici hangisini indirdigini ayirt edemiyordu.
print('%d.%d.%d' % (v[0], v[1], v[2]))
")"

# ---- PAKET ADLARI ARTIK BURADA YAZILMIYOR (v7.9.8) ----
# Burasi eskiden manifest'teki adi "<taban> v%d.%d" diye YENIDEN
# yaziyordu. Iki sorun vardi:
#   1. Yama numarasi dusuyordu: 7.9.1'den 7.9.7'ye kadar butun
#      surumler oyunda "v7.9" gorunuyordu.
#   2. Ad IKI yerden geliyordu (kol_uret.py ve burasi) ve
#      buradaki digerini eziyordu.
# Artik tek kaynak kol_uret.py'deki SURUM_NO/PAKETLER.

rm -f "$K"/SimsekTNT_*.mcpack "$K"/SimsekKol_*.mcpack "$K"/SimsekTNT_*.mcaddon
rm -f "$K"/Simsek_*.mcpack "$K"/Simsek_*.mcaddon
rm -f "$K"/UzakAkraba_*.mcpack "$K"/OyuncuModeli_*.mcpack
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
(cd "$K/$BP" && zip -r -X "$K/Simsek_${S}_Mod.mcpack" . \
    -x '__pycache__/*' '*/__pycache__/*' '.*' '*/.*' >/dev/null)
(cd "$K/$RP" && zip -r -X "$K/Simsek_${S}_Gorunum.mcpack" . \
    -x '__pycache__/*' '*/__pycache__/*' '.*' '*/.*' >/dev/null)
(cd "$K/$SK" && zip -r -X "$K/Simsek_${S}_Skin.mcpack" . \
    -x '__pycache__/*' '*/__pycache__/*' '.*' '*/.*' >/dev/null)
(cd "$K/$OM" && zip -r -X "$K/Simsek_${S}_OyuncuModeli.mcpack" . \
    -x '__pycache__/*' '*/__pycache__/*' '.*' '*/.*' >/dev/null)
(cd "$K" && zip -r -X "$K/Simsek_$S.mcaddon" "$BP" "$RP" "$SK" "$OM" >/dev/null)

echo "Olusturuldu:"
echo "  KUR:  Simsek_$S.mcaddon   <-- normalde SADECE bunu kur"
for f in "Simsek_${S}_Mod.mcpack" "Simsek_${S}_Gorunum.mcpack" "Simsek_${S}_Skin.mcpack" \
         "Simsek_${S}_OyuncuModeli.mcpack" "Simsek_$S.mcaddon"; do
  echo "  $f  ($(du -h "$K/$f" | cut -f1))"
done
echo
# ---- KOPYA UYARISI  (v7.10.0) ----
# Kullanici oyunda "skin gorunumleri kopya saptandi" uyarisi
# aldi. Sebebi olculdu: .mcaddon dort paketi de tasiyor, yani
# skin paketi ONUN ICINDE de var; tek basina uretilen
# Simsek_..._Skin.mcpack ile UUID'leri ve surumu BIREBIR AYNI
# (45f22ff1-... / 8333e7a8-...). Ikisi birden ice aktarilinca
# oyun ayni paketi iki kez kuruyor ve kopya diyor.
#
# UUID'lerin sabit olmasi kasitli (bkz. kol_uret.py
# SKIN_UUID_BAS): her uretimde degisseydi giyinme odasinda her
# surumden bir kopya birikirdi. Yani cozum UUID degistirmek
# degil, DOGRU DOSYAYI kurmak.
echo "DIKKAT: .mcaddon skin paketini de iceriyor."
echo "  Ikisini birden kurma -> oyun 'kopya' der (ayni UUID)."
echo "  Sadece skini isteyen Simsek_${S}_Skin.mcpack'i kurar."
echo "  Yeni surumden once ESKI surumun paketlerini sil."
