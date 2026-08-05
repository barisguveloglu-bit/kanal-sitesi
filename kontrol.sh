#!/usr/bin/env bash
#
# Kanlı Göz — bütünlük ve bağlam denetimi.
#
# Bu depoda derleme adımı ve test altyapısı yok. "Testleri çalıştır"ın
# karşılığı bu betik: elle güncellenmesi gereken şeylerin (menü, sitemap,
# betik sırası, LORE ↔ data senkronu, HARITA.md satır numaraları) hâlâ
# tuttuğunu denetler.
#
# Bağımlılık yok: bash 4+, grep, sed. Kullanım:  ./kontrol.sh
#
set -uo pipefail
cd "$(dirname "$0")" || exit 1

if [ "${BASH_VERSINFO[0]:-0}" -lt 4 ]; then
  echo "bash 4 veya üstü gerekiyor (mevcut: ${BASH_VERSION:-bilinmiyor})"
  exit 1
fi

HATA=0
UYARI=0

basarili() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
hata()     { printf '  \033[31m✗\033[0m %s\n' "$1"; HATA=$((HATA + 1)); }
uyari()    { printf '  \033[33m!\033[0m %s\n' "$1"; UYARI=$((UYARI + 1)); }
baslik()   { printf '\n\033[1m%s\033[0m\n' "$1"; }

# Bir HTML dosyasındaki <nav class="menu"> bloğunun bağlantıları
menu_linkleri() {
  sed -n '/<nav class="menu"/,/<\/nav>/p' "$1" |
    grep -o 'href="[^"]*"' | sed 's/href="//; s/"$//' | sort -u
}

# data-bir-sey  ->  dataset.birSey  (app.js böyle okuyor)
camel_yap() {
  local giris=$1 sonuc="" ilk=1 parca
  local IFS='-'
  for parca in $giris; do
    if [ "$ilk" -eq 1 ]; then sonuc=$parca; ilk=0; else sonuc="$sonuc${parca^}"; fi
  done
  printf '%s' "$sonuc"
}


baslik "1. Menü tutarlılığı"
# Menü her HTML dosyasında elle yazılı. Bir sayfada eksik kalırsa ziyaretçi
# o sayfada mahsur kalır — bu yüzden bütün menüler birebir aynı olmalı.
olcut=$(menu_linkleri index.html)
if [ -z "$olcut" ]; then
  hata "index.html içinde <nav class=\"menu\"> bulunamadı"
else
  menulu=0
  for dosya in *.html; do
    grep -q '<nav class="menu"' "$dosya" || continue
    menulu=$((menulu + 1))
    if [ "$(menu_linkleri "$dosya")" != "$olcut" ]; then
      hata "$dosya menüsü index.html ile aynı değil:"
      diff <(echo "$olcut") <(menu_linkleri "$dosya") | sed 's/^/      /'
    fi
  done
  basarili "$menulu dosyada menü aynı ($(echo "$olcut" | wc -l | tr -d ' ') bağlantı)"
  for dosya in *.html; do
    grep -q '<nav class="menu"' "$dosya" && continue
    case "$dosya" in
      404.html) basarili "404.html menüsüz (bilerek — stili kendi içinde)" ;;
      *) uyari "$dosya içinde menü yok" ;;
    esac
  done
fi


baslik "2. sitemap.xml kapsamı"
# Menüdeki her sayfa sitemap'te olmalı. gizli.html bilerek yok.
for hedef in $olcut; do
  case "$hedef" in
    index.html) desen="kanal-sitesi/<" ;;
    *)          desen="$hedef" ;;
  esac
  if grep -q "$desen" sitemap.xml; then
    basarili "$hedef sitemap'te"
  else
    hata "$hedef sitemap.xml içinde yok"
  fi
done
if grep -q 'gizli.html' sitemap.xml; then
  hata "gizli.html sitemap'te — orada olmamalı, sayfa bilerek gizli"
else
  basarili "gizli.html sitemap dışında (bilerek)"
fi


baslik "3. Betik sırası ve defer"
# data.js -> app.js -> animasyon.js sırası bozulursa site sessizce kırılır:
# app.js veriyi bulamaz, animasyon.js basılmamış içeriği gözler.
for dosya in *.html; do
  betikler=$(grep -o '<script[^>]*src="assets/js/[a-z]*\.js"[^>]*>' "$dosya")
  [ -z "$betikler" ] && continue

  eksik_defer=$(echo "$betikler" | grep -v 'defer' | grep -o 'js/[a-z]*\.js' | tr '\n' ' ')
  if [ -n "$eksik_defer" ]; then
    hata "$dosya: defer yok → $eksik_defer"
  fi

  sira=$(echo "$betikler" | sed -n 's/.*js\/\([a-z]*\.js\).*/\1/p' | tr '\n' ' ')
  yer() { echo "$sira" | tr ' ' '\n' | grep -n "^$1$" | cut -d: -f1; }

  d=$(yer data.js); a=$(yer app.js); n=$(yer animasyon.js)
  if [ -n "$d" ] && [ -n "$a" ] && [ "$d" -gt "$a" ]; then
    hata "$dosya: data.js, app.js'ten sonra yükleniyor"
  elif [ -n "$a" ] && [ -n "$n" ] && [ "$a" -gt "$n" ]; then
    hata "$dosya: animasyon.js, app.js'ten önce yükleniyor"
  else
    basarili "$dosya: $sira"
  fi
done


baslik "4. data-* bağlama noktaları"
# HTML iskelet, içeriği app.js data-* noktalarına basıyor. İki yönde de
# sessiz kırılma olur, ikisini de denetliyoruz:
#   A) HTML'de var, kimse okumuyor  -> öznitelik boşuna duruyor
#   B) JS arıyor, hiçbir yerde yok  -> o bölüm sessizce boş kalır
# Not: değersiz öznitelikler de sayılıyor (<div data-durum> gibi).
# Sınır: app.js hem HTML'deki noktayı arayıp hem kendi şablonunda aynı
# özniteliği üretiyorsa (data-durum, data-spoiler), B yönü onu "üretiliyor"
# sayar ve HTML'den silinmesini yakalayamaz.
olu=0

for oznitelik in $(grep -ho 'data-[a-z-]*' ./*.html | sort -u); do
  camel=$(camel_yap "${oznitelik#data-}")
  if grep -qr -- "$oznitelik" assets/js assets/css ||
     grep -qr "dataset\.$camel" assets/js; then
    continue
  fi
  hata "$oznitelik HTML'de var ama JS/CSS'te karşılığı yok (ölü bağlama)"
  olu=$((olu + 1))
done

for secici in $(grep -ho '\[data-[a-z-]*\]' assets/js/*.js | tr -d '[]' | sort -u); do
  # HTML'de duruyorsa tamam
  grep -qh -- "$secici" ./*.html && continue
  # ya da JS kendi şablonunda üretiyorsa tamam (seçici geçişlerinden fazla varsa)
  toplam=$(grep -ho -- "$secici" assets/js/*.js | wc -l)
  secici_sayisi=$(grep -ho -- "\[$secici\]" assets/js/*.js | wc -l)
  [ "$toplam" -gt "$secici_sayisi" ] && continue
  hata "$secici JS tarafından aranıyor ama hiçbir HTML'de ve şablonda yok — o bölüm sessizce boş kalır"
  olu=$((olu + 1))
done

[ "$olu" -eq 0 ] && basarili "bütün data-* noktalarının iki yönde de karşılığı var"


baslik "5. Değişmezler"
if grep -q '^\[hidden\] { display: none !important; }' assets/css/style.css; then
  basarili "[hidden] kuralı duruyor"
else
  hata "[hidden] { display: none !important; } kuralı kayıp — gizlenen içerik geri gelmez"
fi

if grep -q 'focus-visible' assets/css/style.css; then
  basarili "odak halkası (:focus-visible) duruyor"
else
  hata ":focus-visible kuralı kayıp — klavye kullanıcısı nerede olduğunu göremez"
fi

# Meşru dış adresler var: <link rel="canonical">, og:/twitter: meta etiketleri
# ve YouTube bağlantıları. Yasak olan, tarayıcının DIŞARIDAN YÜKLEDİĞİ kaynak:
# stylesheet, betik, görsel, font.
dis=0
while IFS= read -r bulgu; do
  [ -z "$bulgu" ] && continue
  hata "dış kaynak: $bulgu"
  dis=$((dis + 1))
done < <(
  grep -hoE '<link[^>]*rel="(stylesheet|preconnect|preload|dns-prefetch)"[^>]*href="https?://[^"]*"' ./*.html
  grep -hoE '<link[^>]*href="https?://[^"]*"[^>]*rel="(stylesheet|preconnect|preload|dns-prefetch)"' ./*.html
  grep -hoE '<(script|img|iframe|source)[^>]*src="https?://[^"]*"' ./*.html
  grep -hoE '@import[^;]*https?://[^;]*' assets/css/*.css
  grep -hoE 'url\(\s*["'"'"']?https?://[^)]*\)' assets/css/*.css
)
[ "$dis" -eq 0 ] && basarili "dış bağımlılık yok (font, betik, stil, görsel — hepsi yerel)"


baslik "6. LORE.md ↔ data.js senkronu"
# Canon ile siteye basılan veri ayrışırsa site yalan söyler.
say_blok() {
  sed -n "/^const $1 = /,/^\(\]\|}\);*$/p" assets/js/data.js | grep -c "$2"
}
karakter_veri=$(say_blok KARAKTERLER '^    id:')
karakter_lore=$(sed -n '/^## 4\. Karakterler/,/^## 5\./p' LORE.md | grep -c '^### ')
if [ "$karakter_veri" -eq "$karakter_lore" ]; then
  basarili "karakter sayısı tutuyor ($karakter_veri)"
else
  hata "karakter sayısı ayrışmış: data.js=$karakter_veri, LORE.md §4=$karakter_lore"
fi

il=$(say_blok IL_DEREBEYLERI 'plaka:')
if [ "$il" -eq 81 ]; then
  basarili "81 il derebeyi tamam"
else
  hata "il derebeyi sayısı $il — 81 olmalı"
fi

komutan=$(say_blok KOMUTANLAR '^    ad:')
if [ "$komutan" -eq 3 ]; then
  basarili "3 komutan derebeyi tamam"
else
  hata "komutan sayısı $komutan — 3 olmalı"
fi

kademe_veri=$(say_blok IRADE_KADEMELERI '^    kademe:')
kademe_lore=$(sed -n '/^## 3\. İrade Sistemi/,/^## 4\./p' LORE.md | grep -c '^| [0-9] |')
if [ "$kademe_veri" -eq "$kademe_lore" ]; then
  basarili "irade kademesi sayısı tutuyor ($kademe_veri)"
else
  hata "irade kademesi ayrışmış: data.js=$kademe_veri, LORE.md §3=$kademe_lore"
fi


baslik "7. HARITA.md satır numaraları"
# Harita eskirse ajan yanlış yeri okur — bu, haritasız olmaktan kötüdür.
dosya=""
capa=0; capa_hata=0
while IFS= read -r satir; do
  if [[ $satir == "<!-- kontrol: "* ]]; then
    dosya=${satir#<!-- kontrol: }
    dosya=${dosya% -->}
    continue
  fi
  [ -z "$dosya" ] && continue
  [[ $satir == "|"* ]] || continue

  desen=$(printf '%s' "$satir" | awk -F'|' '{gsub(/`/,"",$2); gsub(/^ +| +$/,"",$2); print $2}')
  bas=$(printf '%s' "$satir" | awk -F'|' '{split($3,a,"-"); gsub(/[^0-9]/,"",a[1]); print a[1]}')
  [ -z "$bas" ] && continue
  [ -z "$desen" ] && continue

  capa=$((capa + 1))
  gercek=$(sed -n "${bas}p" "$dosya")
  if [[ $gercek != *"$desen"* ]]; then
    hata "HARITA.md: $dosya:$bas artık \"$desen\" değil → \"$(echo "$gercek" | cut -c1-50)\""
    capa_hata=$((capa_hata + 1))
  fi
done < HARITA.md
if [ "$capa_hata" -eq 0 ]; then
  basarili "$capa satır çapasının hepsi doğru yeri gösteriyor"
fi


baslik "8. Eksik içerik (sahte içerik üretmeden raporla)"
if grep -q 'baslangic: { kimlik: "", baglanti: "", baslik: "" }' assets/js/data.js; then
  uyari "VIDEOLAR boş — ana sayfadaki video bölümleri hiç basılmıyor (data.js:32-49)"
fi
if grep -q 'DURUM: TASLAK' LORE.md; then
  uyari "İrade kademeleri hâlâ taslak (LORE.md:93)"
fi
isimsiz=$(grep -c 'ad: null' assets/js/data.js)
if [ "$isimsiz" -gt 0 ]; then
  uyari "$isimsiz derebeyinin adı henüz yok"
fi


printf '\n'
if [ "$HATA" -eq 0 ]; then
  printf '\033[32mTemiz.\033[0m %s uyarı var (uyarılar hata değil — eksik içeriği hatırlatıyor).\n' "$UYARI"
  exit 0
else
  printf '\033[31m%s hata\033[0m, %s uyarı.\n' "$HATA" "$UYARI"
  exit 1
fi
