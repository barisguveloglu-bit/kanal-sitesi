# Kanlı Göz — Tasarım Brief'i

> **Bu dosya kopyalanıp yapıştırılmak için yazıldı.** Başka bir yerde tasarım
> veya animasyon yardımı isterken bunun tamamını yapıştır; her şeyi baştan
> anlatmana gerek kalmaz.

---

## Ne yapıyorum

Türkçe bir **hikaye evreni arşivi** sitesi. Bir YouTube kanalının kurgusal
evrenini anlatıyor. Karanlık, atmosferik, gizemli bir tonu var.

**İstediğim:** siteyi daha canlı gösterecek animasyonlar ve görsel iyileştirmeler.

---

## ⛔ KRİTİK KISITLAR — ÖNCE BUNU OKU

Bu kısıtlara uymayan kod işime yaramaz, kullanamam.

**Kullanamayacağın şeyler:**
- ❌ React, Vue, Svelte, Next.js — hiçbir framework
- ❌ Tailwind, Bootstrap, herhangi bir CSS framework'ü
- ❌ GSAP, Framer Motion, Anime.js, animate.css, jQuery, Lottie
- ❌ npm paketi, `import` ile gelen kütüphane
- ❌ Derleme adımı gerektiren hiçbir şey (SCSS, PostCSS, Vite, Webpack)
- ❌ Dış sunucudan çekilen font, görsel veya betik

**Kullanabileceğin şeyler:**
- ✅ Düz CSS (`@keyframes`, `transition`, `transform`, `clip-path`, `filter`)
- ✅ Düz JavaScript (`IntersectionObserver`, `requestAnimationFrame`, sınıf ekleme)
- ✅ Satır içi SVG (kodla üretilen, dosya değil)
- ✅ Sistem yazı tipleri

**Sebebi:** Site GitHub Pages'te yayınlanıyor. Derleme adımı yok, paket
yöneticisi yok. Dosyalar doğrudan tarayıcıya gidiyor. Bir `<script src="...">`
eklemek bile istemiyorum.

**Diğer şartlar:**
- **Mobil öncelikli** — ziyaretçilerin neredeyse tamamı telefondan giriyor
- `prefers-reduced-motion: reduce` seçili kullanıcıda animasyonlar kapanmalı
- Arayüz **Türkçe**, sınıf ve değişken isimleri de Türkçe
- Karanlık tema — açık tema yok

---

## Önemli teknik ayrıntı

**Sayfa içeriğinin çoğu JavaScript ile sonradan basılıyor.** HTML dosyaları
sadece iskelet; karakter kartları, listeler vs. `DOMContentLoaded` sonrasında
`data.js` içindeki veriden üretiliyor.

Yani kaydırma animasyonu (scroll animation) yazacaksan:
`IntersectionObserver`'ı **içerik basıldıktan sonra** kurman gerekiyor.
Sayfa yüklenir yüklenmez kurarsan gözlenecek eleman henüz ortada olmaz.

**Bunun için hazır bir olay var.** İçerik basıldıktan sonra yayılıyor:

```js
document.addEventListener("icerik-hazir", () => {
  // buradan itibaren kartlar, listeler, 81 il kutusu hepsi DOM'da
});
```

`MutationObserver` kurmana gerek yok. Olay `app.js` içinde, bütün
oluşturucu fonksiyonlar çalıştıktan sonra yayılıyor. Gizli sayfada kilit
basıldıktan sonra bir kez daha yayılıyor, o yüzden dinleyicinin **birden
fazla kez çalışabileceğini** hesaba kat (aynı elemanı iki kez gözlememek
için `dataset` ile işaretlemen yeterli).

---

## Mevcut tasarım sistemi

Bunları değiştirme, bunlarla uyumlu üret:

```css
:root {
  --bg: #0a0a0c;          /* ana zemin */
  --bg-2: #111116;        /* kart zemini */
  --bg-3: #17171e;        /* iç kutu zemini */
  --line: #26262f;        /* çerçeve */
  --line-soft: #1d1d25;   /* soluk ayraç */

  --text: #e8e6e3;        /* ana metin */
  --text-2: #9a9aa5;      /* ikincil metin */
  --text-3: #6a6a75;      /* soluk metin */

  --kan: #c0271f;         /* ana vurgu — Kanlı Göz kırmızısı */
  --kan-parlak: #ff4438;  /* parlak kırmızı */
  --elektrik: #4ba3ff;    /* mavi — elektrik gücü */
  --altin: #d4a53c;       /* altın — uyarı ve rozet */

  --iyi: #4fa87a;         /* iyi karakterler — yeşil */
  --kotu: #c0271f;        /* kötü karakterler — kırmızı */
  --belirsiz: #a0762c;    /* tarafı belirsiz — kehribar */

  --font-baslik: Georgia, "Times New Roman", serif;
  --font-metin: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  --en: 1080px;           /* içerik genişliği */
  --radius: 4px;
}
```

**Tipografi kuralı:** başlıklar serif (Georgia), gövde metni sans-serif.
Bu zıtlık sitenin karakteri — bozma.

---

## Zaten var olan animasyonlar

Bunları tekrar üretme, üstlerine ekleme yap:

| Ne | Nerede |
|---|---|
| Nabız atan kırmızı nokta | Üst bardaki logo |
| Dönen iris lifleri ve kadran halkası | Ana sayfadaki dev göz (SVG, kodla çiziliyor) |
| Göz bebeğinin nefes alması | Aynı göz |
| Kırmızı/mavi kanal ayrışması (glitch) | Sayfa başlıkları |
| Kayan tarama çizgileri | Bazı bölümlerin üstünde |
| Titreyen "sızıntı" şeridi | Sayfa aralarındaki kırmızı şerit |
| Ekranı bozan geçiş | Gizli sayfada kapı açılırken |
| Yanıp sönen "Esir" rozeti | Karakter kartı |
| Merkezden dışa yayılan ışınlar | Mafya sayfasındaki Türkiye haritası (SVG, kodla çiziliyor) |

Toplam 14 `@keyframes` var. Site **karanlık ve ağır** bir his veriyor;
neşeli, zıplayan, renkli animasyonlar tona uymaz.

---

## Sayfalar

| Sayfa | İçerik |
|---|---|
| Ana sayfa | Dev göz, "beş sebep" listesi, üç kart, icraat özeti |
| Karakterler | 6 karakter kartı, taraflarına göre gruplanmış |
| İrade Sistemi | 5 kademeli merdiven — sitenin ana mekaniği |
| Kanlı Göz Efsanesi | Efsane + **eskimiş kâğıt görünümlü 1728 vakayinamesi** |
| Mafya Haritası | **Ankara merkezli Türkiye haritası**, 4 kademeli hiyerarşi şeması, 3 komutan kartı, **81 il kutusu** |
| İcraatler | Karakter başına "ne yaptı" listeleri |
| Soru & Cevap | İzleyici soruları (backend'i henüz kurulmadı) |
| Gizli sayfa | Menüde yok. Mor–camgöbeği bozulma renkleri, kilitli bölüm |

---

## Hikaye — tonu anlaman için

Her 300 yılda bir, iradesi olağanüstü güçlü birinde **Kanlı Göz** doğar.
Taşıyıcının beyni yeterince yıkanırsa, yıkayanlara **tek bir dilek hakkı** doğar.

Kötülerin dileği: kavgasız bir dünya. Ama bunu güçle kurmak istiyorlar.
Aradıkları taşıyıcının adı da **Barış** — cümle iki anlama birden geliyor.

Efsane unutuldu çünkü taşıyıcı isimlerinin kazındığı ağaç **1728'de**
Osmanlı sarayının önüne dikildi, sonra kesilip ziyafetlerde tüketildi.

Ton: **karanlık, gizemli, ağır.** Kayıp bir tarih ve gizli bir tehdit hissi.
Kahramanlık değil, tedirginlik.

---

## Aklımdaki animasyon fikirleri

Bunlar başlangıç noktası — daha iyi fikrin varsa söyle:

1. **Kaydırınca beliren bölümler** — aşağı indikçe içerik yumuşakça görünsün
2. **81 il kutusu** — sırayla, dalga hâlinde belirse hoş olur
3. **İrade merdiveni** — kademeler alttan üste doğru dolsun
4. **Karakter kartları** — üzerine gelince daha canlı bir tepki
5. **Vakayiname** — 1728 belgesi eski bir kağıt gibi açılsın
6. **Sayfa geçişleri** — sayfalar arası yumuşak geçiş

---

## Senden istediğim

- **Sadece düz CSS ve düz JavaScript** ver
- Sınıf isimlerini **Türkçe** yaz (`.beliren`, `.kayan-govde` gibi)
- Her parçanın **nereye yapıştırılacağını** açıkça belirt
- `prefers-reduced-motion` desteğini unutma
- Mobilde de akıcı olsun — ağır efektlerden kaçın

Kodu aldıktan sonra siteye ben entegre edeceğim.
