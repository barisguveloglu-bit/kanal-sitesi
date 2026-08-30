# ViltrumiteCore → Temel zırh

**Kaynak:** `viltrumitecore-forge-1.8.1.jar` — *ViltrumiteCore* (baranhan123),
Forge 47+. *Invincible*'daki Viltrumite ırkı.

Kullanıcı: *"Max Steel modundaki temel zırh var ya, bu mod **sadece** temel
zırhla birleştirilecek, diğer hiçbir şekilde başka bir şeyle değil… çünkü ben
temel zırhın zayıf olduğunu düşünüyorum."*

Haklıydı. v4.95'te ölçülen tabloda Temel'in tek sahip olduğu şey
`Direnç III + slow_falling`'di; diğer sekiz modun **hepsi** aynı ikilinin
üstüne bir şey koyuyordu. Temel, adı üstünde, tabandı.

---

## Sayılar nereden

Modda yapılandırma dosyası yok; her şey bytecode'da ve modun **kendi tooltip
metinlerinde**. İki kaynak:

**`config/ViltrumiteCoreConfig` — kurucu metodun bytecode'u:**

| alan | değer |
|---|---|
| `damageReductionPercent` | `97.0f` |
| `damageIgnoreThreshold` | `0.5f` |
| `punchBlockDropChance` | `40.0f` |
| `dashBlockDropChance` | `40.0f` |
| `spaceLimitY` | `1500.0d` |
| `shouldAskRace` / `isViltrumiteByDefault` | `true` |

**`mixin/PlayerStatsMixin.onInitStatTracker`:**
`STAT_BASE_DAMAGE = 19.0f`, `STAT_HEAL_FACTOR = 1.0f`; diğer ikisi config'ten.

**`ability/ViltrumiteAbilities` — yüzdeler modun kendi cümlelerinde:**
> *"deals **200%** of your base attack damage. If you strike while flying this
> damage can scale up to **500%**."* · *"deals **175%** … bleeding for
> **4 seconds** … **43.75%** damage every second."* · *"Absorbs **70%** of all
> damage taken from the direction you are facing."*

Yani hiçbir sayı hafızadan yazılmadı. Hepsi
[`ayarlar.js:VILTRUMITE_YETENEKLER`](Simsek_TNT_ToprakTopu/scripts/ayarlar.js)
içinde, her biri hangi cümleden geldiğiyle birlikte.

---

## Pasifler (v5.7'de eklendi)

Kullanıcı ekran görüntüsü attı: Temel moddayken yalnız **iki** efekt görünüyordu
(Direnç IV + Yavaş Düşme). *"Çeşitlilik dediğin… diğerleri nerede?"*

Haklıydı. v5.6'da yalnız **yetenekler** aktarılmıştı; modun **pasifleri**
atlanmıştı. Jar'da altı tane daha var, her biri ayrı bir mixin:

| kaynak | ne yapıyor | bizdeki karşılığı |
|---|---|---|
| `EntityFireMixin.makeViltrumiteFireImmune` → `true` | ateş bağışıklığı | `fire_resistance` |
| `EntityFreezeMixin.viltrumiteInfiniteAir` → `getMaxAirSupply()` | hava bitmiyor | `water_breathing` |
| `PlayerStatsMixin.reduceExhaustion` → `× 0.005f` | açlık 200 kat yavaş | `saturation` (yaklaşık) |
| `PlayerStatsMixin.onTick` → `heal(getHealFactor())` | tick başına 1 can | **script** + `regeneration` göstergesi |
| `LivingEntityStatsMixin.rejectDebuffs` → `HARMFUL` reddi | zararlı etki bağışıklığı | **script** (liste `ayarlar.js`'te) |
| `PlayerFreezeMixin.viltrumiteCannotFreeze` → `false` | donma bağışıklığı | **karşılığı yok** — vaat edilmiyor |

Böylece Temel'in efekt sayısı **2 → 6** oldu.

**İki tanesi neden script:**

- *Zararlı etki bağışıklığı* — Bedrock script API'sinde "bu efekt zararlı mı"
  diye bir soru yok (Java'daki `MobEffectCategory` karşılığı yok). Liste
  `VILT_ZARARLI_EFEKTLER` içinde **açıkça** yazılı; test hem listede yanlışlıkla
  faydalı bir efekt olmadığını hem de Temel'in kendi verdiği bir efekti silmediğini
  ölçüyor.
- *Yenilenme* — kaynak her tick `healFactor` kadar iyileştiriyor. `regeneration`
  efektinin Bedrock'taki aralığını (`50 >> amp` mi, `50/(amp+1)` mi) bu ortamda
  ölçemiyorum; tick başına 1 can gibi kesin bir sayıyı tahmine dayalı bir `amp`'e
  bırakmak istemedim. İş script'te, birebir; efekt yalnızca **gösterge** (oyuncu
  bir şey olduğunu görsün diye). İkisi çakışmıyor: can tavanda kesiliyor.

Tarama her tick dönmüyor (bütçe). Geçen tick sayısıyla **çarpılıyor**, yani
ortalama hız kaynakla aynı — ışın lazerlerindeki *"saniyelik hasar aynı kalsın"*
kuralının aynısı.

---

## Aktarılan on yetenek

| yetenek | kaynak | ne yapıyor | sayı |
|---|---|---|---|
| Sonik Yumruk | `viltrumite:punch` | koni hasar + meteor fırlatma + blok kırma | %200, uçarken %500 · 1 sn |
| Ölümcül Darbe | `viltrumite:chop` | anlık + 4 sn kanama | %175 + %175 (sn'de %43.75) |
| Gök Gürültüsü | `viltrumite:thunderclap` | koni şok dalgası, havaya fırlatır | hasar yok |
| Yaylım Ateşi | `viltrumite:barrage` | 4 sn hızlı yumruk serisi | tek vuruş %25 · 4 sn bekleme |
| Atılım | `viltrumite:dash` | ileri fırlama, önündekini ezer | 1 sn |
| Savunma Duruşu | `viltrumite:block` | gelen hasarı emer | %70 · 2 sn · 3 sn bekleme |
| Kavra ve Taşı | `viltrumite:grab` | canlıyı kavrayıp havada taşır | aç/kapa |
| Hedef Kilidi | `viltrumite:lock` | hedefe bakış kilidi | 32 blok, 48'de kopar |
| Süper Hız | `viltrumite:speed` | yerde aşırı hız (uçarken açılmaz) | Hız V |
| Hızlı Kalkış | `viltrumite:fast_takeoff` | gökyüzüne fırlatma | — |

Artı **uçuş**: modun *Cruise Flight*'ı için yeni kod yazılmadı, var olan
`ucus` yeteneği Temel'in listesine eklendi.

Hepsi **tek eşyaya** bağlı: `pa:zirh_mod_temel`. Toprak Kol'daki kalıbın aynısı
(tek eşya, on altı yetenek).

---

## %97 indirim Bedrock'a nasıl sığdı

Direnç seviye başına %20, tavan `amp 3` (**Direnç IV = %80**). `amp 4` tam
bağışıklık ve bu depoda StarOxine'e ayrılmış — oraya girilmiyor. Yani efektle
en fazla %80 verilebiliyor.

Kalan **hasar olayından geri kazandırılıyor** — teknoloji zırhlarındaki geri
kazanım kalıbının aynısı (o da `entityHurt` sonrası can ekliyor ve yeni bir
hasar olayı üretmiyor).

Oran **türetildi**, elle yazılmadı:

```
geri = gelen × (1 − (1 − 0.97) / (1 − 0.80))
     = gelen × 0.85
```

Test bunu tersinden ölçüyor: `1 − (1−0.80)×(1−0.85) = 0.97` — tam.
Ve davranışı da ölçüyor: 100 ham hasarda oyuncuya net **3 hasar** kalıyor.

Savunma Duruşu açıkken formül aynı yerden devam ediyor:
`1 − (1−0.85)×(1−0.70) = 0.955` → net indirim **%99.1**, ölçülen hasar `0.90`.

**Bilinen sınır:** `entityHurt` bir *sonra* olayı — oyun canı zaten düşürmüş
oluyor, kanca yalnızca geri ekliyor. Tek seferde canını sıfıra indiren çok
büyük bir vuruşta geri kazanım yetişmeyebilir. Teknoloji zırhlarının
`olmezlik`'i tam da bunun için var ve aynı yolu kullanıyor; tablette
denenmesi gereken tek nokta bu.

---

## Aktarılamayanlar (uydurulmadı)

- **`viltrumite:speed_lock`** — *"maksimum hızının %20'sinin üstündeyken uçuş
  hızını kilitle."* Bizim uçuşumuz efekt tabanlı; ne anlık hız okunabiliyor ne
  de kilitlenebiliyor. Karşılığı **yok**.
- **Cruise Flight'ın iki parçası** — *"maksimum hızın %60'ında bloktan geçme"*
  ve *"aşırı ısınma"*. Uçuş bir efekt; hız eşiği okunamıyor.
- **`viltrumiteCannotFreeze`** — donma bağışıklığı. Bedrock'ta ne efekti var ne
  de script'ten okunabiliyor (powder snow donması bir efekt değil). Özet bunu
  **vaat etmiyor**; test de vaat etmediğini sınıyor.
- **`spaceLimitY = 1500`** — uçuş tavanı. Bedrock dünyasının tavanı zaten 320;
  1500 hiçbir zaman yakalanmayacak bir ayar olurdu, o yüzden **alınmadı**
  (çalışmayan ayar bırakmıyoruz).
- **Savunma'nın yön şartı** — kaynakta *"baktığın yönden gelen"* hasarı emiyor.
  `entityHurt` hasarın geldiği yönü vermiyor, ayırt edemiyoruz. Bizde savunma
  **her yönden** koruyor. Bu bir sapma, özet de öyle yazıyor.
- **Blok kırma konisinin boyutu** — kaynakta *"huge cone"*. Bizde `blokIste()`
  bütçesi var (`AYNI_ANDA = 2`), koni kasten küçük.
- Modun kendi HUD'ı, yetenek çarkı, NPC doğurucusu ve ırk seçim ekranı —
  bu depoda menü zaten var.

**Hedef Kilidi nasıl çalışıyor:** Bedrock'ta oyuncunun kamerasını döndürmenin
tek yolu `teleport(konum, { facingLocation })`. Konum değiştirilmiyor, yalnız
bakış yönü. Marvel modu da aynı çağrıyı kullanıyor
(`ghost_rider_bike.js`). Tablette takılma yapıp yapmadığı denenmeli.

---

## Diğer sekiz zırh iki katına çıkarıldı

Kullanıcı: *"temel gelen özellikler fazla güçlü olursa diğer zırhların gücünü
iki kat daha arttır, bu tamamen senin kararın."*

Fazla güçlü oldu. Karar: ikiye katlanıyor. Bedrock'ta seviye = `amplifier + 1`
ve etki seviyeyle doğrusal, yani `yeni_amp = 2 × eski_amp + 1`.

| mod | önce | sonra |
|---|---|---|
| Güç | Güç V (+15) | **Güç X (+30)** |
| Hız | Hız V · Acele V · Zıplama II | **Hız X · Acele X · Zıplama IV** |
| Gizlilik | Hız II | **Hız IV** |
| Keşif | Hız I | **Hız II** |
| Isı | ışın 400 | **ışın 800** |
| Titan | Güç XXVII (+81) · lazer 1000 | **Güç LIV (+162) · lazer 2000** |

**İkiye katlanamayan iki şey:**

1. **Direnç.** III (%60) iki katı %120 ederdi. Tavan Direnç IV (%80). Sekiz
   modun hepsi III → IV'e çıktı; Titan zaten IV'tü. Yani direnç "iki kat"
   değil **tavana** çıktı — özetler de öyle yazıyor.
2. **Seviyesiz efektler.** `invisibility`, `water_breathing`, `night_vision`,
   `fire_resistance`, `conduit_power`, `slow_falling` — açık ya da kapalı,
   ara değeri yok. Aynen kaldı.

Bunun bir sonucu var ve gizlenmiyor: **artık Titan, Temel'den daha dirençli
değil.** İkisi de Direnç IV. Temel'in fazlası efektte değil hasar kancasında.
`zirh.mjs`'te bunu sınayan satır (eskiden `titan > temel`) buna göre
güncellendi, silinmedi.

---

## Testler

`test/viltrumite.mjs` — 9 bölüm. En önemlisi **2. bölüm**: kullanıcının açık
şartı ("sadece Temel") liste olarak değil **davranış** olarak sınanıyor —
Titan çekirdeği elindeyken on yeteneğin onu da reddediyor mu.

Üç kasıtlı bozma ile doğrulandı:

| bozma | testin dediği |
|---|---|
| kapıyı kaldır (her çekirdek açsın) | `✗ Titan çekirdeğiyle hiçbir yetenek açılmıyor :: vilt_yaylim` |
| geri kazanım oranını elle `0.9` yaz | `✗ net indirim tam %97 :: %98.0000` |
| bir yeteneği Titan'a da bağla | `✗ Viltrumite yeteneği başka hiçbir moda sızmadı :: titan/vilt_yumruk` |
| zararlı efekt silmeyi kapat | `✗ zehir silindi` · `✗ solma silindi` |
| iyileşmeyi tick ile çarpma | `✗ ilk taramada tarama aralığı kadar iyileşme :: 1 can / 10 tick` |
| `regeneration`'ı zararlı listesine koy | `✗ Temel kendi verdiği efekti silmiyor :: regeneration` |

Ayrıca `zirh.mjs`'in "sayılar kaynakla birebir" sınamaları **silinmedi**,
"tam iki kat" sınamasına çevrildi — yani kazara değişirse yine yakalanır.
