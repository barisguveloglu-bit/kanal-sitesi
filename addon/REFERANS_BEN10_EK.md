# AlienEvo eklentileri — üç jar, ne alındı ne alınmadı

**Bu dosya bir kez yazıldı.** Kullanıcı jar'ları tekrar yüklemesin, ben de
tekrar taramayayım diye burada duruyor. Ana mod `REFERANS_BEN10.md`'de.

Kullanıcı: *"AlienEvo diyebilir, ben 10 modu vardı ya kanka, işte onların
eklentilerini buldum, yani ekstra özellikler ekleyen şeyleri buldum."*

Üçü de **çalıştırılmadan**, zip olarak açılıp içindeki JSON / JS / lang
dosyaları okunarak incelendi.

---

## Özet — üçünün ikisi ses eklentisi

| jar | dosya | ses | güç JSON | alındı mı |
|---|---|---|---|---|
| `shout-1.0.3.jar` | 23 | 11 ogg | 1 | **hayır** |
| `yelling_alien-0.8.0.jar` | 74 | 47 ogg | 14 | **hayır** |
| `pinnacle_of_evolution.jar` | 281 | 0 | 9 | **evet** |

---

## 1. `shout` — alınmadı, çünkü alınacak bir mekanik yok

```
id      shout  v1.0.0
bağımlı palladium + alienevo + kubejs
```

Tek bir güç dosyası var (`palladium/powers/shout.json`) ve içindeki her
yetenek ya `palladium:animation_timer` (sayaç) ya `palladium:command`.
**Bütün komutları tek tek okundu:**

```
11 komut  ·  11'i de "playsound shout:<uzaylı> master @a[distance=..15]"
```

Yani yaptığı iş şu: uzaylıya dönüşünce o uzaylının adını bağırıyor.
Hasar yok, efekt yok, blok yok, mermi yok. Bedrock'ta karşılığı
`playSound` çağrısı — bizde zaten var.

## 2. `yelling_alien` — alınmadı, aynı sebep

```
id      yelling_alien  v0.8.0  (pack_format 15, MC 1.20.1)
açıklama "aliens shout their names on transformation"
```

14 güç dosyası var, her uzaylıya bir tane
(`pyronite_yelling.json`, `tetramand_yelling.json`, …). İkisi birden
sayıldığında:

```
25 palladium:command yeteneği  ·  25 komutun 25'i de playsound
```

`effect`, `damage`, `summon`, `setblock`, `particle` — **hiçbiri geçmiyor.**
`voicelines.js` de yalnız hangi sesin çalacağını seçiyor.

**Neden bu bir eksiklik değil:** kullanıcı "ekstra özellik" beklediğini
söyledi; ölçüm bu ikisinin özellik değil *ses paketi* olduğunu gösteriyor.
Sesleri almak da mümkün değil — telif dışı, ogg dosyaları modun kendi
ses bankasına ait ve Bedrock'ta uzaylı dönüşümü bizde zaten
`BEN10` tablosundan geliyor, ayrı bir dönüşüm anı yok.

## 3. `pinnacle_of_evolution` — alınan bu

```
id      evolved  v4.1.0
yapan   Gorrini  (lisans: Gorrini/Tim/WOU/Fireblast)
```

Bu jar gerçek bir **kademe** ekliyor: altı uzaylının "evrimleşmiş"
sürümü, ayrı güç dosyalarıyla.

| güç dosyası | yetenek | bizdeki tür |
|---|---|---|
| `evolved_pyronite.json` | 77 | `ben_ates` |
| `evolved_kineceleran.json` | 72 | `ben_xlr` |
| `evolved_tetramand.json` | 54 | `ben_dortkol` |
| `evolved_petrosapien.json` | 52 | `ben_elmas` |
| `evolved_vulpimancer.json` | 45 | `ben_vahsi` |
| `evolved_galvan.json` | 27 | `ben_gri` |
| `evolved_pyronite_absorb.json` | 2 | (Ateş'in alt gücü) |

Ayrıca `evolution_module` eşyası, `crystal_spike` / `crystal_shard`
blokları, 11 `.mcfunction` ve 11 kubejs betiği var.

### Yetenek tipleri (287 yeteneğin dağılımı)

```
57 attribute_modifier   51 command            29 animation_timer
17 trail                16 play_sound         12 name_change
11 projectile           11 aoe_damage         11 render_layer_animation
10 aim                   9 particles           7 render_layer
 7 damage_immunity       6 hide_body_part      6 size
 ...  (tek tek: telekinesis, wall_climb, wall_run, water_walk,
       crystal_pillar, block_placer, line_bridge, sonic_clap,
       explosion, screenshake, shader_effect, invulnerable)
```

**Sayının büyüklüğü yanıltıcı:** 287 kaydın yarısından fazlası görsel
(trail, render_layer, animation_timer, name_change, particles) ya da
aynı özelliğin kademeleri (`speed_1`..`speed_5`, 16 ayrı iz rengi).
Gerçek mekanik sayısı **altı** ve altısı da alındı.

---

## Bizde ne oldu — `yetenekler/ben10_evrim.js`

Ayarlar `ayarlar.js` → `BEN10_EVRIM`. Yetenek kimliği `evrim`, sıra **790**.

| tür | kaynak function/güç | bizdeki mekanik |
|---|---|---|
| Ateş | `evolved_pyronite_nova.mcfunction` | `nova` — alan hasarı + ateşe verme |
| Vahşi | `evolved_vulpimancer_stun.mcfunction` | `sersem` — yavaşlık + bulantı, **hasar yok** |
| Elmas | `evolved_crystal_pillar.js` | `diken` — diken hasarı |
| XLR8 | `speed_1..speed_5` | `hiz` — kademeli hız, tavan 5 |
| Gri Madde | `corewithstuff:telekinesis` | `cekim` — hedefleri kendine çekme |
| Dört Kol | `alienevo:sonic_clap` | `carpma` — hasar + savurma |

### Bilerek değiştirilen üç şey

1. **Kristal diken BLOK olarak alınmadı.** Kaynakta `crystal_pillar` ve
   `block_placer` hedefin etrafına gerçekten blok koyuyor. Bu depoda bir
   oyuncuyu bloğun içine hapsetmek yasak — aynı karar `kafes.js`'te
   yazılı. Karşılığı diken hasarı. `test/ben10_evrim.mjs` 8. bölümü
   "hiç blok koymadı" diye ölçüyor.
2. **`alienevo:invulnerable` alınmadı.** Süresiz dokunulmazlık bu deponun
   "her kalıcı etkinin süresi ve çıkışı olacak" kuralına aykırı; zaten
   `yenilmez_zirh.js` sayaçlı ve sınırlı bir karşılığını veriyor.
3. **Evrim bir BİÇİM değil, KADEME.** Bizdeki `_proto` / `_10k` aynı türün
   görünümü ("görünüm farklı, güç aynı" — `ayarlar.js`). Kaynakta evrim
   ayrı `powers/evolved_*.json` dosyalarıyla geliyor ve güçleri farklı.
   Bu yüzden `BEN10_BICIM`'e dördüncü ek olarak eklenmedi; ayrı yetenek
   oldu. Üç görünümün üçü de **aynı** evrime giriyor (`turAdi()` eki
   atıyor) — test 2. bölümde ölçülü.

### Sınırlar

- Süre `EVRIM_SURE` = 400 tick (20 sn), iş kendini bitiriyor.
- Adımlar `EVRIM_ARA` = 10 tick aralıklı; her tick çalışmıyor.
- Elindeki yaratığı bırakınca ya da başka türe geçince evrim **biter**.
- Altı türün dışında bir yaratık tutuluyorsa iş hiç başlamaz, sebebi
  action bar'a yazılır. Yedinci bir tür **uydurulmadı**.
- Hiçbir mekanik oyuncunun kendisine ya da kendi botuna dokunmuyor.
- Giriş efektlerinin hepsi süreli; Direnç V (amp 4) hiçbirinde yok.
