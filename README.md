# Kanlı Göz — Hikaye Evreni Sitesi

Hikayenin lore arşivi. Derleme adımı yok, kurulum yok — HTML/CSS/JS.

## Sayfalar

| Dosya | İçerik |
|---|---|
| `index.html` | Ana sayfa — evrenin özeti ve güç sıralaması |
| `karakterler.html` | Tüm karakterler, taraflarına göre ayrılmış |
| `irade.html` | İrade sistemi ve Kanlı Göz paradoksu |
| `efsane.html` | 300 yıllık efsane ve kuruyan ağaç |
| `guc-tablosu.html` | Ayrıntılı güç karşılaştırması |

## Siteyi açmak

`index.html` dosyasına çift tıklamak yeterli. Yerel sunucu istersen:

```bash
python3 -m http.server 8000
```

Sonra tarayıcıda `http://localhost:8000` adresini aç.

## İçerik nasıl eklenir

**Hiçbir HTML dosyasına dokunman gerekmiyor.** Bütün içerik `assets/js/data.js` içinde.

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

### Güç tablosuna eklemek

Aynı dosyadaki `GUC_SIRALAMASI` dizisine ekle. Çubuklar en yüksek değere göre
kendiliğinden ölçeklenir.

### İrade kademelerini değiştirmek

`IRADE_KADEMELERI` dizisini düzenle.

## Canon

Hikayenin tek doğru kaynağı [`LORE.md`](LORE.md). Önce orayı güncelle,
sonra `data.js` dosyasına yansıt.

## Yayınlamak

GitHub Pages'e hazır. Depo ayarlarından **Settings → Pages → Source: main branch**
seçmen yeterli.
