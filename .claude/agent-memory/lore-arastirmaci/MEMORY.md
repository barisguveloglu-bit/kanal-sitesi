# lore-arastirmaci hafızası

Bu dosya oturumlar arasında kalıyor. Kendin güncelliyorsun.

**Buradaki hiçbir şey canon değildir.** Burası sadece *nereye bakacağını*
hızlandırır. Cevabı yine dosyadan okuyup `dosya:satır` vereceksin.
Burası ile dosya çelişirse **dosya kazanır** — ve burayı düzeltirsin.

---

## Nerede ne var (başlangıç notları)

- Satır aralıklarının tamamı `HARITA.md`'de. Önce oraya bak.
- **Bir konu birden fazla bölüme dağılmış olabiliyor.** Karakter güçleri
  üç ayrı yerde geçiyor: `LORE.md` §4 (karakter tanımı), §5 (komutan
  güçleri ve kimi kilitledikleri), §6 (tır değerleri iç referans tablosu).
  Sadece §4'e bakıp cevap verme.
- **`LORE.md` §6 siteye basılmıyor.** İç referans olduğu açıkça yazılı
  (`LORE.md:344-348`) — sıralı güç tablosu bilerek sitede yok.
- **`LORE.md` §7'deki bağlantı okura söylenmiyor** (`LORE.md:388-389`):
  güçlerin ağaçtan geldiği evren içinde de bilinmiyor.

## Canon'un kendi kabul ettiği açık uçlar

- **İrade kademeleri taslak** — `LORE.md:93` "DURUM: TASLAK" diyor.
  5 kademe kesinleşmiş bilgi değil.
- **1730 / 1731 belirsizliği** — `LORE.md:76-79` iki seçeneği de açık
  bırakıyor, gerekçesiyle birlikte.
- **Bir derebeyinin adı yok** — `data.js`'te `ad: null`.
- **`VIDEOLAR` tamamen boş** — `data.js:32-49`. Site video bölümlerini
  bu yüzden hiç basmıyor.

## Arama tuzakları

- **Türkçe çekim ekleri.** "kereste" ararken "keresteci", "kerestenin"
  kaçar. Kökü ara, tam kelimeyi değil.
- **Türkçe büyük/küçük harf.** "İ/ı" ve "I/i" ayrımı `grep -i` ile her
  zaman beklediğin gibi davranmıyor. Şüphelendiğinde iki yazımı da dene.
- **İsimler iki dilde/alfabede.** Mitolojik isimler (Teşup/Tešub,
  Ahriman, Nemesis) canon'da tek yazımla geçiyor ama arama yaparken
  şapkalı/şapkasız varyantı düşün.

## Git geçmişinde ne var

"Neden böyle" sorularının cevabı çoğunlukla commit mesajlarında:

- Supabase tabanlı soru-cevap sistemi vardı, kaldırıldı — bakım yükü ve
  YouTube yorumlarının aynı işi yapması gerekçesiyle.
- Sıralı güç tablosu kaldırılıp yerine icraat listesi konuldu — sıralı
  tablo "en üstteki yenilmez" sözü verdiği ve videoyla çakışınca siteyi
  yalancı çıkardığı için.
- Mafya haritasında mitoloji hataları bir kez düzeltildi —
  `git log --oneline | grep -i mitoloji`.
- Bir erişilebilirlik denetimi yapıldı; `CLAUDE.md`'deki "Değişmezler"
  bölümü o denetimin çıktısı.

## Çözülmüş çelişkiler

*(Barış bir ayrışmaya karar verdikçe buraya kararı ve gerekçesini yaz —
aynı soru iki kez sorulmasın.)*

Henüz yok.
