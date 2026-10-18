# `mods.rar` (4 Ekim) — Fabric 26.2 mod paketi

Drive'daki **ikinci** `mods.rar`. Birincisi (20 Eylül, Forge 1.20.1,
süper kahraman paketi) `REFERANS_MODS_RAR.md`'de. Bu dosya ona dayanmıyor;
**tamamen ayrı bir paket**.

**Hiçbir dosya çalıştırılmadı, kurulmadı, depoya alınmadı.** Arşiv
scratchpad'e indi, jar'ların yalnız `fabric.mod.json` ve dil dosyaları
okundu.

## Kaynak

| | |
|---|---|
| Drive | `mods.rar`, sahibi `f13videodrive`, yüklenme 2026-10-04 |
| kimlik | `1mEtGIo1hl4XQCgIIj67E7sZ51pm0vPLY` |
| boyut | 147.770.769 bayt — Drive'daki boyutla birebir aynı |
| md5 | `5f9672094ce2bacebea6e5a9a066294e` |
| sha256 | `b28e2ba4069e4a5ccacb803b5432d756d4348e6f9f1aa92be3851f24a6910e5a` |
| içerik | **69 jar**, hepsinin tarihi 4 Ekim |
| platform | **Fabric**, Minecraft **26.2** (tek istisna Visuality: 26.3 için yapılmış, `>=26.2` kabul ediyor) |

**Zorunlu bağımlılıkların hepsi pakette** (gömülü jar'lar ve `provides`
dahil sayıldı).

**Depoyla bağlantı:** içindeki `geckolib-fabric-26.2-5.5.5.jar`,
`arac/geckolib/` altındaki NeoForge jar'ıyla **aynı sürüm** (5.5.5,
Minecraft 26.2) ama Fabric yapısı (md5 `d94e346c96833b09b0c1c933b88b63e8`;
NeoForge'unki `b0a8451d8ed2fb66bfe3ef056ae2f03f`). Kural tablosunu ürettiğimiz
GeckoLib'le aynı oyun sürümü.

## Kısa cevap: bu paket ne

**Köylü–yağmacı savaşı + gece korkusu** temalı, vanilla'ya yakın bir
26.2 paketi. Süper güç, patlayıcı ya da teknoloji modu yok (Create dışında).
**Tahmin:** bir seri ya da video için kurulmuş dünya.

## İçerik modları

### Köylüler ve yağmacılar

| mod | ne getiriyor |
|---|---|
| **Millager** 0.7.7 | köylülere **ordu**: Archer, Lancer (süvari), Mauler, Breacher, Doctor, Swordmaster, Scouter, Rioter, Bee Golem. Muster Order (piyade / süvari / rastgele) ve meslek emirleriyle asker toplanıyor; Molotov Cocktail, TNT on a Stick, Explosive Arrow, Buckler, şifa totemleri |
| **Takes a Pillage** 1.0.13 | yağmacı **kampları ve kaleleri**; Legioner, Skirmisher, Archer, Clay Golem; Ravager Horn |
| **Illager Expansion** 1.11.1 | 11 yeni illager: Alchemist, Archivist, Basher, Firecaller, Inquisitor, Invoker, Marauder, Necromancer, Provoker, Sorcerer, Surrendered; Platinum Infused Netherite alet ve zırh seti |
| **Immersive Pillagers** 0.1.5 | ölümsüz yağmacılar (Undead Pillager / Vindicator / Evoker); Wanted Poster, Raider's Horn, Crude Totem of Undying |
| **Magical Scepter** 1.2.1 | tayga kulübesinde yaşayan Sorcerer; büyü atan asalar (ateş topu, ejder ateşi, Wither kafatası, Guardian ışını) |
| Villager Warship · Villager Fletcher House · Qrafty's Japanese Villages | yapılar: okyanusta köylü savaş gemisi, ovada okçu evi, kiraz biyomunda Japon köyleri |
| Grab Villager · Leashable Villagers | köylüyü kucaklayıp taşımak ve fırlatmak; köylüye tasma |

### Gece ve korku

| mod | ne getiriyor |
|---|---|
| **The Graveyard** 2.6.2 | 14 varlık (Acolyte, Corrupted Champion / Pillager / Vindicator, Ghoul, Nightmare, Reaper, Revenant, Wraith, Skeleton Creeper…), 107 blok (tabutlar, mezar taşları, sunak), 4 biyom |
| **Nycto** b8 | **vampirler ve avcılar**; vampire dönüşme ya da avlama, 40 güç girdisi, sarımsak, kazık, aconite kaplı teber |
| Direbats | karanlık mağaralarda yaşayan dev yarasalar |
| **Anthropophagy** | "şüpheli bir yiyecek kaynağı": **insan eti** eşyaları ve Piglutton varlığı |
| RedFX | kan parçacıkları ve görsel efekt |
| Catfighting | kediler kavga ediyor |

### Dünya ve yolculuk

Structory + Structory Towers (atmosferik yapılar ve kuleler), Pale Pumpkin
ve Pale Garden Sword Pedestal (Pale Garden biyomu), **Sky Trader** (bilet
satıp ghast'la uçuran tüccar), **Waystones** (ışınlanma taşları),
**Zipline**, **Simple Boats** (18 tekne türü), Umbrellas (şemsiye).

### İnşa

**Create Fly** 6.0.9 (Create'in Fabric uyarlaması, 646 blok) +
Copycats+, Beautify, Connectible Chains, Armed Stands, Animal Feeding
Trough ve **WorldEdit** 7.4.5.

### Görsel, animasyon, performans, kullanım

- **Animasyon ve efekt:** Not Enough Animations, FWA, Subtle Effects,
  Visuality, Item Particles, Creeper Firework, Highlighter,
  ETF + EMF (OptiFine biçimli varlık doku ve model paketleri).
- **Performans:** Sodium, Lithium, FerriteCore, ImmediatelyFast, Entity
  Culling, More Culling.
- **Kullanım:** JEI, Mod Menu, Clientsort, Death Locator, CWB (çerçevesiz
  tam ekran), **Essential** (52 MB, yalnız istemci; hesap ve çevrim içi
  özellikleri olan kapalı kaynaklı istemci modu).
- **Kütüphaneler:** fabric-api, fabric-language-kotlin, GeckoLib 5.5.5,
  Balm, Cloth Config, YACL, Fzzy Config, mezz_config, Iceberg, MossyLib,
  PneumonoCore, Polymer, Placeholder API, ResourcefulLib, Shogi,
  StrawberryLib.

## Yayın için not

Anthropophagy'nin insan eti eşyaları ve RedFX'in kan efektleri, video
yayınından önce `REFERANS_MOJANG_KILAVUZ.md` ve platform kurallarına göre
gözden geçirilmeli. Bu bir karar değil, kayıt.

## Lisans

Lisanslar karışık: MIT, LGPL, GPL, CC0, CC BY-ND / BY-NC-ND, Polyform
Shield (Sodium), "All Rights Reserved" (Nycto, Waystones, Balm,
Anthropophagy, Copycats+, StrawberryLib, Subtle Effects). Kayıt kuralı
(`KAYNAKLAR.md`) aynı: **sayıyı ve fikri al, dosyayı alma.** Bu paketten
hiçbir dosya depoya girmedi.
