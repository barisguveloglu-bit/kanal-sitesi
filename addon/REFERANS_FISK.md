# FiskHeroes → Şimşek TNT: ne aktarıldı, ne aktarılamadı

**Kaynak:** `FiskHeroes1.7.102.4.0.jar` — *Fisk's Superheroes* 2.4.0,
Minecraft 1.7.10, yazar FiskFille.

**Tabanı Palladium değil.** Kullanıcı sormuştu: *"tabanı ne bilmiyorum
Palladium tabanlı mı bilmiyorum."* Değil — Fisk'in kendi sistemi. Ama
bizim için Palladium'dan bile kolay çıktı:

| ne | nerede | biçim |
|---|---|---|
| kahraman tanımı | `data/heroes/<ad>.js` | düz okunabilir JavaScript |
| güçler | `data/powers/<ad>.json` | düz JSON |
| doku eşlemesi | `models/heroes/<ad>.json` | düz JSON |
| dokular | `textures/heroes/*.png` | **64×64, oyuncu derisi düzeni** |

Modeller **vanilla insansı iskelet**. `renderers/heroes/*.js` kemikleri
adıyla sayıyor: `head`, `headwear`, `body`, `rightArm`, `leftArm`,
`rightLeg`, `leftLeg` — Bedrock'un kendi kemik adlarıyla birebir aynı.

## Aktarılan dokuz kahraman

| kahraman | kademe | ışın (kaynak → bizde) | yetenekler |
|---|---|---|---|
| The Spectre | 10 | energy_projection 3/tick 10 blok → 60 | ışın, ışınlanma |
| Anti-Monitor | 10 | charged_beam 9/tick 32 blok → 180 | ışın, uçuş |
| The Monitor | 10 | energy_projection 3/tick 10 blok → 60 | ışın, ışınlanma, çekme |
| Martian Manhunter | 8 | — | uçuş |
| Vision | 9 | charged_beam 7/tick 32 blok → 140 | ışın, uçuş |
| Iron Man Mark 85 | 8 | charged_beam 7/tick 32 blok → 140 | ışın, uçuş |
| Shazam | 9 | lightning_cast 10, 48 blok → 10 | ışın, uçuş |
| The Tick | 8 | — | *(yok — kaynakta da yok)* |
| Harbinger | 9 | energy_projection 3/tick 10 blok → 60 | ışın, yerçekimi, ışınlanma |

## Sayılar nasıl çevrildi

Kural, tahmin değil. Hepsi `ayarlar.js:KAHRAMANLAR` başlığında da yazılı.

| kaynak | Bedrock karşılığı |
|---|---|
| `PUNCH_DAMAGE p` | `amp = round((p−1)/3) − 1`, **eşitlikte aşağı** |
| `SPRINT_SPEED s` (çarpan) | `amp = max(0, round(s/0.2) − 1)` |
| `JUMP_HEIGHT ≥1.5 / ≥0.5` | Zıplama II / I |
| `FALL_RESISTANCE ≥5` | Yavaş Düşüş |
| `fire_immunity` | Ateş Direnci |
| `water_breathing`, `BREATHE_SPACE` | Su Altında Nefes |
| `near_invulnerability` | Direnç IV |
| `damage_resistance EXPLOSION 0.5` | Direnç II |
| `metal_skin` | Direnç III |
| `regeneration` | Yenilenme I |
| `invisibility`, `shadowform` | Görünmezlik |
| `controlled_flight`, `flight` | var olan `ucus` yeteneği |
| `teleportation` | var olan `isinlanma` yeteneği |
| `gravity_manipulation` | var olan `ucurma` yeteneği |
| `telekinesis` | var olan `cekme` yeteneği (en yakını) |

**Işınlar — aynı saniyelik hasar.** Fisk'in `energy_projection` ve
`charged_beam`'i *sürekli* ışın: hasar **her tick** uygulanıyor. Bizim
ışınımız tek atış + 1 saniye bekleme. Tek kural:

```
tek atış hasarı = kaynağın tick başına hasarı × 20 (bekleme)
```

Böylece saniyelik hasar kaynakla aynı kalıyor. **Tek istisna**
`lightning_cast` (Shazam): o zaten sürekli değil, tek seferlik bir
çarpma — hasarı olduğu gibi.

Bu kural v4.96'da **Ionstrike ışınlarına da geriye dönük uygulandı**:
v4.95'te Isı ışını 20, Titan lazeri 50 olarak alınmıştı ve kaynaktaki
ışını 20 kat zayıflatıyordu. Artık 400 ve 1000.

## Neden attachable, oyuncu modeli değil

Ben 10 ve Max Steel'de oyuncunun **modeli** değiştiriliyor (v4.90).
Kahramanlarda bu yanlış olurdu: üç kahramanda kaskın dokusu **yok** —
modda oyuncunun kendi yüzü görünüyor. Ölçüldü:

| kahraman | kafa bölgesi doluluğu |
|---|---|
| Spectre | %0 |
| Shazam | %6 |
| The Monitor | %19 |

Modeli değiştirseydik o üçü **kafasız** çizilirdi. Attachable oyuncunun
**üstüne** çiziyor: boş pikseller oyuncunun kendi derisini gösteriyor —
modun yaptığı şey tam olarak bu.

## Dokular nasıl birleştirildi

Modun kendi `models/heroes/<ad>.json`'ı iki tablo veriyor:
`texture.renderLayer` (hangi katman hangi dokuyu kullanır) ve
`showModel` (hangi kemiği hangi katmanlar çizer). Kemik başına doku o
iki tablodan türetildi. Betik: `kaynak_doku/kahraman_coz.py`.

**Yakalanan tuzak:** kahramanların çoğunda `texture` ve `showModel`
**boş** ve `"parent": "fiskheroes:hero_basic"` üzerinden geliyor.
Ebeveyni çözmeden birleştirince **dört kahraman 0 piksel** çıktı.

## Aktarılamayanlar (uydurulmadı)

| özellik | neden |
|---|---|
| `projectile_immunity` / `arrow_catching` | Bedrock'ta ok bağışıklığı efekti yok |
| `intangibility` (Vision, MM) | blok içinden geçme yok |
| `shape_shifting` (MM) | başka oyuncunun kılığına girme yok |
| `size_manipulation` (Anti-Monitor dev modu) | oyuncu ölçeği değiştirilemiyor |
| `shield` / `forcefield` (Anti-Monitor, Mk85) | kalkan havuzu yok |
| `setDefaultScale(1.1)` | attachable oyuncuyu büyütemiyor |
| `potion_immunity` (MM) | efekt bağışıklığı yok |
| `eternium_weakness` (Shazam) | kaynakta bir **ceza**; oyunda karşılığı olan bir madde yok |
| Mk85'in bıçağı ve nanit dönüşümü | ayrı model + durum makinesi |

Özet metinleri bunları **vaat etmiyor**.

## Aktarılmayan kahramanlar

Modda 68 kahraman var. Kullanıcı dokuzunu seçti; kalan 59'u
aktarılmadı — istenmediği için, aktarılamadığı için değil. Aynı
makineyle her biri bir satır.
