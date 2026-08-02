---
name: lore-denetim
description: LORE.md ile assets/js/data.js arasındaki tutarlılığı denetler ve
  rapor verir. Karakter, güç, irade kademesi, komutan, derebeyi veya icraat
  eklendikten/değiştirildikten sonra; ya da "lore tutuyor mu", "senkron mu",
  "eksik ne var", "uydurma bir şey var mı", "canon ile site uyuşuyor mu" diye
  sorulduğunda kullan. Sadece okur ve raporlar — düzeltme yapmaz.
---

# Lore Denetimi

`LORE.md` bu evrenin **tek canon kaynağı**. `assets/js/data.js` onun site
tarafındaki yansıması. İkisi ayrışırsa site canon'a aykırı şey anlatır.
Bu skill ayrışmayı bulur ve raporlar.

## Kapsam dışı

- **Hiçbir şeyi düzeltme.** Bu skill rapor üretir. Düzeltme gerekiyorsa
  raporu sun, ayrıca izin iste.
- **Boşluğu doldurma.** Eksik isim, tarih veya açıklama gördüğünde
  uydurma — "tanımlı değil" yaz. (`CLAUDE.md`: sahte içerik yasak.)
- Tasarım, CSS, erişilebilirlik bu skill'in işi değil.

## Adımlar

### 1. Kaynakları oku
- `LORE.md` — **tamamını** oku, özetle yetinme.
- `assets/js/data.js` — aşağıdaki dizileri çıkar.

### 2. Sayısal kontrolleri betikle yap
Elle sayma — `IL_DEREBEYLERI` 81 kayıt, göz hata yapar. Bunun yerine:

`data.js` tarayıcı için yazılmış — `export` yok, hepsi `const`. `eval()`
kullanma, `const`'lar dışarı sızmaz. `new Function` ile oku:

```bash
node -e '
  const src = require("fs").readFileSync("assets/js/data.js","utf8");
  const D = new Function(src + "\nreturn {KARAKTERLER, ICRAATLER, IRADE_KADEMELERI, MAFYA_TEPE, KOMUTANLAR, IL_DEREBEYLERI};")();
  const say = {};
  D.IL_DEREBEYLERI.forEach(d => say[d.komutan] = (say[d.komutan]||0)+1);
  console.log("Toplam il:", D.IL_DEREBEYLERI.length, say);
  const plakalar = D.IL_DEREBEYLERI.map(d => d.plaka);
  const eksik = []; for (let i=1;i<=81;i++) if (!plakalar.includes(i)) eksik.push(i);
  console.log("Eksik plaka:", eksik.length ? eksik : "yok");
  const adlar = D.IL_DEREBEYLERI.map(d=>d.ad);
  const tekrar = adlar.filter((a,i)=>adlar.indexOf(a)!==i);
  console.log("Tekrar eden ad:", tekrar.length ? tekrar : "yok");
  console.log("Karakter:", D.KARAKTERLER.length, "| Komutan:", D.KOMUTANLAR.length,
              "| Kademe:", D.IRADE_KADEMELERI.length, "| İcraat grubu:", D.ICRAATLER.length);
  D.KARAKTERLER.forEach(k => console.log(" ", k.ad.padEnd(24), "tir:", String(k.tir).padEnd(5),
              "taraf:", k.taraf.padEnd(9), "irade:", k.iradeKademe ?? "TANIMSIZ"));
'
```

Beklenen: 81 il, cephe başına 27, eksik plaka yok, tekrar eden ad yok.

81 derebeyinin adını **elle karşılaştırma** — LORE tablolarını ayrıştırıp
otomatik karşılaştır:

```bash
node -e '
  const fs = require("fs");
  const D = new Function(fs.readFileSync("assets/js/data.js","utf8") + "\nreturn {IL_DEREBEYLERI};")();
  let cephe = null; const loreMap = new Map();
  for (const s of fs.readFileSync("LORE.md","utf8").split("\n")) {
    if (/^####\s+Batı/.test(s)) cephe = "bati";
    else if (/^####\s+Orta/.test(s)) cephe = "orta";
    else if (/^####\s+Doğu/.test(s)) cephe = "dogu";
    const m = s.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*\*\*([^*]+)\*\*\s*\|/);
    if (m && cephe) loreMap.set(Number(m[1]), {il:m[2], ad:m[3], cephe});
  }
  const hata = [];
  D.IL_DEREBEYLERI.forEach(d => {
    const l = loreMap.get(d.plaka);
    if (!l) return hata.push(`plaka ${d.plaka} (${d.il}) LOREda yok`);
    if (l.ad !== d.ad) hata.push(`plaka ${d.plaka} ${d.il}: ad LORE="${l.ad}" data="${d.ad}"`);
    if (l.il !== d.il) hata.push(`plaka ${d.plaka}: il LORE="${l.il}" data="${d.il}"`);
    if (l.cephe !== d.komutan) hata.push(`plaka ${d.plaka} ${d.il}: cephe LORE="${l.cephe}" data="${d.komutan}"`);
  });
  loreMap.forEach((v,k) => { if(!D.IL_DEREBEYLERI.find(d=>d.plaka===k)) hata.push(`plaka ${k} ${v.il} data.jste yok`); });
  console.log(hata.length ? "FARKLAR:\n  " + hata.join("\n  ") : "81 derebeyi: ad, il ve cephe TAM UYUMLU");
'
```

### 3. Liste liste karşılaştır

| data.js | LORE.md karşılığı |
|---|---|
| `KARAKTERLER` | § 4. Karakterler |
| `IRADE_KADEMELERI` | § 3. İrade Sistemi tablosu |
| `MAFYA_TEPE` + `KOMUTANLAR` | § 5. Mafya Yapısı |
| `IL_DEREBEYLERI` | § 5 → 81 il derebeyi tabloları |
| `ICRAATLER` | § 4, § 5, § 9 — anlatılan olaylar |
| `DURUM` | § 1 → ŞU ANKİ DURUM kutusu |

Her biri için üç şeye bak:

- **Eksik** — LORE'da var, `data.js`'te yok
- **Uydurma** — `data.js`'te var, LORE'da yok *(en ciddi bulgu)*
- **Çelişki** — ikisinde de var ama detay farklı (tır sayısı, irade
  kademesi, taraf, güç adı, zaaf)

### 4. Alan bazlı çapraz kontrol
Bunlar birden fazla yerde tekrarlandığı için ayrışmaya en açık noktalar:

- **Tır değerleri** — `KARAKTERLER[].tir`, `KOMUTANLAR[].tir`,
  `formlar[].tir` ile LORE § 6 tablosu aynı mı?
- **İrade kademeleri** — `iradeKademe` alanları LORE § 3 ve § 5 ile aynı mı?
  Kimlerde tanımsız?
- **Taraf** — `taraf` alanı LORE'daki "Taraf:" satırıyla aynı mı?
- **Derebeyi–cephe eşleşmesi** — `IL_DEREBEYLERI[].komutan` ile LORE'daki
  cephe başlığı aynı mı? (Mitoloji karışması buradan çıkar.)

### 5. Açık uçları ayır
`LORE.md` içinde **"DURUM: TASLAK"**, **"Açık Uçlar"**, `null` değerler ve
"henüz netleşmedi" ifadeleri **eksik değil, karar bekleyen** şeylerdir.
Bunları eksiklerden ayrı bir başlıkta topla. Karar verilmiş gibi davranma.

### 6. İçerik nerede duruyor
`CLAUDE.md` diyor ki bütün içerik `data.js`'te durur, HTML sadece iskelettir.
Bunu da denetle: LORE'da olup `data.js`'te olmayan bir içerik, HTML'e
gömülmüş olabilir.

```bash
grep -rn "Yılmaz\|1728\|Bâb-ı Hümâyun" --include="*.html" .
```

HTML'de sabit içerik bulursan bunu ayrı bir bulgu olarak raporla.

## Çıktı biçimi

Kısa bir rapor. Her satırda kaynak göster (`LORE.md:154`, `data.js:383`).

```
## Özet
Tek cümle: senkron mu, değil mi.

### ✅ Doğrulananlar
(sayısal sonuçlar ve tutan listeler — kısa tut)

### ⚠️ Eksikler
LORE'da var, data.js'te yok.

### ❌ Uydurmalar
data.js'te var, LORE'da yok. En ciddi kategori.

### ⚡ Çelişkiler
İkisinde de var, detay farklı.

### 🕓 Açık uçlar
Karar bekleyenler — eksik değil.
```

Bulgu yoksa "temiz" de ve geç. Rapor doldurmak için önemsiz şey yazma.
