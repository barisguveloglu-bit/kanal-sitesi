# Avaritia Ultimate 1.5.0 — ikinci geçiş (v7.91)

Kullanıcı: *"bence moddaki her şeyi alalım gitsin vallahi zırhı da alalım."*

Zırh [v7.90'da alındı](REFERANS_AVARITIA.md) (Yenilmez Zırh). Bu belge kalan
her şeyin tek tek hükmü.

## Sayı: 117 eşya, 49 modül — ama kaç fikir?

| grup | adet | ne |
|---|---|---|
| **tekillik (singularity)** | 25 | aynı tarifin 25 kopyası (demir, altın, elmas, kalay…) |
| **kademe takımları** | ~35 | blaze / crystal / neutronium / infinity — dört ayrı alet+zırh seti |
| **malzeme** | ~15 | nugget, ingot, gear, pile, ring, lattice, catalyst… |
| **gadget** | ~20 | bileklik, yüzük, saat, anahtar, totem, şemsiye, kova… |
| **yemek/dekor** | ~10 | kozmik köfte, yıldız tatlısı, çorbalar |

49 script modülünün yarısından çoğu **tarif/arayüz tesisatı**:
`compressed_recipes`, `compressor_recipes`, `decompressor`,
`double_compressed_recipes`, `external_recipes`, `recipe_guide`,
`recipe_overrides`, `recipe_viewer`, `extreme_recipes`, `grid_crafting`,
`extreme_anvil`, `smithing`, `enchanter`, `emc_registry`, `shift_variants`,
`availability`, `compat`, `dependency_checker`, `multipliers`,
`avaritia_expand_items`, `expand_extras`, `new_items`, `itemUse`, `main`,
`tesseract_hud`, `ui_filler`, `anvil_rename_button`.

**Gerçek mekanik ~20.**

## ALINDI (bu sürüm: 3)

| bizdeki | kaynak | kaynaktan ayrıldığımız yer |
|---|---|---|
| **Diken Zırhı** | `xtreme_effects.js` thorns surplus | süreli (kaynakta sürekli); yansıma **tavanlı** — vuran kendi vuruşundan ölmesin |
| **Ağaç Devir** | `veinMining.js` | bütçeye uyuyor: 320 blok tek karede yazılamaz, partiye bölündü |
| **Bedrock Kır** | `bedrock_breaker.js` | süre aynen (188 tick); **en alt katman kırılmıyor** |

**En alt katman kuralı kaynakta yok, bizde var.** Kullanıcının "Efsanenin
Dünyası" dünyası **tek kat bedrock** — orada bu yetenek zemini delip dünyayı
kullanılamaz yapardı. Bir yetenek kullanıcının dünyasını geri alınamaz biçimde
bozmamalı.

**`veinMining` adı yanıltıcı:** cevher damarı değil **ağaç** kesiyor —
`affectedBlocks` yalnız `_log`, `_stem`, `_leaves`, `wart_block`,
`mangrove_roots`. Adına bakıp "damar madenciliği" demek yanlış olurdu; koda
bakıldı.

## Bizde zaten var (7)

| kaynak | bizdeki |
|---|---|
| `infinity_elytra_flight` / `glide` | `ucus`, `marvel_suzulme` |
| `teleporting.js` | `isinlanma`, `will_isinlan` |
| `maces.js` (gürz çarpması + düşme bağışıklığı) | `dalis_vurusu` |
| `infinity_totem.js` | Yenilmez Zırh (v7.90) + Savunma Merdiveni |
| `matterCluster.js` (eşya toplama) | `cekic_cagir` |
| `bracelet.js` (yansıma) | artık Diken Zırhı |
| `infinityShieldUmbrella` (yavaş düşme) | merdivenin son basamağı |

## Alınmadı — gerekçesiyle

**25 tekillik + sıkıştırma zinciri.** Avaritia'nın çekirdeği bir **ilerleme
sistemi**: 9×9 tezgahta bin blok sıkıştırıp tekillik, tekillikleri birleştirip
katalizör, katalizörle sonsuzluk. Bu bizim modda karşılığı olmayan bir
**ekonomi**, mekanik değil. Almak demek 9×9 tezgah + 200'den fazla tarif +
kendi arayüzü demek — ayrı bir mod olurdu.

**Dört kademe takım (blaze/crystal/neutronium/infinity).** 35 eşya, 748 doku.
Bizde `kns_*` setleri, Marvel'ın 300 parçası, Ben 10, zırh katmanları zaten
var. Beşinci bir kademe merdiveni kimsenin kullanmayacağı bir şey olurdu.

**9×9 tezgah, aşırı örs, büyücü, smithing.** Hepsi `@minecraft/server-ui`
üstüne kurulu ayrı arayüzler. Yapılabilir ama bu sürümün işi değildi; not
düşüldü.

**`bow_no_consume`, `infinity_bucket`, `infinity_shears`.** "Tükenmeyen eşya"
ailesi. Bedrock'ta eşya tüketimini iptal eden kanca yok; kaynağın yaptığı şey
tüketilen eşyayı geri vermek. Yapılabilir, değeri düşük.

**`tesseract_hud`, `recipe_viewer`, `avaritia_guide`.** Arayüz.

**`emc_registry`, `compat`, `dependency_checker`, `availability`.** Başka
modlarla uyum katmanı; tek başına anlamsız.

## Özet

| | |
|---|---|
| incelenen eşya | 117 |
| script modülü | 49 (gerçek mekanik ~20) |
| **alınan** | **1 zırh (v7.90) + 3 mekanik (v7.91)** |
| zaten vardı | 7 |
| ekonomi/arayüz olduğu için alınmadı | ~10 |
| tek fikrin kopyası | 60+ eşya |
