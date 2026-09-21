# Avatar Addon 2.0.0 — ölçüm

| alan | değer |
|---|---|
| dosya | `Avatar_Addon_2.0.0_Overhaul_Update_Hotfix.mcaddon` |
| yapımcı | **GlitchyTurtle & IBk** (ibklolpo) |
| wiki | `ibklolpo.github.io/Avatar-Addon` |
| **lisans** | **BEYAN YOK** — pakette `LICENSE` ya da izin metni bulunmuyor |
| marka katmanı | Avatar: The Last Airbender → **Nickelodeon / Paramount** |
| platform | Bedrock, `min_engine_version` 1.21.60, Script API |
| içerik | 142 JS · 383 JSON · 534 PNG · 35 OGG |

**İzin kademesi: BİRİNCİ — hiçbir dosya alınmadı.** Lisans beyanı yok ve
üstüne üçüncü taraf marka katmanı var. Depo kuralı gereği yalnız **sayılar
ve mekanikler** okundu; uygulanacaksa kendi kodumuz, kendi dokumuz, kendi
adımızla yazılır. NarutoMod, Ionstrike ve Symbiote'de yapılanın aynısı.

Pakette geçen tek lisans notu bizimle ilgili değil: arayüz dosyalarında
*"the original method for this was done by r4isen1920 | MIT License"* —
yani onların kullandığı bir parça.

---

## 1. Hasar kademeleri

`BP/scripts/avatar/damageTiers.js` — bütün hareketler bu beş kademeden
birini kullanıyor:

| kademe | hasar | kaç hareket |
|---|---|---|
| LIGHT | 9.7 | 12 |
| MEDIUM | 14.5 | 15 |
| MEDIUM_PLUS | 17.0 | 12 |
| HEAVY | 19.4 | 12 |
| ULTRA | 26.7 | 8 |
| (hasarsız / destek) | — | 29 |

Ayrıca `MAX_DEFENSE_MULTIPLIER = 0.4125` — zırhın hasarı indirebileceği
en düşük oran.

**Kıyas:** bizim en güçlü tek vuruşumuz Titan Lazeri **2000** hasar.
Avatar'ın en güçlüsü **26.7**. İki mod aynı ölçekte değil; sayılar
olduğu gibi alınamaz, oran olarak okunmalı.

## 2. Chi — kaynak sistemi

| ölçüm | değer | nereden |
|---|---|---|
| tavan | **100** | `core/player/bender.js:201`, `playerSpawn.js:26` |
| başlangıç | 100 (doğunca dolu) | `playerSpawn.js:26` |
| yenilenme | **sigmoid** | `bender.js:180` |
| koşul | yalnız bekleme sıfırken | `bender.js:182` |

```
CHI_REGEN = 0.3 + 1.7 / (1 + e^(-0.05 × (chi − 39.8)))
```

Eğri ters çalışıyor: chi **boşken ~0.3/tick**, **doluyken ~2.0/tick**.
Yani art arda harcamak seni uzun süre kurutuyor — tasarım kararı,
bizim `butce.js`'teki tick bütçesinden bambaşka bir fren.

`chispd` dünya ayarıyla çarpılıyor.

## 3. Seviye eğrisi

`utils.js:1120` — her hareket kullanımı `chiCost / 100` kadar alt seviye
biriktiriyor:

```
levelFunction = 0.05 × seviye² + 0.8 × seviye + 2 / (0.01 + lvlspd × 10)
altSeviye > levelFunction  →  seviye atla
seviye < 12 iken altSeviye × 6   (erken oyun hızlı)
```

En yüksek seviye **100** (`levelFactor = level / 100`).

**Hareket açılışı seviyeye bağlı:** `bender.js` — `moveIndex > level + 1`
olan hareket listede görünmüyor. Yani **seviye başına bir hareket** açılıyor;
`skill_required` alanı olanlar ayrıca yetenek ağacı istiyor.

## 4. Hareket türleri

| tür | nasıl çalışır |
|---|---|
| `standard` | bas, chi düşer, bekleme başlar |
| `duration` | başlat/bitir, süre boyunca çalışır |
| `charge` | basılı tut, şarj birikir — **tavan 200**, her tick `cost` kadar chi yer |
| `dragon` | Ateş'e özel (Dragon Strike) |

Şarjlı hareketlerin beklemesi sabit 5 tick (`bender.js`).

## 5. Avatar Durumu

`core/elements/avatar/moves/AvatarState.js`

| ölçüm | değer |
|---|---|
| gereken seviye | **75** |
| süre | `30 + (seviye − 75) × 1.2` saniye |
| seviye 75'te | **30 saniye** |
| seviye 100'de | **60 saniye** |
| ayarlanabilir | `as_duration_min` 30, `as_duration_max` 60 |

Verdiği efektler (hepsi `showParticles: false`):

| efekt | amplifier | seviye |
|---|---|---|
| `resistance` | 0 | I |
| `regeneration` | 1 | II |
| `fire_resistance` | 0 | I |
| `strength` | 1 | II |
| `speed` | 2 | III |

Ayrıca seviye ≥ 75'te ve `as_totem` açıkken, 20 bloktan fazla düşerken
`slow_falling` veriliyor (15 tick).

## 6. Hareketler — 88 tanesinin tamamı

### Ateş (20 hareket)

| hareket | hasar | chi | bekleme | tür |
|---|---|---|---|---|
| Combustion Beam | 19.4 | 3 | 10 | charge |
| Dragon Strike | 19.4 | 75 | 30 | dragon |
| Flame Wave | 19.4 | 5 | 10 | charge |
| Lightning Sweep | 19.4 | 5 | 10 | charge |
| Thunderclap | 19.4 | 5 | 10 | charge |
| Bounce Blast | 17.0 | 30 | 10 | standard |
| Death Slam | 17.0 | 50 | 10 | standard |
| Electroshock | 17.0 | 5 | 10 | charge |
| Lightning Burst | 17.0 | 30 | 10 | standard |
| Scorpion Sting | 17.0 | 50 | 10 | standard |
| Fire Spread | 14.5 | 40 | 5 | standard |
| Flame Shot | 14.5 | 35 | 2 | standard |
| Dragon of West | 9.7 | 4 | 10 | duration |
| Fire Boosters | 9.7 | 3 | 10 | duration |
| Fireball | 9.7 | 10 | 5 | standard |
| Flame Aura | 9.7 | 2 | 10 | duration |
| Flash Fire | 9.7 | 4 | 0 | duration |
| Fire Charge | 0 | 40 | 45 | standard |
| Fire Jump | 0 | 35 | 35 | standard |
| Fire Leap | 0 | 20 | 10 | standard |

### Su (18 hareket)

| hareket | hasar | chi | bekleme | tür |
|---|---|---|---|---|
| Hydroshock | 19.4 | 5 | 10 | charge |
| Splash | 19.4 | 5 | 10 | charge |
| Ice Throw | 17.0 | 50 | 10 | standard |
| Tidal Slice | 17.0 | 30 | 32 | standard |
| Gush | 14.5 | 50 | 10 | standard |
| Ice Big Spike | 14.5 | 35 | 10 | standard |
| Ice Spike Line | 14.5 | 30 | 10 | standard |
| Ice Spikes | 14.5 | 30 | 10 | standard |
| Vine Grapple | 14.5 | 50 | 10 | standard |
| Vine Hook | 10 | 5 | 10 | charge |
| Jetstream | 9.7 | 2 | 10 | duration |
| Torrent | 9.7 | 20 | 10 | standard |
| Bloodbending | 0 | 1 | 10 | duration |
| Focus Heal | 0 | 50 | 10 | standard |
| Frost Breath | 0 | 35 | 200 | standard |
| Frost Walker | 0 | 0.2 | 10 | duration |
| Geyser | 0 | 30 | 5 | standard |
| Healing Cloud | 0 | 50 | 10 | standard |

### Toprak (17 hareket)

| hareket | hasar | chi | bekleme | tür |
|---|---|---|---|---|
| Earth Rend | 19.4 | 20 | 50 | standard |
| Earth Shockwave | 19.4 | 1 | 10 | charge |
| Earth Wall | 19.4 | 25 | 10 | standard |
| Earth Hurl | 17.0 | 50 | 10 | standard |
| Earth Spikes | 17.0 | 30 | 10 | standard |
| Magma Surge | 17.0 | 2 | 10 | charge |
| Earth Big Spike | 14.5 | 30 | 10 | standard |
| Earth Spike Line | 14.5 | 30 | 10 | standard |
| Earthquake | 14.5 | 12 | 10 | duration |
| Metal Hook | 14.5 | 50 | 10 | standard |
| Earth Headbutt | 9.7 | 8 | 20 | duration |
| Earth Pillar | 9.7 | 15 | 5 | standard |
| Earth Search | 0 | 5 | 25 | standard |
| Earth Shield | 0 | 100 | 50 | standard |
| Earth Top | 0 | 10 | 10 | standard |
| Seismic Sense | 0 | 0.1 | 1 | duration |
| Butter Barrage | BUTTER_BARRAGE_HIT_DAMAGE | 50 | 30 | standard |

### Hava (16 hareket)

| hareket | hasar | chi | bekleme | tür |
|---|---|---|---|---|
| Air Shockwave | 19.4 | 5 | 10 | charge |
| Air Sniper | 19.4 | 45 | 15 | standard |
| Air Ball | 17.0 | 45 | 10 | standard |
| Scorpion Strike | 17.0 | 50 | 10 | standard |
| Air Blast | 14.5 | 22 | 10 | standard |
| Artillery | 14.5 | 50 | 10 | standard |
| Wall Shot | 14.5 | 30 | 10 | standard |
| Air Rush | 9.7 | 1 | 10 | duration |
| Air Slam | 9.7 | 50 | 18 | standard |
| Tornado | 9.7 | 50 | 10 | standard |
| Air Launch | 0 | 50 | 15 | standard |
| Air Leap | 0 | 20 | 10 | standard |
| Air Pull | 0 | 50 | 15 | standard |
| Air Scooter | 0 | 0.1 | 10 | duration |
| Air Spirit | 0 | 0.25 | 10 | duration |
| Puff | 0 | 4 | 10 | duration |

### Avatar (5 hareket)

| hareket | hasar | chi | bekleme | tür |
|---|---|---|---|---|
| Super Air Shove | 26.7 | 50 | 145 | standard |
| Super Fire Shockwave | 26.7 | 60 | 145 | standard |
| Avatar State | 0 | 30 | 35 | standard |
| Super Earth Shield | 0 | 70 | 145 | standard |
| Super Frost Breath | 0 | 50 | 145 | standard |

### Kara Avatar (8 hareket)

| hareket | hasar | chi | bekleme | tür |
|---|---|---|---|---|
| Chaos Beam | 26.7 | 3 | 13 | charge |
| Elemental Typhoon | 26.7 | 85 | 20 | standard |
| Super Firewall | 26.7 | 60 | 145 | standard |
| Super Tsunami | 26.7 | 60 | 145 | standard |
| Super Typhoon | 26.7 | 60 | 145 | standard |
| Super Burrow | 0 | 60 | 145 | standard |
| Singularity | — | 4 | 50 | duration |
| Supernova | — | 5 | 55 | charge |

### Bükücü olmayan (4 hareket)

| hareket | hasar | chi | bekleme | tür |
|---|---|---|---|---|
| Dash | 2 | 30 | 10 | standard |
| Boomerang | 0 | 2.4 | 60 | duration |
| Rewind | 0 | 1.6 | 10 | duration |
| Truesight | 0 | 1 | 10 | duration |


## 7. Varlıklar ve eşyalar

| ne | sayı |
|---|---|
| özel eşya | 20 |
| tarif | 3 |
| varlık | 11 |
| parçacık | 20 |
| ses | 35 |
| doku | 534 |

Eşyalar: dört elementin zırh takımı (16 parça), `bending_scroll`,
`tea`, `fire_nation_spear`, `earth_dual_hammers`.

Tariflerden biri ölçüldü: **hava bükücü planörü → `minecraft:elytra`**
üretiyor (changelog'daki "Air Glider Pack").

## 8. Bizde OLMAYAN üç sistem

Bu modun bize göre asıl yeniliği tek tek hareketler değil, üç sistem:

1. **Chi** — harcanan ve yenilenen bir kaynak. Bizde hiç yok; frenimiz
   tick bütçesi ve bekleme süreleri.
2. **Seviye eğrisi ve hareket açılışı** — `beceri.js`'te yetenek ağacımız
   var ama seviye başına hareket açan bir eğri yok.
3. **Şarjlı hareket** — basılı tutup güç biriktirme (tavan 200).
   Bizde bütün yetenekler anlık.

## 9. Ölçülemeyenler

- Her hareketin menzili ve hedef sayısı: hareket gövdesinde, tek tek
  okunmadı (88 dosya). Hasar/chi/bekleme/tür çıkarıldı.
- Yetenek ağaçlarının düğüm maliyetleri.
- `runtimes/` altındaki sürekli pasif etkiler.
- Parçacık ve ses kimliklerinin hareket-hareket eşleşmesi.

Bunlar gerekirse ikinci turda çıkarılır; bu belge **uygulamaya yetecek
çekirdeği** taşıyor.
