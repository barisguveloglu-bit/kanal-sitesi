# Buradan Başla

Bu, senin **çok ajanlı kişisel asistan sistemin**. Beş uzman ajan var; her biri
farklı bir işte iyi ve gerektiğinde birbirlerinin çıktısını kontrol ediyorlar.

Kod yazman gerekmiyor. Ajanlar sadece **düz metin dosyaları** — istediğin an
açıp içindeki cümleleri değiştirebilirsin.

---

## Ekipte kim var

| Ajan | Ne zaman devreye girer |
|---|---|
| 🔵 **arastirmaci** | Güncel bilgi lazım olduğunda. Aramayı yapar, kaynak verir. |
| 🔴 **dogrulayici** | Bir şeyin doğruluğundan emin olmak gerektiğinde. Hata avlar. |
| 🟢 **ogretmen** | Bir konuyu sıfırdan öğrenmek istediğinde. Basit dille anlatır. |
| 🟣 **odev-yazar** | Ödev, rapor, kompozisyon gerektiğinde. Dosyaya kaydeder. |
| 🔵 **ozetleyici** | Uzun bir metni kısaltmak gerektiğinde. Hızlı ve ucuz. |

---

## Kurulum

İki seçenek var. **A seçeneği daha kolay**, onunla başla.

### A) Her yerde çalışsın (önerilen)

Ajanları bilgisayarındaki genel klasöre kopyalarsın, böylece hangi projede
olursan ol kullanabilirsin.

**Mac / Linux** — terminali aç ve şunu yapıştır:

```bash
mkdir -p ~/.claude/agents
cp asistan-ekibi/.claude/agents/*.md ~/.claude/agents/
ls ~/.claude/agents
```

**Windows (PowerShell):**

```powershell
mkdir -Force "$env:USERPROFILE\.claude\agents"
copy asistan-ekibi\.claude\agents\*.md "$env:USERPROFILE\.claude\agents\"
dir "$env:USERPROFILE\.claude\agents"
```

Son komut 5 dosya listelemeli:
`arastirmaci.md`, `dogrulayici.md`, `odev-yazar.md`, `ogretmen.md`, `ozetleyici.md`

> ⚠️ **Kurulumdan sonra Claude Code'u kapatıp yeniden aç.** `agents` klasörü
> oturum başlarken yoksa Claude onu fark etmez. Bu en sık takılınan yer.

### B) Sadece bu klasörde çalışsın

Hiçbir şey kopyalamana gerek yok. Terminalde `asistan-ekibi` klasörüne girip
Claude Code'u orada başlat:

```bash
cd asistan-ekibi
claude
```

Ajanlar otomatik yüklenir. Ama sadece bu klasörde geçerli olur.

---

## Çalışıyor mu? (kontrol)

Claude Code'da şunu yaz:

```
arastirmaci ajanını kullanarak bugün İstanbul'da hava nasıl araştır
```

**Beklenen:** Claude "arastirmaci" ajanını çağırdığını gösterir, ajan internette
arama yapar ve sana kaynaklı bir cevap döner.

**Olmadıysa:** Claude Code'u kapatıp aç. Hâlâ olmuyorsa dosyaların doğru yerde
olduğunu `ls ~/.claude/agents` ile kontrol et.

---

## Nasıl kullanılır

### 1. Sadece iste — Claude uygun ajanı kendi seçer

```
Türkiye'de elektrikli araç satışları 2025'te ne kadar arttı?
```

Claude bunun bir araştırma sorusu olduğunu anlar ve `arastirmaci`'yı çağırır.

### 2. Ajanı sen seç

```
@agent-ogretmen blockchain nedir anlat
```

`@` yazıp listeden seçebilirsin. Bu yöntemde o ajanın çalışacağı garanti.

### 3. Ekibi zincirle (asıl güç burada)

```
Sanayi devriminin çevresel etkileri konusunda 800 kelimelik bir ödev lazım.
Önce arastirmaci ile bilgi topla, sonra odev-yazar ile yaz,
en son dogrulayici ile kontrol ettir.
```

Üç ajan sırayla çalışır: biri araştırır, biri yazar, biri denetler.
Tek bir yapay zekanın yaptığından daha güvenilir sonuç çıkar.

---

## Kullanışlı örnek komutlar

```
Bu PDF'i ozetleyici ile özetle
```
```
Şu iddiayı dogrulayici ile kontrol et: "Dünyanın en uzun nehri Nil'dir"
```
```
Bana yapay zekanın nasıl çalıştığını ogretmen ile en baştan anlat
```
```
Fotosentez hakkında 500 kelimelik ödev yaz, sonra kontrol ettir
```

---

## Ajanları kendine göre değiştirmek

Her ajan tek bir metin dosyası. Aç, oku, değiştir. İki bölümü var:

```markdown
---
name: arastirmaci          ← Ajanın adı (değiştirirsen çağırma şeklin değişir)
description: ...           ← Claude'un "bunu ne zaman kullanayım" diye baktığı yer
tools: WebSearch, ...      ← Ajanın kullanabileceği araçlar
model: sonnet              ← Hangi model çalışsın
---

Sen bir araştırma uzmanısın...   ← Ajanın talimatları. İstediğin gibi yaz.
```

Alt kısımdaki talimatları serbestçe Türkçe yazabilirsin — kod değil, düz cümle.
Kaydettiğin an geçerli olur, yeniden başlatmaya gerek yok.

### Model seçimi

| Yazarsan | Ne olur |
|---|---|
| `haiku` | En hızlı ve en ucuz. Basit işler için. |
| `sonnet` | Dengeli. Çoğu iş için doğru seçim. |
| `opus` | En akıllı, daha yavaş. Zor işler ve kontrol için. |

Bu takma adlar **her zaman o an geçerli en yeni sürüme** bakar. Model numarası
yazmana gerek yok — Anthropic yeni model çıkardığında ajanların kendiliğinden
güncellenir.

---

## Bilmen gereken sınırlar

- **Ajanlar sana soru soramaz.** Alt ajanların kullanıcıya soru sorma yetkisi
  yok. Görevi baştan net anlat.
- **Ajanlar birbirini doğrudan çağırmaz.** Sırayı ana konuşma yönetir. Zincir
  istiyorsan yukarıdaki gibi tek mesajda sırayı söyle.
- **Ödevler taslaktır.** `odev-yazar` sana iskelet ve içerik verir; teslim
  etmeden önce kendi cümlelerinle gözden geçir — hem doğru olur hem senin olur.
- **Yapay zeka hata yapar.** `dogrulayici` bunun için var, ama o da mükemmel
  değil. Önemli bir işte kaynaklara kendin de bak.
