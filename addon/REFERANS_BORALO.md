# Zabri Studios BoraLo Mod — Bedrock'a taşınabilirlik listesi

**Bu dosya bir kez yazıldı, bir daha analiz yapılmayacak.** Kullanıcı jar'ı
tekrar yüklemesin, ben de modu tekrar taramayayım diye burada duruyor.
Sıradaki iş seçilirken buraya bakılır.

---

## Kaynak

| | |
|---|---|
| dosya | `ZabriStudiosv2.21.12.2_2_1.jar` (26 MB, açılınca 78 MB) |
| modid | `boralo_mod` v2.1.0 |
| yapan | MemirZabri Studios (Memir Zabri, iEmir) |
| platform | Minecraft **Java** 1.12.2 Forge |
| bağımlılıklar | `ebwizardry` (Electroblob's Wizardry), `moreplayermodels` |
| md5 | `5a45eeece0ac59f3c868383a527c4380` |

Ayrıca **mini sürümü** var: `merhaba.jar`, modid `newzabri`, aynı ekipten.
İçindekiler bunun alt kümesi (`md5 3ea25e674074488f4ed5784b516a40a0`).

**Java modu — kodu Bedrock'ta çalışmaz.** Alınabilecek şeyler: dokular, sesler
ve *mekanik fikirler*. Her fikir Bedrock'a yeniden yazılıyor.

## Boyut

```
6174 sınıf · 2598 doku · 69 ses · 74 yapı (.nbt) · 2211 satır dil dosyası
833 eşya · 471 blok · 178 varlık · 103 efekt · 8 biyom
```

---

## Taşınabilirlik — dört kova

### ✅ Yapıldı

| ne | sürüm | not |
|---|---|---|
| El-Harkos'un asası | v4.49–v4.83 | zincir bizim, doku onların |
| Freedom Stone | v4.86 | adı ve dokusu onlardan |
| Resetting Sword | v4.86 | `gamemode spectator` + alan temizliği |
| Taşa çevirme | v4.86 | süreli + Freedom Stone ile kırılır |
| Silah sistemi | v4.87 | 6 silah, mermi + bekleme + ışın taraması |
| **O Şey** (That Thing) | v4.88 | 6 kol + çift beden; geometri jar'ın bytecode'undan çözüldü, doku kendi skinimizden türetildi |
| Hiperoksin ailesi | v4.x | iksir hiyerarşisi bu moddan doğdu |
| Bobby Bot | v4.22+ | bizim bot sisteminin atası |
| Toprak Kol | v3.x | `reinforced_arm` |

### 🟢 Kolay — Bedrock'ta doğrudan karşılığı var

| ne | ne yapıyor | Bedrock'ta nasıl |
|---|---|---|
| **Fallen** efekti | oyuncuyu "Fallen"a çevirir, skinini değiştirir | skin değişmez ama **attachable** ile kaplama yapılır — göz sistemimizin aynı tekniği |
| **Stone Man** varlığı | taş dev | `pa:` varlık + skin; İlkel Beşli'nin altyapısı hazır |
| **Bio Gun** | vurduğunu "bioblob"a çevirir | silah motoru hazır, sadece çarpma etkisi |
| **Spine Gun / Taser** | sersemletme türevleri | sersemletici zaten var, satır eklemek yeterli |
| **Bone araçları** (kılıç, kazma, kürek, çapa) | kemikten set | düz eşya, `minecraft:digger` + `damage` |
| **Big pickaxe** (ahşap→elmas) | geniş alan kazan kazma | blok bütçesiyle iş kuyruğu, Toprak Kol'daki gibi |
| **Anvil Backpack** | sırt çantası zırhı | `minecraft:wearable` + attachable |
| **Collar** | tasma | eşya + hedef kilidi |
| **Coffin** | tabut bloğu | bizim mezar sistemi zaten bu; 4 doku hazır |
| **Anna Disc** | müzik plağı | `minecraft:record` + `.ogg` (69 ses dosyası var) |

### 🟡 Orta — yapılabilir ama iş var

| ne | zorluk |
|---|---|
| **Portal Gun (mavi/sarı)** | iki nokta arası ışınlanma — boyut değil, sadece konum çifti. Bizde `isinlanma.js` var, üstüne kurulur |
| **Gravity Gun** | zaten yaptık (`cekim_silahi`), ama referansın "bloğu tutup taşıma" kısmı ayrı iş |
| **Realm Stone**'lar (7 tane) | her biri bir varlığı çağırıyor; bot sistemi hazır |
| **Bloody Altar** | çok bloklu yapı + ritüel; efsane yapısı kodumuz benzer |
| **74 `.nbt` yapısı** | Bedrock `.mcstructure` istiyor, format farklı — elle yeniden çizmek gerekir |
| **178 varlık** | teknik olarak hepsi mümkün (İlkel Beşli beşini, O Şey altıncısını yaptı) ve model artık **elle ölçülmüyor** — `jar_model_coz.py` sınıfın bytecode'unu okuyup geometriyi çıkarıyor. Her biri yine: doku + varlık JSON + istemci tanımı + davranış |

### 🔴 Zor ya da imkânsız

| ne | neden |
|---|---|
| **8 özel boyut** (Blood Sky, Paradox, Codeman's Universe…) | Bedrock'ta custom dimension **script'ten yapılamaz**. Nether/End'i yeniden temalamak dışında yolu yok |
| **8 özel biyom** | boyutlara bağlı; ayrıca biyom eklemek deneysel ayar istiyor |
| **`mpm url @p <skin>`** | MorePlayerModels'e bağlı, Bedrock'ta oyuncu skini script'ten değiştirilemez |
| **Skin paketiyle özel geometri** | Mojang kaldırdı; `skins.json` yalnızca `geometry.humanoid.custom` / `customSlim` kabul ediyor. Dolaşan "4D skin"ler Marketplace imzalı ya da yamalı istemci istiyor |
| **`cast ebwizardry:petrify`** | Wizardry modunun büyü sistemi; taşa çevirmeyi biz kendi yolumuzla yaptık |
| **Java `/fill`, `/setblock` zincirleri** | Bedrock'ta çalışır ama bütçesiz; biz iş kuyruğuna çeviriyoruz |
| **Özel GUI** (`GuiReinforcedDirtArmGUI`) | Bedrock'ta form API'si var ama Java GUI'si taşınmaz; menümüz zaten var |

---

## Referanstan çıkarılmış gerçek davranışlar

Bunlar derlenmiş sınıflardan okundu, tahmin değil. Bir daha bakmaya gerek yok.

**Resetting Sword** (`proximity_projection`)
```
gamemode spectator / gamemode survival
fill ~5 ~5 ~5 ~-5 ~-5 ~-5 air
```
Ayrıca vurduğu yere uzun ot / çift bitki geri ekiyor.

**Stone Converterer**
```
kurbana PotionStonedPotion  +  cast ebwizardry:petrify @p
```
Efekt başlarken heykel bloğu koyuyor, zırh yuvalarına taş kaplaması
giydiriyor; bitince blok kalkıyor.

**Fallen**
```
mpm url @p https://t.novaskin.me/<hash>     (giyerken)
mpm url @p clear                            (çıkarken)
effect @p clear boralo_mod:fallen
```

**Bobby Bot**
```
summon boralo_mod:bobby_bot_steve ~ ~ ~ {Owner:"<oyuncu>"}
```

**Oyuncunun kendi modelini değiştirmek** (v4.90'da çözüldü — referansın en değerli tekniği)

Bu modun Bedrock paketleri `entity/player.entity.json`'u **eziyor** ve elindeki
eşyaya göre oyuncuya fazladan geometri çizdiriyor. Dört pakette de aynı kalıp:

```jsonc
"geometry":    { "elharkos": "geometry.elharkos" }
"pre_animation": "variable.elharkos = query.get_equipped_item_name('main_hand') == 'elharkos';"
"render_controllers": [ { "controller.render.elharkos": "variable.elharkos" } ]
```

`get_equipped_item_name` **ad alanını atıyor** (`pa:x` → `x`) — bu tuzağa
düşülürse koşul hiç tutmaz. Gövdeyi *değiştirmek* için bir adım daha gerekiyor:
vanilla `third_person` denetleyicilerini `&& !variable.X` ile kapatmak.

Bizde: `Simsek_Oyuncu_Modeli` paketi, taban dosya `oyuncu_modeli_taban/`.

**Java model sınıfları — nasıl okunuyor** (v4.88'de kuruldu)

Modun 178 varlığının modeli `ModelBase` alt sınıflarında, kurucu içinde
gömülü. `javap -c -p <sınıf>` çıktısındaki çağrılar:

| çağrı | anlamı |
|---|---|
| `func_78793_a(FFF)` | `setRotationPoint(x, y, z)` |
| `ModelBox.<init>(…IIFFFIIIFZ)` | `addBox(u, v, x, y, z, w, h, d, ölçek, ayna)` |
| `func_78792_a` | `addChild` |
| `func_78795_f/78796_g/78808_h` | `rotateAngleX / Y / Z` (radyan) |
| `func_78087_a` | `setRotationAngles` — yürüyüş animasyonu |

Çözücü betik: **`addon/jar_model_coz.py`**. **Yeni bir varlık taşınacaksa
sınıfın adını verip aynı betiği çalıştırmak yeterli** — model elle
ölçülmüyor, hafızadan yazılmıyor.

**Java → Bedrock çevirisi** (ölçüldü, bkz. `NOTLAR.md` v4.88)
```
konum   : x aynı · z aynı · uv aynı · y = 24 - y
dönme   : bedrock_dosya = [ -rx_java, +ry_java, +rz_java ]
```
Bedrock'un `rotation` değeri matematiksel sağ-el dönüşünün TERSİ; bu
elimizdeki paketlerdeki 1184 dönmüş küp üzerinde ölçüldü (948'e 236).

**Silahlar** — hepsinin iskeleti aynı:
```
esya + MERMI esyasi + bekleme (CooldownTracker) + ses + çarpma etkisi
```
Bazuka çarpınca `world.createExplosion`; PDW `advanced_magazine` tüketip
`advanced_magazine_empty` bırakıyor ve `boralo_mod:pdw_reload` çalıyor.

---

## Alınan dosyalar

`kaynak_doku/` altında duranlar ve modun içindeki yolları:
`NEREDEN.md` dosyasına bakılır — her dokunun kaynağı orada yazılı.
