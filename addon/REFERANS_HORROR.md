# Horror Element Mod 1.6.2 — inceleme

Kullanıcı `.jar`'ı gönderdi: *"hani burada ölmüş Steve'ler, kafası
asılmış şeyler falan var ya — ben skinler göndersem onları
onlarla değiştirebilir misin?"*

**Paket:** 21 MB jar, NeoForge 26.1.2 özel portu (özgün mod
MCreator ile üretilmiş, yazar `Predator97427fr`).
Ad alanı `horror_element_mod`.
Kaynak sayfa: https://www.curseforge.com/minecraft/mc-mods/horror-elements-mod

> **Bu mod ilk kez gönderildi.** Bundan önce gelenler:
> BoraLo (4 sürüm), AlienEvo, Ionstrike, Mahou Tsukai,
> Marvel Project, ViltrumiteCore, Teknoloji Zırhları,
> Blockbuster (iki kez), Blockbench.

---

## Bir hafıza düzeltmesi: kanlı kol buradan GELMEDİ

Kullanıcı sordu: *"Bobby kanlı kolunu buradan aldık, değil mi?"*
**Hayır** — kayıtlar bunu net söylüyor:

| parça | gerçek kaynağı |
|---|---|
| Bobby'nin kol **modeli ve dokusu** | `kns_kolluk_bobby_kanli.geo.json` — **BoraLo Kol Modu V2** (`REFERANS_BORALO_KOL_V2.md`) |
| Kanlı kolun **yetenekleri** | **Bobby1545 Mod V3** (`kollar.js`'te yazılı) |
| chris1545'in kol modeli/dokusu | aynı BoraLo paketi |

Bu modda `bobby`, `bloody arm` ya da `kolluk` geçen **tek bir
dosya yok** — arandı, sıfır sonuç.

Karışıklık anlaşılır: "Bobby" adı iki ayrı yerde geçiyor —
BoraLo **Kol V2**'de model dosyası olarak, BoraLo **V5**'te ise
paketin yazarı olarak (`Bobbykardeşler`).

---

## İçerik (sayıldı)

| ne | adet |
|---|---|
| blockstate | 99 |
| blok modeli | 99 |
| özel (custom) model | 91 |
| blok dokusu | 125 |
| varlık dokusu | **0** — mod tamamen BLOK tabanlı |
| ses | 9 |

**Önemli:** varlık yok. Her şey blok. Yani asılı cesetler de
"yerleştirilen dekor" — canlı bir varlık değil.

---

## Bizi ilgilendiren kısım: kupalar

### Kafalar (15)
`herobrine_head` · `steve_head` · `alex_head` · `impaled_head`
(kazığa geçirilmiş) · `slashed_skull` · `phished_head` ·
`primitive_head` · `spider_head` · `villager_head` ·
`hazzmat_head` · `colonial_marine_head` · `desert_marine_head` ·
`german_officer_head` · `russian_officer_head` ·
`beheaded_body`

### Gövde / asılı (16)
`hanging_corpse_1` · `hanging_corpse_2` · `crucified_body`
(çarmıh) · `self_terminated_body` · `sliced_body` ·
`spiked_body` · `rotten_body` · `hanging_villager` ·
`dead_experiment` · `scientist_body` · `marine_body` ·
`colonial_marine_body` · `hazzmat_body` · `dead_cow` ·
`dead_pig`

---

## ASIL BULGU — doku formatı zaten bizim skinlerimiz

Kupaların dokuları ölçüldü ve **iki ayrı düzen** çıktı:

**1. Gövde / asılı olanlar → 64×64.**
`hanging_corpse_1`, `crucified_body`, `rotten_body`,
`sliced_body`, `self_terminated_body`, `impaled_head`,
`scientist_body`, `hanging_villager`, `dead_experiment` ...
hepsi **64×64**, yani **bire bir Minecraft skin formatı**.

Bunun anlamı büyük: kullanıcının göndereceği bir skin,
**hiçbir dönüştürme olmadan** asılı ceset dokusu olarak
takılabiliyor.

**2. Kafalar → altı ayrı 16×16 yüz.**
`herobrine_head` ve `steve_head` kübik kelle: `face_`,
`derriere_`, `droite_`, `gauche_`, `dessus_`, `coup_` +
32×32'lik bir `colonne_` (direk/kazık).

Bu da sorun değil: bir skinin kafası zaten altı yüz taşıyor
(8×8'lik). Onları **otomatik kesip 2 kat büyütmek** mekanik bir
iş — elle çizim yok.

Birkaç kupa 128×128 ve 256×256 doku kullanıyor
(`hanging_corpse_2`, `marine_body`, `spiked_body`,
`colonial_marine_body`, `hazzmat_body`); onlar skin
formatında değil, bizim işimize yaramaz.

---

## Bedrock'a ne taşınabilir

| şey | durum |
|---|---|
| Kupa **fikri** (asılı ceset, kazıklı kafa, çarmıh) | ✅ alınır |
| Kelle küpünün **oranları**, ipin nereden sarktığı | ✅ ölçülüp alınır |
| Modun **kendi dokuları** | ❌ **alınmıyor** — gerek yok, kullanıcı kendi skinlerini verecek |
| Blok tabanlı olması | ✅ bize de uyuyor; ayrıca depoda çalışan sahte varlık iskeleti de var |
| Sesler (9 ogg) | ⏸ şimdilik gerekmiyor |

### Depoda gereken makine ZATEN var

- **Blok üretimi:** `kuruyan_kutuk_blogu()` / `kuruyan_yaprak_blogu()`
  (v7.11) — opak ve `alpha_test` iki örnek birden
- **Sahte varlık:** `o_sey_kilik`, `kol_dusen_sag/sol`, `kol_gelen`
  — yerçekimi, çarpışma, hasar duyarlılığı ayarlanabiliyor
- **Varlık animasyonu ÇALIŞIYOR** (ölçülmüş gerçek; attachable
  animasyonları çalışmıyor ama varlık olanları çalışıyor —
  `o_sey_kilik` şu an `yuru` oynatıyor). Yani asılı bir ceset
  **sallanabilir**.

Yani kupalar için dışarıdan hiçbir şeye ihtiyaç yok.

---

## Kullanıcının niyeti

Kendi sözleriyle: *"ben en güçlü efsaneyim, ben yenilmezim"* —
kupalar bir **racon**. Örnek: asılmış Herobrine, "Null'u tek
başıma öldürdüm".

Eşya açıklaması alanı bunun için uygun; ad ve açıklama ayrı
ayrı verilebiliyor.

**Bekleyen:** kullanıcı skinleri seçip gönderecek. Her biri için
gereken üç şey: skin dosyası, oyunda görünecek ad, ve biçim
(kafa / asılı ceset / ikisi).
