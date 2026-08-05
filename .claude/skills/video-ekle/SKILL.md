---
name: video-ekle
description: Ana sayfadaki YouTube video bölümlerini doldururken kullanılır — başlangıç düğmesi, öne çıkan video ve "üç videoda evrene gir" rotası. assets/js/data.js içindeki VIDEOLAR bloğunun alanlarını ve boş bırakma kuralını açıklar. Ana sayfada video görünmüyor diye sorulduğunda da bu skill'e bakılır.
---

# Video ekleme

Ana sayfada ilk göze çarpması gereken şey videolar. `VIDEOLAR` bloğu
`assets/js/data.js` içinde ve **şu an tamamen boş** — o yüzden ilgili
bölümler siteye hiç basılmıyor.

## En önemli kural

**Sahte içerik üretme.** Elinde gerçek YouTube kimliği yoksa alanı boş
bırak. Örnek başlık, "yakında", uydurma süre, tahmini bağlantı **yazma**.

Boş bir alan siteye hiç basılmaz — ziyaretçi boş kart görmez, bölüm
`hidden` kalır. Uydurulmuş bir başlık ise yayına çıkar ve yalan olur.
Kimlik yoksa doğru davranış: doldurmamak ve kullanıcıya "şu alanlar için
video kimliği lazım" demek.

## Alanlar

```js
const VIDEOLAR = {
  baslangic: { kimlik: "", baglanti: "", baslik: "" },
  oneCikan:  { kimlik: "", baglanti: "", baslik: "", aciklama: "", sure: "" },
  rota: [
    { kimlik: "", baglanti: "", baslik: "", aciklama: "", sure: "" },
  ],
};
```

- `kimlik` — izleme adresindeki `v=` kısmı, sadece o (`AbCdEf12345`).
  Yazarsan kapak görseli ve bağlantı kendiliğinden üretilir.
- `baglanti` — oynatma listesi gibi tam adres gerekiyorsa. Normalde boş.
- `sure` — `"12:40"` biçimi. Bilmiyorsan boş bırak, uydurma.

| Alan | Nerede görünür |
|---|---|
| `baslangic` | Ana sayfadaki birincil düğme. Boşsa düğme kanala gider. |
| `oneCikan` | Üstteki büyük kart. Boşsa bölüm basılmaz. |
| `rota` | "Üç videoda evrene gir". Boş satır atlanır; hepsi boşsa bölüm basılmaz. |

## Rota açıklamaları spoilersız

Ne olduğunu değil, **neye bakacağını** söyle.

- ✅ "Barış'ın kamerayı hiç bırakmadığına dikkat et."
- ❌ "Barış'ın ailesinin öldürüldüğü bölüm."

## Bitirmeden önce doğrula

```bash
node --check assets/js/data.js
python3 -m http.server 8000   # index.html'i aç, bölümler gerçekten basılıyor mu
```

Doldurduğun bölümün sitede göründüğünü, boş bıraktığının **hiç
basılmadığını** gözle teyit et.
