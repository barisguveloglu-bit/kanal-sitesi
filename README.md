# Kanlı Göz — Hikaye Evreni Sitesi

Hikayenin lore arşivi. Derleme adımı yok, kurulum yok — HTML/CSS/JS.

## Sayfalar

| Dosya | İçerik |
|---|---|
| `index.html` | Ana sayfa — evrenin özeti ve güç sıralaması |
| `karakterler.html` | Tüm karakterler, taraflarına göre ayrılmış |
| `irade.html` | İrade sistemi ve Kanlı Göz paradoksu |
| `efsane.html` | 300 yıllık efsane ve kuruyan ağaç |
| `mafya.html` | Mafya hiyerarşisi ve derebeyi ağı (kurgu uyarılı) |
| `icraatler.html` | Karakterlerin yaptıkları — sıralama değil, kayıt |
| `soru-cevap.html` | Soruların nasıl sorulacağı — YouTube'a yönlendiriyor |
| `404.html` | Olmayan adreslerde çıkan sayfa (stili kendi içinde) |

Ayrıca `sitemap.xml`, `robots.txt` ve paylaşım önizlemesi için
`assets/og-kanli-goz.png` var.

## Siteyi açmak

`index.html` dosyasına çift tıklamak yeterli. Yerel sunucu istersen:

```bash
python3 -m http.server 8000
```

Sonra tarayıcıda `http://localhost:8000` adresini aç.

## İçerik nasıl eklenir

**Hiçbir HTML dosyasına dokunman gerekmiyor.** Bütün içerik `assets/js/data.js` içinde.

### YouTube videolarını eklemek

**Site açıldığında ilk göze çarpan şey bu olmalı, ama şu an boş.**
`assets/js/data.js` içindeki `VIDEOLAR` bloğunu doldur:

```js
const VIDEOLAR = {
  baslangic: { kimlik: "AbCdEf12345", baglanti: "", baslik: "" },
  oneCikan:  { kimlik: "AbCdEf12345", baslik: "Bölüm 1", aciklama: "...", sure: "12:40" },
  rota: [
    { kimlik: "...", baslik: "...", aciklama: "...", sure: "" },
  ],
};
```

- `kimlik` = izleme adresindeki `v=` kısmı. Yazarsan kapak görseli ve
  bağlantı kendiliğinden üretilir.
- Oynatma listesi gibi bir şey vereceksen `baglanti` alanına tam adresi yaz.
- **Boş bıraktığın bölüm siteye hiç basılmaz.** Ziyaretçi "yakında" yazan
  boş bir kart görmez. Doldurduğun an kendiliğinden görünür.
- `rota` açıklamaları spoilersız olmalı: ne olduğunu değil, neye bakacağını söyle.

### Yeni sayfa eklemek

**Menü artık JavaScript ile üretilmiyor**, her HTML dosyasında yazılı duruyor.
Sebebi: JavaScript yüklenmezse ziyaretçi sitede mahsur kalmasın.

Yeni bir sayfa eklersen bağlantısını **her HTML dosyasındaki**
`<nav class="menu">` bloğuna eklemen ve `sitemap.xml` dosyasına bir satır
yazman gerekiyor. (Karakter/icraat/derebeyi eklerken böyle bir şey gerekmiyor —
onlar hâlâ sadece `data.js`.)

### Yeni karakter eklemek

`assets/js/data.js` dosyasındaki `KARAKTERLER` dizisine yeni bir blok ekle:

```js
{
  id: "yeni-karakter",
  ad: "Yeni Karakter",
  unvan: "Ünvanı",
  taraf: "iyi",          // "iyi" | "kotu" | "belirsiz"
  oynanan: false,         // senin oynadığın karakter mi?
  tir: 3,                 // kaç tır kaldırıyor (gücü yoksa null)
  gucEtiketi: "3 tır",
  ozet: "Kısa tanıtım.",
  ozellikler: ["Özellik 1", "Özellik 2"],
  detay: "Ek bilgi.",
}
```

Kaydet, sayfayı yenile. Karakter otomatik olarak doğru bölümde görünür.

### İcraat eklemek

`ICRAATLER` içinde ilgili karakterin `liste` dizisine bir satır ekle:

```js
{ ne: "Ne yaptığı", video: "Video adı", baglanti: "https://..." }
```

`video` ve `baglanti` isteğe bağlı. **Sıralama ve puan yok** — bu liste
"kim daha güçlü" sorusuna cevap vermez, sadece olanı kaydeder.

### Derebeyi eklemek

`DEREBEYLERI` dizisine ekle:

```js
{ il: "Ankara", ad: "Derebeyi adı", not: "Kısa bilgi" }
```

Adı henüz belli değilse `ad: null` bırak — site "İsimsiz Derebeyi" gösterir ve
sayaç kendini günceller.

### İrade kademelerini değiştirmek

`IRADE_KADEMELERI` dizisini düzenle.

### Spoiler kapağı koymak

Hikayenin güncel gelişmelerini anlatan bir bölümü yeni gelenlerden gizlemek
için kapsayıcıya iki öznitelik yeter:

```html
<div data-spoiler="Hikayenin geldiği nokta" data-spoiler-anahtar="efsane-durum">
  ...
</div>
```

Bölüm kapalı başlar, ziyaretçi bir kez açarsa tercihi hatırlanır.
JavaScript çalışmazsa içerik olduğu gibi görünür — hiçbir şey kaybolmaz.

## Tasarım yardımı almak

Başka bir yerden animasyon veya tasarım yardımı isterken
[`TASARIM.md`](TASARIM.md) dosyasının tamamını kopyalayıp yapıştır.
İçinde teknik kısıtlar, renk sistemi, mevcut animasyonlar ve hikayenin
tonu yazılı — her şeyi baştan anlatmana gerek kalmaz.

## Canon

Hikayenin tek doğru kaynağı [`LORE.md`](LORE.md). Önce orayı güncelle,
sonra `data.js` dosyasına yansıt.

## Yayınlamak — GitHub Pages

Site GitHub Pages'e hazır: derleme adımı yok, bütün bağlantılar göreli, alt
klasörden yayınlandığında da çalışıyor.

1. GitHub'da depoya gir: `github.com/barisguveloglu-bit/kanal-sitesi`
2. Üstten **Settings** sekmesine tıkla
3. Sol menüden **Pages**
4. **Source** kısmında **Deploy from a branch** seçili olsun
5. **Branch** kısmında yayınlamak istediğin dalı seç, klasör **/ (root)** kalsın
6. **Save**

1-2 dakika sonra adres hazır olur:

```
https://barisguveloglu-bit.github.io/kanal-sitesi/
```

Sayfayı yenileyip Pages bölümünün üstünde çıkan yeşil kutudaki adrese tıklayarak
girebilirsin.

**Not:** Depo **Public** olmalı. Private depoda Pages ücretli plan istiyor.
Settings → General → en altta **Danger Zone → Change repository visibility**.

### Sonradan değişiklik yapmak
Dosyayı değiştir, commit'le, push'la. Pages 1-2 dakika içinde kendini günceller.

### Yerelde denemek
Yayınlamadan önce kendi bilgisayarında görmek istersen `index.html`
dosyasına çift tıklaman yeterli.

---

## Soru & Cevap nasıl işliyor?

**Sitede soru kutusu yok, backend yok, veritabanı yok.** Sorular YouTube'da,
videoların altındaki yorumlarda soruluyor ve orada cevaplanıyor.

`soru-cevap.html` sayfası sadece bunu anlatıyor ve kanala yönlendiriyor.
Yani sitenin bakması gereken bir sistem yok; YouTube zaten bu işi yapıyor
ve yorumlar kanala da yarıyor.

> Daha önce burada Supabase tabanlı bir soru-cevap + ban sistemi vardı.
> Tek kişilik bir kanal için sürekli bakım gerektirdiği ve YouTube
> yorumları aynı işi zaten yaptığı için kaldırıldı. Kodu silinmedi,
> git geçmişinde duruyor.

---

## Yapay zekâ ile çalışırken

Depoda hikayeyi ve kuralları anlatan bir context katmanı var:

- `LORE.md` — canon kaynağı. Açık uçlar bölüm 10'da.
- `CLAUDE.md` — projenin kuralları (sadece Claude Code okur).
- `.claude/skills/` — sık yapılan işlerin adımları: içerik ekleme,
  sayfa ekleme, video ekleme. İlgili iş başlayınca kendiliğinden yükleniyor.

Aynı kurulumu claude.ai tarafında da kullanmak için:
[`CLAUDE-AI-KURULUM.md`](CLAUDE-AI-KURULUM.md).
