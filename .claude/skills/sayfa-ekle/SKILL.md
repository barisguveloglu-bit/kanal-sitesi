---
name: sayfa-ekle
description: Kanlı Göz sitesine yeni bir HTML sayfası eklerken, bir sayfayı silerken veya yeniden adlandırırken kullanılır. Menü her HTML dosyasında elle yazılı olduğu için tek yerde güncelleme yetmez — bu skill güncellenmesi gereken tüm dosyaları ve sırayı verir.
---

# Yeni sayfa ekleme

Menü **JavaScript ile üretilmiyor.** Her HTML dosyasının içinde yazılı
duruyor; sebebi JavaScript yüklenmezse ziyaretçinin sitede mahsur
kalmaması. Bedeli: yeni sayfa eklemek çok dosyaya dokunmak demek.
Bu bilinçli bir takas — menüyü `app.js`'e geri taşıma.

## Dokunulacak yerler

1. **Sayfanın kendisi** — mevcut bir sayfayı şablon al (`karakterler.html`
   en sade olanı). İçerik yazma, `data-*` bağlama noktası bırak.
2. **Sekiz HTML dosyasındaki `<nav class="menu">`** — yenisi dahil dokuz olur:
   `index.html`, `karakterler.html`, `irade.html`, `efsane.html`,
   `mafya.html`, `icraatler.html`, `soru-cevap.html`, `gizli.html`.
   Her birinde 7 bağlantı var ve **sıra hepsinde aynı olmalı**.
   `404.html`'de `<nav class="menu">` **yok** — stili kendi içinde ve sadece
   üç kurtarma bağlantısı taşıyor (ana sayfa, karakterler, efsane).
   Oraya normalde dokunulmaz; menü sayılırken de hesaba katılmaz.
3. **`sitemap.xml`** — `<url><loc>` satırı ve `<priority>` değeri ekle.
4. **`assets/js/app.js`** — sayfa veri basıyorsa `DOMContentLoaded` içindeki
   listeye kurulum fonksiyonunu ekle.
5. **`README.md`** — sayfa tablosuna satır ekle.

## Gizli sayfa istisnası

`gizli.html` bilerek menüde ve `sitemap.xml`'de **yok** — gizli kapıdan
ulaşılıyor. Menüsü yine de güncel tutulur ki oradan çıkış olsun.
Yeni bir gizli sayfa yaparsan aynı deseni izle: menüye ve sitemap'e ekleme.

## Betik sırası

Betikler `defer` ile yükleniyor ve sıra korunuyor (ilk boyamayı ~%28
hızlandırdı). `data.js` → `app.js` → sayfaya özel betik. Bu sırayı bozma,
`defer`i kaldırma.

## Bitirmeden önce doğrula

```bash
# menü taşıyan her dosyada bağlantı var mı — hiçbir şey yazmamalı
for f in $(grep -l '<nav class="menu"' *.html); do
  grep -q 'href="YENI.html"' "$f" || echo "EKSİK menü: $f"
done

# her menü aynı sayıda bağlantı taşıyor mu — tek bir sayı çıkmalı
for f in $(grep -l '<nav class="menu"' *.html); do
  sed -n '/<nav class="menu"/,/<\/nav>/p' "$f" | grep -c '<a href'
done | sort -u

# menüdeki her hedef gerçekten var mı (ölü bağlantı kontrolü)
grep -ohE 'href="[a-z0-9-]+\.html"' *.html | sed -E 's/href="([^"]+)"/\1/' \
  | sort -u | while read -r f; do [ -f "$f" ] || echo "EKSİK: $f"; done
```

Sayı 9 değilse iş bitmemiştir.
