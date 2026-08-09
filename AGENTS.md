# AGENTS.md — Bu depoda çalışacak AI ajanları için talimat

Bu dosya, depoya bağlanan otonom kodlama ajanları (Jules, OpenHands, Codex,
Copilot, Cursor, Aider vb.) içindir. **İş yapmaya başlamadan önce tamamını oku.**

Bu depo alışılmış bir web projesi değil. Çoğu ajanın "iyileştirme" sandığı
şeylerin birçoğu burada **bilinçli olarak yapılmamış**. Aşağıdaki kurallara
uymayan değişiklikler geri çevrilir.

---

## 1. Proje nedir

Türkçe bir kurgu evreninin ("Kanlı Göz") lore arşivi. Statik site.

- **Derleme adımı yok. Paket yöneticisi yok. `package.json` yok.**
- **Backend yok. Veritabanı yok. Dış servise bağımlılık yok.**
- Saf HTML + CSS + vanilla JavaScript. Çerçeve (framework) yok.
- GitHub Pages'ten yayınlanıyor, bütün bağlantılar göreli.

Hikayenin **tek doğru kaynağı** [`LORE.md`](LORE.md). İçerikle ilgili
herhangi bir şey yapmadan önce o dosyayı oku.

## 2. Dosya düzeni

| Yol | Ne işe yarar |
|---|---|
| `assets/js/data.js` | **Bütün içerik burada.** Karakterler, güçler, icraatler, derebeyleri, videolar |
| `assets/js/app.js` | Veriyi HTML'e basar |
| `assets/js/animasyon.js`, `goz.js`, `gizli.js` | Görsel efektler |
| `assets/css/style.css` | Ana stil, renk değişkenleri, erişilebilirlik kuralları |
| `assets/css/animasyon.css` | Animasyonlar |
| `*.html` | Sadece iskelet + `data-*` bağlama noktaları |
| `LORE.md` | Canon — hikayenin kaynağı |
| `README.md` | İnsan için kullanım kılavuzu |
| `TASARIM.md` | Tasarım kısıtları ve renk sistemi |

## 3. Kırmızı çizgiler — bunları asla yapma

Bunların hepsi geçmişte alınmış bilinçli kararlar. "Eksik" değiller.

### 3.1 Backend ekleme
Sitede **hiçbir kullanıcı verisi toplanmıyor**: form yok, giriş yok, çerez yok,
analitik yok. Soru-cevap YouTube yorumlarında yapılıyor; site sadece oraya
yönlendiriyor. Daha önce Supabase tabanlı bir sistem vardı, **bilerek kaldırıldı**.
Backend, API anahtarı, üçüncü parti betik veya izleme kodu **ekleme**.

### 3.2 Sahte içerik üretme
`VIDEOLAR` bloğu boşken ana sayfadaki video bölümleri `hidden` kalır.
**Örnek başlık, "yakında" yazısı, uydurma bağlantı, temsilî karakter üretme.**
Bir veri eksikse boş bırak ve raporunda eksik olduğunu söyle.
Lore'da olmayan bir karakter, güç veya olay **icat etme**.

### 3.3 Gizlemeyi `opacity` ile yapma
Gizleme **her zaman `hidden` özniteliğiyle** yapılır.
Hareket azaltma (`prefers-reduced-motion`) açıkken `style.css` bütün geçişleri
kapatıyor — `opacity: 0` ile gizlenen bir şey bir daha **asla** görünmez.
`style.css` içindeki `[hidden] { display: none !important; }` kuralını **silme**.

### 3.4 Odak halkasını kaldırma
`outline: none` **yazma**. `:focus-visible` tasarımı bilerek var.

### 3.5 Renk paletini değiştirme
`--text-3`, `--kotu-metin` ve `--bolge-renk` değerleri WCAG AA (4.5:1)
kontrast sınırına göre **ölçülerek** belirlendi. Değiştirmen gerekiyorsa
önce kontrast oranını hesapla ve PR açıklamasında rakamı yaz.

### 3.6 Menüyü JavaScript'e taşıma
Menü artık `app.js` tarafından üretilmiyor; **her HTML dosyasında yazılı**.
Sebebi: JavaScript yüklenmezse ziyaretçi sitede mahsur kalmasın.
Menüyü tekrar JS'e taşıma.

### 3.7 Betik yükleme sırasını bozma
Betikler `defer` ile yükleniyor (ilk boyama ~%28 hızlandı). Sıra korunur.

### 3.8 Araç zinciri ekleme
Derleme adımı, bundler, TypeScript, npm bağımlılığı, CSS ön işlemcisi,
çerçeve **ekleme**. Sadeliği bilinçli bir tercih.

---

## 4. Nasıl iş yapılır

### 4.1 İçerik eklerken HTML'e dokunma
Yeni karakter, icraat, derebeyi veya irade kademesi eklerken **sadece
`assets/js/data.js`** düzenlenir. HTML dosyaları değişmez.

Karakter bloğunun şekli:

```js
{
  id: "yeni-karakter",
  ad: "Yeni Karakter",
  unvan: "Ünvanı",
  taraf: "iyi",          // "iyi" | "kotu" | "belirsiz"
  oynanan: false,
  tir: 3,                 // gücü yoksa null
  gucEtiketi: "3 tır",
  ozet: "Kısa tanıtım.",
  ozellikler: ["Özellik 1", "Özellik 2"],
  detay: "Ek bilgi.",
}
```

### 4.2 Yeni sayfa eklersen
İki yeri elle güncellemen gerekir:
1. **Her** HTML dosyasındaki `<nav class="menu">` bloğu
2. `sitemap.xml`

### 4.3 İçerik değişince senkron kal
`LORE.md` ile `data.js` **her zaman tutarlı olmalı**. Önce `LORE.md`,
sonra `data.js`.

### 4.4 Dil
- Arayüzde görünen bütün metinler **Türkçe**.
- **Değişken ve fonksiyon isimleri de Türkçe** (`karakterler`, `iradeKademesi`
  gibi). Mevcut düzene uy, İngilizce isim uydurma.
- Commit mesajları Türkçe.

---

## 5. Nasıl doğrulanır

Test paketi yok, linter yok, CI yok. Doğrulama elle yapılır:

```bash
python3 -m http.server 8000
```

Sonra `http://localhost:8000` adresini aç ve şunları kontrol et:

- [ ] Konsolda hata yok
- [ ] Değiştirdiğin sayfa ve **ana sayfa** doğru basılıyor
- [ ] Menü bütün sayfalarda aynı ve çalışıyor
- [ ] JavaScript kapalıyken sayfa hâlâ okunabiliyor ve menü duruyor
- [ ] `hidden` ile gizlenen bölümler hâlâ gizli, gizlenmeyenler görünür
- [ ] Klavyeyle `Tab` gezildiğinde odak halkası görünüyor
- [ ] Dar ekranda (360px) düzen bozulmuyor

`data.js` düzenlediysen sözdizimini ayrıca kontrol et:

```bash
node --check assets/js/data.js
```

---

## 6. Pull request kuralları

- **Küçük tut.** Bir PR bir iş yapsın. Toplu "temizlik" PR'ı açma.
- İstenmeyen dosyaları elleme. Biçimlendirme (formatting) amaçlı toplu
  değişiklik **yapma** — diff okunabilir kalsın.
- PR açıklamasında şunlar olsun:
  - Ne değişti, neden
  - Hangi dosyalara dokunuldu
  - Yukarıdaki doğrulama listesinden neleri gerçekten kontrol ettin
  - **Emin olamadığın veya eksik bıraktığın şeyler** (bunu gizleme,
    yazmadığın eksik daha büyük sorun olur)
- Bir kural sana yanlış geliyorsa **kuralı çiğneme** — PR açıklamasında
  gerekçeni yaz ve o kısmı yapma.

## 7. Emin değilsen

Uydurma. Lore'da geçmeyen bir bilgiyi tahmin etme, boş veriyi doldurma,
"muhtemelen böyledir" diye ilerleme. Eksik bilgiyi PR açıklamasında
soru olarak bırak.

`LORE.md` dosyasının sonundaki **"Açık Uçlar"** bölümü henüz netleşmemiş
konuları listeliyor (irade kademelerinin son hâli, derebeyi isimleri,
zaman çizelgesi). Oradaki boşlukları kendi kafandan doldurma.
