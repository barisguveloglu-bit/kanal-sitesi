# BoraLo MOD V5+ (Bobbykardeşler) — inceleme

Kullanıcı `.mcaddon`'u gönderdi: *"bir tane daha çerezlik mod getirdim, bunu da
incele... alınabilecekleri bana sormadan al."*

Paket: **7,8 MB zip → 20 MB, 1719 dosya.** Yazar `Bobbykardeşler`.
Ad alanı `pa:` — **dikkat: bu bizim ad alanımız.** Aynı anda kurulurlarsa
eşya kimlikleri çakışır.

Paketin kendi açıklaması dürüst: *"§6Bu mod tam yetişmedi bazı eşyalar buglu
olabilir..."*

| bölüm | adet |
|---|---|
| eşya | 126 |
| blok | 51 |
| varlık | 51 |
| function | 332 |
| loot table | 52 |
| **biyom** | **3** |
| **feature / feature_rule** | **5 / 5** |
| **dialogue** | **2** |
| recipe | 179 |
| **script** | **0** |

V4'ün aksine **hiç script yok** — her şey komut, function ve 76 davranış
animasyon denetleyicisi. Buna karşılık V4'te olmayan dört kategori var:
**biyom, feature, dialogue, fog.** Değer orada.

---

## 1. ALINDI: `minecraft:tree_feature` → **Kuruyan Ağaç**

Pakette `codeman_tree` diye **çalışan** bir ağaç özelliği var. Yapısı ölçüldü:

```
fancy_trunk  : trunk_height {base, variance, scale}, trunk_width,
               branches {slope, density, min_altitude_factor},
               width_scale, foliage_altitude_factor
fancy_canopy : height, radius, leaf_block
base_block   : üzerinde bitebileceği bloklar
```

Bu iskelet bize `LORE.md`'nin **merkezindeki** nesneyi verdi. "Unutulan
Efsane — Kuruyan Ağaç" bölümü hikâyenin taşıyıcısı ve bugüne kadar oyunda
**hiç yoktu**.

Alınan: iskelet. Alınmayan: onların blokları, sayıları, ağaç türü.
Ayrıntı `NOTLAR.md` v7.11 bölümünde.

---

## 2. Alınmayanlar ve nedenleri

**Biyom ezmesi — ALINMADI.** Üç biyom dosyası var ve üçünün de `identifier`'ı
**vanilla biyom adı**: `forest`, `taiga`, `birch_forest`. Yani yeni biyom
eklemiyorlar, vanilla biyomların **üstüne yazıyorlar**: `top_material`
`pa:lady_dirt` oluyor, `red_spores: 10` ekleniyor. Sonuç: paketi kuran
herkesin **bütün dünyası** değişiyor. Bu depoda geri alınamayan, oyuncunun
dünyasını değiştiren şeyler alınmıyor.

**Renkli sis — zaten var.** `pa:fog_fog_forest` `#ff0004` (kan kırmızısı),
`taiga` `#ff00b1`, `birch_forest` beyaz. Fikir güzel (biyoma bağlı sis) ama
bizde `sis.js` v6.6'dan beri var ve rengi skinden **ölçülmüş**.

**NPC dialogue — alınmadı.** `minecraft:npc_dialogue` ile gerçek bir konuşma
ağacı var (`pa_bobby1544_bot`, kızgın formu, kit veren düğmeler). Bizim
botumuzun zaten menüsü var; ikincisini eklemek "kol israfını önle"
kuralının blok hâli olurdu.

**Cevher özellikleri — BOZUK, alınmadı.** `pa_bash2313ore_feature` ve
`pa_zoggy1545_ore_feature` **iki kez** ölü:

```json
"replace_rules": [{ "places_block": null, "may_replace": [] }]
```

Hiçbir şey koymuyor, hiçbir şeyin yerine de geçmiyor. Üstüne kuralda
`"minecraft:biome_filter": [{"any_of": []}]` — **boş `any_of` hiçbir biyomla
eşleşmez.** Yani o cevherler oyunda hiç oluşmuyor.

Bizim `freedom_stone_ore_feature`'ımız doğru yazılmış (`places_block` gerçek,
`may_replace` üç blok, biyom testi gerçek) — `agac.mjs` 7. bölüm artık bunu
da **kilitliyor**, aynı hata bize sonradan girmesin diye.

**179 tarifin 175'i BOŞ.** Dosyaların içeriği harfiyen `{}`. Gerçek tarif
sadece 4 tane. Paketin kendi "tam yetişmedi" uyarısı doğruymuş.

---

## 3. Bir sonraki tur için duran fikirler

Bunlar ölçüldü, alınmadı, ama iyiler:

- **Özel ağaç türleri** — `lady_tree`, `custom_tree_feature` da çalışıyor.
  Kuruyan Ağaç'ın yanına ikinci bir ağaç gerekirse iskelet hazır.
- **`minecraft:npc_dialogue`** — botun konuşması istenirse yol belli.
- **Biyoma bağlı sis** — biyom ezmeden, sadece `fogs/` ile de yapılabilir.
