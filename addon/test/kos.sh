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
