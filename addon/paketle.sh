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
# v7.97.2: Iron Man uyumlu oyuncu modeli. Klasorde yalniz manifest
# ve birlesik varlik tanimi var; asagida OM'nin USTUNE bindiriliyor.
OMIM="Simsek_Oyuncu_Modeli_IronMan"
# v7.85: gokyuzu paketi. dunya_uret.py uretiyor, .mcaddon'a
# GIRMIYOR (sebebi asagida).
GK="Simsek_Efsane_Gokyuzu"
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
rm -f "$K"/Simsek_*.mctemplate

# ---- GOKYUZU PAKETI ve DUNYA DOSYASI  (v7.85) ----
# Ustteki rm ikisini de siliyor; uretimi BURADA, zipten ONCE.
# Sirasi onemli: dunya_uret.py paketleri sablonun icine
# kopyaliyor, yani manifestler kesinlesmis olmali (kol_uret.py
# zaten daha once calisiyor).
#
# Tek komutla ureme kurali: paketle.sh calistirildiginda
# ortada eksik dosya kalmasin. Ilk yazilista rm burada,
# uretim baska yerdeydi ve test "dosya yok" diye dustu.
python3 "$K/dunya_uret.py"

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

# ---- IRON MAN UYUMLU OYUNCU MODELI  (v7.97.2) ----
# .mcaddon'a KONMUYOR, bilerek. Birlesik tanim Iron Man paketindeki
# geometri/denetleyici/malzemelere dayaniyor; v7.96.2-v7.97.1 arasi
# temiz pakete yaziliyordu ve Iron Man KURULU OLMAYAN oyuncu ucuncu
# sahista GORUNMEZ oldu. Temiz paket artik yalniz kendi dosyalarimiza
# dayaniyor; Iron Man'i kuran bunu, normal Oyuncu Modeli YERINE kurar.
if [ -d "$K/$OMIM" ]; then
  IMSAHNE="$(mktemp -d)"
  cp -R "$K/$OM/." "$IMSAHNE/"
  cp -R "$K/$OMIM/." "$IMSAHNE/"      # manifest + birlesik tanim ezer
  (cd "$IMSAHNE" && zip -r -X "$K/Simsek_${S}_OyuncuModeli_IronMan.mcpack" . \
      -x '__pycache__/*' '*/__pycache__/*' '.*' '*/.*' >/dev/null)
  rm -rf "$IMSAHNE"
fi

# ---- EFSANENIN GOGU + EFSANENIN DUNYASI  (v7.85) ----
# Gokyuzu paketi .mcaddon'a KONMUYOR, bilerek: .mcaddon'daki
# her paket kurulur kurulmaz etkin oluyor ve bu paket
# GOKYUZUNU boyuyor -- modu kuran herkesin butun dunyasi
# degisirdi. Bu depoda oyuncunun dunyasini geri alinamaz
# bicimde degistiren sey alinmiyor (REFERANS_BORALO_V5.md,
# biyom ezmesi maddesi). Tek basina .mcpack olarak cikiyor:
# isteyen istedigi dunyada aciyor.
#
# Dunya dosyasi ayrica uretiliyor ve gokyuzu paketini ZATEN
# icinde tasiyor, yani o dunyada elle acmaya gerek yok.
if [ -d "$K/$GK" ]; then
  (cd "$K/$GK" && zip -r -X "$K/Simsek_${S}_Gokyuzu.mcpack" . \
      -x '__pycache__/*' '*/__pycache__/*' '.*' '*/.*' >/dev/null)
fi

# ---- YEREL VARLIK KOLU  (v7.94.9) ----
# addon/yerel/<PaketAdi>/ varsa, icerigi o paketin uzerine
# BINDIRILEREK ayri bir "_Yerel" paketi uretilir. Temiz paketler
# DEGISMEZ -- depodan uretilen cikti yeniden uretilebilir kalir.
#
# Neden ayri: buradaki varliklar dis modlardan turetilmis olabilir.
# Kullanici yapimcilardan (Bit & Byte, Mr. Nido) KISISEL KULLANIM
# izni aldi; ikisinin de sarti "dosyayi kimseye vermemek". Bu yuzden
# yerel/ .gitignore'da ve uretilen _Yerel paketi de paylasilmaz.
# Klasor yoksa bu blok hicbir sey yapmaz ve hicbir sey yazmaz.
YEREL="$K/yerel"
if [ -d "$YEREL" ]; then
  SAHNE="$(mktemp -d)"
  trap 'rm -rf "$SAHNE"' EXIT
  uretildi=""
  for paket in "$BP" "$RP" "$OM"; do
    [ -d "$YEREL/$paket" ] || continue
    rm -rf "$SAHNE/$paket"
    cp -R "$K/$paket" "$SAHNE/$paket"
    # -R ile bindirme: yereldeki dosya ayni addaki depo dosyasini ezer,
    # yeni dosyalar eklenir, dokunulmayanlar depodan kalir.
    cp -R "$YEREL/$paket/." "$SAHNE/$paket/"
    cikti="$K/Simsek_${S}_Yerel_${paket}.mcpack"
    rm -f "$cikti"
    (cd "$SAHNE/$paket" && zip -r -X "$cikti" . \
        -x '__pycache__/*' '*/__pycache__/*' '.*' '*/.*' >/dev/null)
    uretildi="$uretildi $paket"
  done
  if [ -n "$uretildi" ]; then
    echo "YEREL kol calisti ->$uretildi"
    echo "  Uretilen _Yerel paketleri PAYLASILMAZ (izin sarti)."
    echo
  fi
fi

echo "Olusturuldu:"
echo "  KUR:  Simsek_$S.mcaddon   <-- normalde SADECE bunu kur"
for f in "Simsek_${S}_Mod.mcpack" "Simsek_${S}_Gorunum.mcpack" "Simsek_${S}_Skin.mcpack" \
         "Simsek_${S}_OyuncuModeli.mcpack" "Simsek_$S.mcaddon" \
         "Simsek_${S}_Gokyuzu.mcpack" "Simsek_${S}_OyuncuModeli_IronMan.mcpack"; do
  [ -f "$K/$f" ] && echo "  $f  ($(du -h "$K/$f" | cut -f1))"
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
echo
echo "IRON MAN: Simsek_${S}_OyuncuModeli_IronMan.mcpack YALNIZ Iron Man"
echo "  add-on'u kuruluysa. Normal Oyuncu Modeli'nin YERINE etkinlestir."
echo "  Iron Man yokken bunu acarsan ucuncu sahista gorunmez olursun."
