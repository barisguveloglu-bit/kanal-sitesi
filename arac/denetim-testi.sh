#!/usr/bin/env bash
#
# KANLI GÖZ — Denetimin denetimi
# ---------------------------------------------------------------
# denetim.mjs gerçekten iş görüyor mu? Bu betik depoyu geçici bir yere
# kopyalar, kasten bozar ve denetimin bozukluğu yakalayıp yakalamadığına
# bakar. Kaynak depoya dokunmaz.
#
#     bash arac/denetim-testi.sh
#
# NEDEN VAR: Hiçbir şey yakalamayan bir denetim, olmayan denetimden daha
# tehlikelidir — çünkü güven verir. Denetime yeni kural eklendiğinde buraya
# da bir vaka eklenmeli.

set -uo pipefail

KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CALISMA="$(mktemp -d)"
trap 'rm -rf "$CALISMA"' EXIT

cp -r "$KOK/." "$CALISMA/"
rm -rf "$CALISMA/.git"
cd "$CALISMA" || exit 1

gecen=0
kalan=0

# Bozulmuş dosyaları asıllarıyla değiştirip temiz duruma döner
tazele() {
  cp "$KOK/assets/js/data.js" assets/js/data.js
  cp "$KOK/index.html" index.html
  cp "$KOK/sitemap.xml" sitemap.xml
  cp "$KOK/LORE.md" LORE.md
}

# vaka <ad> <beklenen metin parçası> <bozma komutu>
vaka() {
  local ad="$1" beklenen="$2" bozma="$3"

  tazele
  eval "$bozma"

  local cikti
  cikti="$(node arac/denetim.mjs 2>&1)"

  if [[ "$cikti" == *"$beklenen"* ]]; then
    printf '  ✓ %s\n' "$ad"
    gecen=$((gecen + 1))
  else
    printf '  ✕ %s\n' "$ad"
    printf '      beklenen: %s\n' "$beklenen"
    printf '      denetim bunu yakalamadı\n'
    kalan=$((kalan + 1))
  fi
}

printf '\n═══ DENETİMİN DENETİMİ ═══\n\n'

vaka "Eksik il yakalanıyor" \
  "80 kayıt içeriyor, 81 olmalı" \
  'perl -0pi -e '"'"'s/  \{ plaka: 45, il: "Manisa".*?\},\n//s'"'"' assets/js/data.js'

vaka "Cephe dengesizliği yakalanıyor" \
  "27 olmalı" \
  'sed -i '"'"'s/il: "Bursa", komutan: "bati"/il: "Bursa", komutan: "orta"/'"'"' assets/js/data.js'

vaka "LORE ile ayrışan derebeyi adı yakalanıyor" \
  'data.js "Odysseus" diyor' \
  'sed -i '"'"'s/ad: "Akhilleus"/ad: "Odysseus"/'"'"' assets/js/data.js'

vaka "Komutanın tır değişimi yakalanıyor" \
  "LORE üç komutanın da 3 tır olduğunu söylüyor" \
  'perl -0pi -e '"'"'s/(id: "bati",.*?)tir: 3,/${1}tir: 5,/s'"'"' assets/js/data.js'

vaka "Etiket ile tır uyuşmazlığı yakalanıyor" \
  'ama tır değeri' \
  'sed -i '"'"'s/gucEtiketi: "4 tır",/gucEtiketi: "9 tır",/'"'"' assets/js/data.js'

vaka "Tanımsız icraat karakteri yakalanıyor" \
  'tanımsız karakter: "Hayalet Adam"' \
  'perl -0pi -e '"'"'s/  \{\n    karakter: "Nemesis",/  {\n    karakter: "Hayalet Adam",\n    taraf: "kotu",\n    liste: [{ ne: "Uyduruldu." }],\n  },\n  {\n    karakter: "Nemesis",/s'"'"' assets/js/data.js'

vaka "Geçersiz irade örneği yakalanıyor" \
  'böyle bir karakter yok' \
  'sed -i '"'"'s/ornek: "Kameracı Barış"/ornek: "Kayıp Kahraman"/'"'"' assets/js/data.js'

vaka "Menü farklılaşması yakalanıyor" \
  "Menü sayfalar arasında farklılaşmış" \
  'perl -0pi -e '"'"'s|<a href="mafya.html">Mafya Haritası</a>\n||'"'"' index.html'

vaka "Sitemap eksiği yakalanıyor" \
  "irade.html sitemap.xml içinde yok" \
  'perl -0pi -e '"'"'s|<url><loc>[^<]*irade\.html</loc><priority>[^<]*</priority></url>\n||'"'"' sitemap.xml'

vaka "Kırık iç bağlantı yakalanıyor" \
  "kırık bağlantı" \
  'sed -i '"'"'s|href="karakterler.html"|href="kahramanlar.html"|'"'"' index.html'

vaka "Okunamayan LORE tablosu sessizce geçilmiyor" \
  "bulunamadı" \
  'sed -i '"'"'s/^#### Batı Cephesi.*/#### (silindi)/'"'"' LORE.md'

# Bozulmamış depo temiz geçmeli — yanlış alarm üretmediğini doğrular
tazele
printf '\n'
if node arac/denetim.mjs >/dev/null 2>&1; then
  printf '  ✓ Bozulmamış depo temiz geçiyor (yanlış alarm yok)\n'
  gecen=$((gecen + 1))
else
  printf '  ✕ Bozulmamış depo hata veriyor — denetim yanlış alarm üretiyor\n'
  kalan=$((kalan + 1))
fi

printf '\n%d geçti, %d kaldı\n\n' "$gecen" "$kalan"
[[ "$kalan" -eq 0 ]]
