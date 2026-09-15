#!/bin/sh
# Butun testleri calistirir.
#
# DIKKAT -- ILK ADIM ESITLEME. pack/ gercek kaynagin KOPYASI
# (symlink olamaz: node symlink'i gercek yola cozunce
# node_modules'u bulamiyor). Kopya bayatlarsa testler artik
# gercek kodu sinamaz, yesil yanar ve hicbir sey soylemez --
# bu depoda en pahali hata bicimi bu. O yuzden her kosuda
# bastan kopyalaniyor.
set -e
D="$(cd "$(dirname "$0")" && pwd)"
# v7.9.3: MUTLAK YOL KALDIRILDI. Takim depoya alinirken
# "/home/user/kanal-sitesi/..." diye sabit bir yol tasiyordu;
# baska bir makinede (ya da baska bir klasorde) hicbir sey
# bulamazdi. Artik kos.sh kendi konumundan turetiyor:
# addon/test/ -> addon/Simsek_TNT_ToprakTopu/scripts
KAYNAK="$(cd "$D/.." && pwd)/Simsek_TNT_ToprakTopu/scripts"

# ---- ON KONTROL: DIS BAGIMLILIKLAR  (v7.94.1) ----
# 20 test dosyasi PNG olcuyor ve bunu python3 + Pillow (PIL) ile
# yapiyor. Pillow KURULU DEGILSE dokuz test cokuyordu ve ekrana
# dokulen sey bir Node yigin izi oluyordu:
#   "ModuleNotFoundError: No module named 'PIL'"
# Bu yigin izi yanlis yere baktiriyor -- hatanin eklenti kodunda
# oldugu saniliyor, oysa eksik olan tek sey bir python paketi.
# Bagimlilik hicbir yerde de yazili degildi.
#
# Bu yuzden kosudan ONCE bakiliyor. Eksikse takim HIC baslamiyor
# ve ne yapilacagini tek satirda soyluyor.
#
# ATLAMA YOK, bilerek: eksik bagimliligi "o testleri gec" diye
# cozmek bu depodaki en pahali hata bicimini (yesil yanan ama
# hicbir sey olcmeyen takim) geri getirirdi. Eksikse duruluyor.
EKSIK=""
command -v node >/dev/null 2>&1 || EKSIK="$EKSIK node"
command -v python3 >/dev/null 2>&1 || EKSIK="$EKSIK python3"
if command -v python3 >/dev/null 2>&1; then
  python3 -c "import PIL" >/dev/null 2>&1 || EKSIK="$EKSIK Pillow(PIL)"
fi
if [ -n "$EKSIK" ]; then
  echo "TAKIM BASLAMADI -- eksik bagimlilik:$EKSIK" >&2
  echo "" >&2
  echo "  Pillow icin:  python3 -m pip install Pillow" >&2
  echo "" >&2
  echo "20 test dosyasi PNG olcuyor ve bunu PIL ile yapiyor." >&2
  echo "Eksikken kosmak dokuz sahte hata uretir; bu yuzden duruldu." >&2
  exit 1
fi

rm -rf "$D/pack"
cp -r "$KAYNAK" "$D/pack"

cd "$D"
KALDI=0
for f in *.mjs; do
  case "$f" in
    # tekel.mjs (v7.9.3): tek bir SAYI yaziyor (tick basina en
    # fazla blok islemi), hukum vermiyor -- yani gecip gecmedigi
    # diye bir sey yok. Olcum betikleri listesine alindi. Diger
    # sekiz "sessiz" dosyaya cikis kodu EKLENDI, cunku onlar
    # gercekten hukum veriyordu.
    dunya.mjs|eski.mjs|olcum.mjs|butce_tara.mjs|sure.mjs|ucus_olc.mjs|tekel.mjs) continue ;;
  esac
  # zirh_menu.mjs MENUYU GERCEKTEN aciyor: @minecraft/server-ui
  # taklidini yalniz onun icin aciyoruz. Digerlerinde taklit
  # bilerek KAPALI -- menu.mjs ve gunes.mjs "modul yokken menu
  # kendini kapatiyor mu" guvencesini sinliyor.
  case "$f" in
    # Menuyu GERCEKTEN acan iki dosya. Digerlerinde taklit
    # bilerek KAPALI -- menu.mjs ve gunes.mjs "modul yokken
    # menu kendini kapatiyor mu" guvencesini sinliyor.
    zirh_menu.mjs|tarama.mjs) MENU=1 ;;
    *)                        MENU=0 ;;
  esac
  if SIMSEK_MENU="$MENU" node "$f" >/tmp/sim_son.txt 2>&1; then
    printf '  ✓ %s\n' "$f"
  else
    printf '  ✗ %s\n' "$f"
    tail -25 /tmp/sim_son.txt | sed 's/^/      /'
    KALDI=$((KALDI+1))
  fi
done
echo "----"
if [ "$KALDI" -eq 0 ]; then echo "hepsi gecti"; else echo "KALAN: $KALDI"; exit 1; fi
