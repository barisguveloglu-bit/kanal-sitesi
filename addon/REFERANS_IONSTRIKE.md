# Ionstrike (Max Steel) — Bedrock'a taşınabilirlik listesi

**Bu dosya bir kez yazıldı.** Kullanıcı jar'ı tekrar yüklemesin, ben de modu
tekrar taramayayım diye burada duruyor. Sıradaki iş seçilirken buraya bakılır.
(`REFERANS_BORALO.md` ile aynı düzen.)

---

## Kaynak

| | |
|---|---|
| dosya | `mod.jar` (643 KB) |
| modid | `ionstrike` v1.0.0 |
| yapan | Bionic |
| platform | Minecraft **Java**, **Palladium** eklentisi (`palladium ≥ 4.4.2`) |
| yükleyici | `lowcodefml` — **derlenmiş sınıf YOK, her şey JSON** |
| md5 | `a0fee04d4ab2e14c89f381dcc298dbcd` |

Konusu **Max Steel**: tek bir takım, birçok **mod** (base, strength, speed,
flight, stealth, heat, scuba, recon, titan…).

**`lowcodefml` olması büyük avantaj:** BoraLo'da bytecode çözmek gerekmişti,
burada sayılar doğrudan `data/ionstrike/palladium/powers/*.json` içinde yazılı.

## Boyut

```
588 dosya · 275 JSON · 278 PNG · 3 ogg · 1 nbt
37 güç (power) · 26 eşya · 11 aksesuar · 40 adet 64x64 takım dokusu
```

---

## Taşınabilirlik

### ✅ Yapıldı

| ne | sürüm | not |
|---|---|---|
| **Zırh Yükseltmesi** | v4.91 | 4 giyilebilir parça + 9 mod; sayılar `powers/*.json`'dan okundu |
| **Mod dönüşümleri** | v4.94 | 9 modun **kendi takımı** (model + doku), `render_layers/*.json` zinciri çözülerek |
| **Dönüşüm çakması** | v4.94 | `transform_flash` = lightning_sparks `#1AE2F0` → `electric_spark_particle` |

### 🟢 Kolay — altyapımız hazır

| ne | referanstaki hâli | Bedrock'ta nasıl |
|---|---|---|
| **Isı ışını** | `heat_mode` energy_beam 20/10/10 + fireball | göz lazeri motoru hazır, sayı değiştirmek yeterli |
| **Titan ışını** | `titan_mode` energy_beam 50 | aynı motor |
| **Turbo Lash / Sword** | `energy_beam` 5 + eşya | silah motoru hazır (v4.87) |
| **Klon modu** | `minion/clone*.json` — 3 klon çağırıyor | **bot sistemimiz zaten bu**; İlkel Beşli'nin altyapısı |
| **Nova Ring** | aksesuar + bağışıklıklar | eşya + efekt |
| **Ion Sword / Steeless Sword** | eşya + komut | düz eşya, `minecraft:damage` |
| **Renkli takımlar** (11 renk) | `accessories/*_suit.json` | 11 doku hazır, her biri ayrı attachable |
| **Meteor yapısı** | `worldgen/structure/meteor` | Bedrock `.mcstructure` istiyor — elle yeniden çizmek gerekir |

### 🟡 Orta

| ne | zorluk |
|---|---|
| ~~Modun görünümü değişsin~~ | ✅ **v4.94'te yapıldı** — attachable yerine oyuncu modeli paketi (v4.90 makinesi) kullanıldı, `arrays + query` yoluna hiç girilmedi |
| **Uçuş modu** | `heroic_flight_type` Palladium'a özel. Bizde `kol_ucus` var, üstüne kurulur |
| **Ability wheel** (güç çarkı) | Palladium'un kendi arayüzü; bizim menümüz zaten bunu yapıyor |

### 🔴 Zor ya da imkânsız

| ne | neden |
|---|---|
| **Size / Titan büyümesi** | `scale multiply pehkui:base 2 @s` — **Pehkui** modu gerekiyor. Bedrock'ta oyuncu ölçeklenemiyor |
| **`intangibility`** (duvardan geçme) | Palladium yeteneği; Bedrock'ta oyuncu çarpışması script'ten kapatılamıyor |
| **`entity_reach +33`** | oyuncunun erişim mesafesi Bedrock'ta ayarlanamıyor |
| **`armor_toughness`** | Bedrock'ta özel eşyaya tokluk verilemiyor — biz Direnç ile karşıladık |
| **`voice_commands`** (24 komut) | sesli komut; Bedrock'ta karşılığı yok |
| **KubeJS betikleri** | 10 `.js` dosyası KubeJS'e bağlı, Java tarafı |

---

## Okunan gerçek sayılar

Bunlar `powers/*.json`'dan **okundu**, tahmin değil. Bir daha bakmaya gerek yok.

| mod | sayılar |
|---|---|
| `base_mode` | armor **+20** · toughness +15 · fall_resistance +10 |
| `strength_mode` | attack_damage **+15** · armor +30 · destroy_speed +2 · dual_wielding |
| `speed_mode` | movement +1 (×2) · attack_speed +5 · destroy_speed +5 · step_height +2 · intangibility · fluid_walking |
| `flight_mode` | space_breath · 3× hasar bağışıklığı · armor +20 |
| `stealth_mode` | invisibility · armor +20 · vibrate · name_change |
| `heat_mode` | armor +25 · ışın 20/10/10 · fireball + small_fireball · ateş bağışıklığı |
| `hydroheat` | armor +25 · ışın 15 ve 20 |
| `scuba_mode` | swim_speed +5 · armor +20 · su altında nefes |
| `recon_mode` | armor +20 · entity_glow · vibrate |
| `cannon_mode` | armor **+40** · toughness +20 |
| `super_mode` | armor +40 · attack +10 · attack_knockback +4 · knockback_res +10 · ışın 15 |
| `titan_mode` | armor **+80** · toughness +75 · attack **+80** · reach +33 · gravity −0.02 · ışın 50 |
| `nova` | bağışıklıklar · space_breath |

**Çeviri kuralı** (iki motor aynı şeyi söylemiyor):

```
Güç I = +3 hasar        ->  +15 = Güç V        (BİREBİR)
Direnç seviye başına %20 ->  zırh+tokluk zaten %80'de tavan yapıyor
movement +1              ->  oyuncunun 11 katı; niyet Hız V ile karşılandı
                             (TEK yaklaşık satır, bilerek)
armor_toughness          ->  Bedrock'ta verilemiyor, Direnç ile karşılandı
```

Eşleme tablosu `ayarlar.js: ZIRH_MODLAR` içinde satır satır yazılı, ve
`zirh.mjs` testi sayıları **jar'ın kendi JSON'uyla** karşılaştırıyor.

---

## Alınan dosyalar

`kaynak_doku/NEREDEN.md` — her dokunun modun içindeki yolu orada yazılı.

---

## v7.95.5 · İKİNCİ TARAMA — belge eksikmiş

Kullanıcı jar'ı yeniden yükledi. **Dosya birebir aynı** (md5
`a0fee04d4ab2e14c89f381dcc298dbcd`, 643 KB, 588 dosya) — yeni sürüm değil.
Ama yeniden tarayınca yukarıdaki listenin **eksik olduğu** çıktı.

"Bir kez yazıldı, tekrar taramayayım" notu bu yüzden tehlikeli: belge
tam sanılıyor, oysa ilk taramada atlanan şeyler var. Aşağıdakiler
o taramada **hiç geçmiyordu**.

### Modların resmî listesi nereden okunur

`powers/voice_commands.json` modun **kilit açma sistemi**: `<Ad>_Unlock`
biçiminde 11 yetenek + Base. Yani asıl mod listesi budur, 12 mod:

```
Base · Cannon · Clone · Flight · Heat · Recon · Scuba
Shrink · Speed · Stealth · Strength · Titan
```

**Bizde 9 var.** Eksik üçü: **Cannon · Clone · Shrink**.

### `size_mode` (Shrink) — belgede hiç yoktu

14 yetenek. `fall_resistance 100 · armor 20 · toughness 15`.
Üç tuşlu geçiş: **`size_grow` · `size_shrink` · `size_manip`**,
boyut `scale set pehkui:base` ile ayarlanıyor.

### `strength_mode`'un İKİNCİ alt modu: **EXO** — belgede hiç yoktu

Güç modunda **iki** ayrı `toggle` tuşu var, biri bizde yok:

| toggle | ne yapıyor | bizde |
|---|---|---|
| `drill_hands` | matkap eller · `destroy_speed +2` · `tool_hands` · dual_wielding | **var** (`zirh_matkap`) |
| `exo_render` | **EXO** — `attack ×2` · `knockback ×4` · `health_boost` kademe 5 (+20 can) | **YOK** |

`exo_stats` gizli (`hidden: true`); koşulu `exo_render` açık mı diye
soruyor, yani EXO görünümü açılınca istatistikler kendiliğinden geliyor.

Ayrıca `strength_stats` ilk taramada okunmamış — güç modu oyuncuyu
**iki katına çıkarıyor**: `scale pehkui:base 2` · `entity_reach 2` ·
`knockback 2`. Bizim güç modumuzda boyut/erişim değişimi yok.

### `ion_power` — belgede hiç yoktu

14 yetenek. `ion_blast` ışını (**5 hasar · 30 blok**), pasif
`jump_boost` + `regeneration` + `saturation`. Dört tuş:
`turbo_stat_boost` · `turbo_energy_construction` · `manual_charge` ·
`ion_blast`.

### Gizlilik birleşimleri — belgede hiç yoktu

Modlar **çiftlenebiliyor**; her birinin `return_<mod>` tuşuyla geri
dönüşü var:

| birleşim | ek |
|---|---|
| `strength_stealth` | görünmezlik + güç modunun tamamı (armor 30, attack 15, 2× boyut) |
| `flight_stealth` | görünmezlik + uçuş |
| `scuba_stealth` | görünmezlik + `swim_speed 5` |
| `scuba_flight` | `fall_resistance 200` + `swim_speed 5` |
| `speed_stealth` | **kaynakta BOZUK** — dosya 0 bayt |

`speed_stealth.json`'ın boş olması modun kendi hatası; diğer dört
birleşim sağlam.

### İlk taramada olan ama eksik yazılan

`super_mode` satırı vardı ama tuşları yazılmamıştı: **`laser_eyes`**
(15 hasar / 30 blok), `boost` (`flight_speed` 3'e set),
`destructive_flight`, ve `splode_immune` (patlama bağışıklığı).

### Buradan çıkan kural

Bir referans belgesi "bitti" diye işaretlenmez. Bu belge iki yıl
"tam" sayıldı ve **beş mod/alt mod eksikti**. Yeniden taramak ucuz;
eksik belgeye güvenmek pahalı.
