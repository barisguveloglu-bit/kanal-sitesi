# Aynı context'i claude.ai'de de kullanmak

Bu depodaki context katmanının bir kısmı taşınabilir, bir kısmı değil.
Bu dosya farkı anlatıyor ve taşınabilir olanı taşımanın adımlarını veriyor.

## Ne nerede çalışıyor

| Dosya | Claude Code | claude.ai | Sebep |
|---|---|---|---|
| `.claude/skills/*/SKILL.md` | ✅ kendiliğinden | ✅ **zip yükleyerek** | Skill biçimi her yüzeyde aynı |
| `CLAUDE.md` | ✅ kendiliğinden | ❌ | Sadece Claude Code okur |
| `LORE.md`, `TASARIM.md` | ✅ | ✅ **dosya yükleyerek** | Düz markdown, her yerde okunur |

İki şeyi ayırmak önemli:

- **Biçim taşınabilir.** `SKILL.md` + YAML başlığı (`name`, `description`)
  Claude Code'da, claude.ai'de ve API'de birebir aynı.
- **Yükleme senkronlanmıyor.** Anthropic bunu açıkça yazıyor: bir yüzeye
  yüklenen skill diğerinde otomatik çıkmaz. Claude Code dosya sisteminden
  okur, claude.ai zip ister, API ayrı yükleme ister. Yani **aynı klasör, üç
  ayrı teslimat.**

`CLAUDE.md`'nin claude.ai'deki karşılığı **Proje talimatları**;
`LORE.md`'nin karşılığı **Proje bilgisi**.

---

## Adım 1 — Skill'leri paketle ve yükle

```bash
bash araclar/skill-paketle.sh
```

`dist-skills/` altında üç zip çıkar. Sonra claude.ai'de:

1. **Ayarlar → Capabilities** → kod çalıştırma / dosya oluşturmayı **aç.**
   Bu kapalıysa özel skill'ler hiç görünmez.
2. **Ayarlar → Skills** → zip'leri tek tek yükle.
   (Arayüz sürümüne göre bu bölüm *Customize → Skills* veya
   *Settings → Features* altında da çıkabiliyor.)
3. Yüklenen skill'i listede **açık** konuma getir.

Notlar:

- Özel skill için **Pro, Max, Team veya Enterprise** planı gerekiyor.
- Yüklediğin skill **sadece senin hesabına** ait. Ekipteki herkes kendi
  yüklemeli; yönetici merkezî olarak dağıtamıyor.
- Skill'i güncellersen zip'i **yeniden üretip yeniden yüklemen** gerekir.
  Depoyu güncellemek claude.ai'deki kopyayı değiştirmez.

## Adım 2 — Proje kur ve canon'u yükle

claude.ai'de **Kanlı Göz** adında bir Proje aç, proje bilgisine şunları yükle:

- `LORE.md` — canon kaynağı, en önemlisi
- `assets/js/data.js` — sitenin bastığı veri
- `TASARIM.md` — sadece tasarım/animasyon işi yapacaksan

Proje bilgisi ~200.000 karaktere kadar alıyor; bu üç dosya rahat sığıyor.

## Adım 3 — Proje talimatına şunu yapıştır

`CLAUDE.md`'nin dosya sistemi varsaymayan hâli. Aşağıdaki bloğun tamamını
Proje talimatları kutusuna yapıştır:

```text
Bu proje bir hikaye lore sitesinin arşivi. Türkçe bir kurgu evreni.

CANON KAYNAĞI
Hikayenin tek doğru kaynağı proje bilgisindeki LORE.md. Bir karakter, güç,
isim veya olay hakkında konuşmadan önce oraya bak. Hatırladığın bir şey ile
LORE.md çelişiyorsa LORE.md doğrudur.

KARAR BEKLEYENLER
LORE.md bölüm 10 "Açık Uçlar" hâlâ açık olanları listeliyor. Şu an iki şey
açık: irade kademeleri (bölüm 3 "DURUM: TASLAK" işaretini taşıyor) ve
vakayiname tarihi (1730 mü 1731 mi). Bunlar hakkında kesin konuşma, karar
verilmiş gibi davranma.

UYDURMA YASAK
Kararı verilmemiş bir şeyi doldurma. Emin değilsen "bu LORE.md'de tanımlı
değil" de ve sor. Örnek başlık, "yakında", uydurma bağlantı, tahmini tarih
üretme. Eksik olanı eksik olarak rapor et.

SİTENİN YAPISI
Statik site: HTML + CSS + vanilla JS. Derleme adımı yok, paket yöneticisi
yok, backend yok, veritabanı yok. Bütün içerik data.js içinde veri olarak
duruyor; HTML sayfaları sadece iskelet.
Kod önerirken: framework yok, CSS framework'ü yok, npm paketi yok, dış
sunucudan çekilen font/betik yok. Sadece düz CSS, düz JS, satır içi SVG.

İÇERİK DEĞİŞİKLİĞİ SIRASI
Önce LORE.md, sonra data.js. İkisi ayrışırsa site yalan söyler.
HTML'e dokunma — yeni karakter/güç/kademe için data.js yeterli.

DİL
Arayüz metinleri Türkçe. Kod içindeki değişken ve fonksiyon isimleri de
Türkçe, mevcut düzene uy.

BOZMA — bunlar bilinçli kararlar, eksik değil
- Menü her HTML dosyasında yazılı, JavaScript üretmiyor. Sebebi: JS
  yüklenmezse navigasyon kaybolmasın.
- Gizleme her zaman hidden özniteliğiyle yapılır, opacity: 0 ile değil.
  Hareket azaltma açıkken bütün geçişler kapanıyor; opacity ile gizlenen
  bir daha görünmez.
- Renk paleti WCAG AA (4.5:1) ölçülerek belirlendi. Değiştirmeden önce
  kontrast ölç.
- Odak halkası silinmez. outline: none yazma.
- Sitede hiç kullanıcı verisi toplanmıyor: form yok, giriş yok, çerez yok.
  Backend önerme, sadelik bilinçli bir tercih.
```

---

## Neyin farklı kalacağını bil

Taşıma birebir değil. claude.ai tarafında şunlar olmaz:

- **Depoyu göremez.** Yüklediğin dosyaların o anki kopyasını görür. Depo
  değişince yüklediklerini yenilemen gerekir.
- **Skill'lerdeki doğrulama komutları sınırlı çalışır.** `node --check` ve
  `diff` gibi komutlar dosya sistemi gerektiriyor; claude.ai'de ancak ilgili
  dosyaları o sohbete yüklersen çalışır. Claude Code'da her zaman çalışır.
- **Değişikliği kaydedemez.** Düzenlenmiş dosyayı sana indirtir; depoya
  yazma, commit ve push sadece Claude Code tarafında.

Pratik bölüşüm: **konuşma, planlama, canon sorusu** claude.ai'de;
**dosya değiştiren iş** Claude Code'da.

## Kaynaklar

- [Agent Skills — genel bakış (yüzeyler arası kullanım ve senkron kısıtı)](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Claude Code'da skill kullanmak](https://code.claude.com/docs/en/skills)
- [Claude'da skill kullanmak (claude.ai)](https://support.claude.com/en/articles/12512180-use-skills-in-claude)
- [Özel skill nasıl oluşturulur](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)
- [Skill yazım iyi uygulamaları](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
