# Weapons of Miracles + Epic Fight → Şimşek TNT

**Kaynaklar** (v7.98.2'den beri depoda bu kaynaktan hiçbir dosya yok):
- `WeaponsOfMiracles-2.0.178.jar` — *Weapons of Miracles* (Reascer), NeoForge 1.21.1
- `epic-fight-21.17.3.1-mc1.21.1-neoforge.jar` — *Epic Fight* (Epic Fight Team)

İzin: `KAYNAKLAR.md`, "Weapons of Miracles 2.0.178 + Epic Fight".

## Geçmiş: neden üçüncü deneme

| sürüm | ne oldu |
|---|---|
| v5.0 | 27 silah + 63 animasyon alındı |
| v5.5 | "karakter bildiğin dans ediyor": euler dal atlaması, Root, hiyerarşi düzeltildi. **Ölçülebilen her şey** düzeldi (180°'yi aşan sıçrama 147 → 0) |
| v5.8 | "gene bozulmalar var" — oyunda hâlâ bozuktu, **sebebi bulunamadı**, silindi |
| v7.98.0 | sebep ölçüldü, çevirici yeniden yazıldı, geri geldi |
| v7.98.2 | kullanıcı sahnede gördü: "bacak ve gövde arada sırada ayrılıyor" — **ikinci kez kaldırıldı** |

## v5.5'in bulamadığı hata: çerçeve

Eski çevirici farkı eklemin **kendi** dinlenme çerçevesinde alıyordu:

```
D = bind_yerel⁻¹ · L        →  euler(D) doğrudan Bedrock'a
```

Bedrock'ta vanilla oyuncu kemiklerinin dinlenme dönüşü sıfır, eksenleri
**dünyaya hizalı**. Epic Fight'ınkiler değil (`biped.json`, ölçüldü):

| eklem | yerel Y ekseni dünyada | Bedrock'a göre |
|---|---|---|
| Root · Torso · Chest · Head | yukarı | örtüşüyor |
| Arm_R · Thigh_R · Leg_R | **aşağı** | X etrafında **180° ters** |
| Shoulder_R | 91.4°, eğik | ikisine de uymuyor |

Gövdede çerçeve örtüştüğü için eski yöntem doğru çalışıyordu. Kol ve
bacakta dönüşün **Y ve Z bileşenlerinin işareti tersine** dönüyordu:
öne-arkaya sallanma doğru, yana açılma ve burulma ters yöne.

**Neden ölçüler görmedi:** sıçrama ölçüsü eksenin doğru olup olmadığını
sormuyordu; önizleme (`onizle_poz.py`) aynı kabulle çizdiği için hatayı
doğruluyordu. v5.5 §4'ün dersi ("önizleme yalan söylüyordu") bir kat
derinde tekrarlanmıştı.

**Ölçüldü:** eski v5.5 çıktısı (git `4c11a7e~1`), Epic Fight'ın kendi
pozuna karşı **medyan 47.8°** sapıyor; 68.910 örneğin 61.879'u 12°'yi
aşıyor. (Eski çıktı eski JAR'dan üretilmişti, ama 48° sürüm farkıyla
açıklanamaz.)

## Yeni yöntem: dünyada fark

```
G_j(t) = rot(A_j(t)) · rot(W_j)ᵀ      dünyadaki poz değişimi
G'_j   = C · G_j · Cᵀ                 Blockbench iç uzayına
R_k    = G'_ata(k)ᵀ · G'_k            Bedrock yerel dönüşü
```

Çerçeve nereye bakarsa baksın dünyadaki değişim aynı — sorun ortadan
kalkıyor. Araç: `arac/ef_anim_cevir.py`.

### Kurallar nereden (hafızadan değil)

| kural | değer | kaynak |
|---|---|---|
| Epic Fight → Blockbench | `(x, z, −y)`, det = +1 | yüz dokusunun tam bir dörtgeni `+Y`'ye bakıyor, sağ omuz `+X`'te (`biped.json`) |
| Bedrock dosyası | Blockbench iç dönüşünün `(−x, −y, +z)`'si | Blockbench `keyframe.js` `compileBedrockKeyframe()` |
| euler sırası | `ZYX` (M = Rz·Ry·Rx) | Blockbench `format.ts` varsayılanı |
| hiyerarşi | `root › waist › body › {head, arms}`, bacaklar `root`'un çocuğu | vanilla `mobs.json` `geometry.humanoid.custom` |

Vanilla'yla çapraz sınandı: zombi kolları `x = −90` → **öne**, yüzme
`−180` → **yukarı**, nefes sallanması sağ kol `z > 0` → **dışa**.

### Kol ve bacak: kemik uca bakıyor

Bedrock'ta kol tek kemik. Eskiden yalnız üst kolun yönü alınıyordu;
dirsek bükülünce el — yani **silah** — yanlış yerde kalıyordu. Artık
kemik omuzdan `Tool_R`'ye (silahın tutulduğu nokta) bakıyor, burulma üst
koldan en küçük düzeltmeyle. Bacak kalçadan ayağa.

### Kaynakta iki tuzak

1. **Sıfır ölçekli kareler = kaybolma.** 384 kare dönüş değil (det ≈ 0):
   ışınlanma hareketlerinde Root o an sıfır matris. Kuaterniyona çevirmek
   anlamsız bir yön üretiyordu (`moonless_auto_3`'te bütün beden 180°).
   Karşılığı `root` kemiğine **ölçek 0**; dönüş en yakın geçerli kareden.
2. **Sırasız zaman dizileri.** 33 eklemde son kare sona eklenmiş
   (`agony_auto_4` `Tool_R`: `…, 2.3, 2.3833, 2.2167`). Epic Fight
   ikili arama yapıyor ve yükleyici sıralamıyor
   (`TransformSheet.getInterpolationInfo`, `JsonAssetLoader`). Sıralı
   kabul etmek Epic Fight'ın **gösterdiğinden** başka poz verirdi;
   arama birebir kopyalandı.

### Ara değer

Epic Fight kareler arasını kuaterniyonla, Bedrock her ekseni ayrı ve
düz geçiyor. Çıktı kareleri uyarlamalı: bir aralığın ortasında
Bedrock'un düz ara değeri gerçek pozdan 3°'den fazla sapıyorsa aralık
ikiye bölünüyor.

## Doğrulama: çeviriciyle kabul paylaşmayan ölçü

`arac/ef_anim_dogrula.py` çeviriciden hiçbir şey almıyor:

- **gerçek:** Epic Fight'ın yerel matrisleri zincirle çarpılıyor, uzuvların
  dünyadaki yönü ölçülüyor (omuz→silah, kalça→ayak, kafa ve göğsün
  baktığı yön).
- **tahmin:** yazılan Bedrock dosyası, Bedrock'un düz ara değeri ve
  Blockbench kuralıyla yeniden kuruluyor.

| | eski (v5.5) | yeni (v7.98.0) |
|---|---|---|
| medyan hata | 47.8° | **0.02°** |
| p99 | 157° | **2.5°** |
| 12°'yi aşan örnek | 61.879 / 68.910 | **0 / 80.299** |
| en kötü | 179.2° | 8.9° |

Mutasyonla ısırdığı gösterildi: kol/bacakta Y-Z işaretini çevirmek
36.609, Blockbench işaretini atlamak 60.716, **tek bir kareyi** 25°
kaydırmak 444 örnek düşürüyor.

Depodaki test (`test/wom.mjs` 5. bölüm) JAR olmadan çalışsın diye
doğrulayıcı Epic Fight'ın gerçek pozlarından bir parmak izi yazıyor
(`kaynak_anim/wom/olcu.json`). Test tahmini **üçüncü, ayrı bir
uygulamayla** (JS) yapıyor.

## Birinci şahıs

Birinci şahısta ekranda yalnız kollar çizilir, ama kollar
`root/waist/body`'nin çocuğu: savurarak dönen bir vuruşta kollar
kameranın etrafında savrulur. `playAnimation`'a
`stopExpression: "variable.is_first_person"` veriliyor; birinci şahısta
animasyon hiç oynamıyor, vanilla vuruş devam ediyor. Başka oyuncular
seni üçüncü şahısta gördüğü için onlarda oynuyor.

**Oyunda doğrulanmadı.** Ölçüm Epic Fight'ın pozuna ve Blockbench'in
kuralına karşı; son kanıt oyunun kendisi.

## Silahlar: 27, sayılar bytecode'dan

`WOMItems.class static{}` → `InvokeDynamic` → `lambda$static$N` →
`Sınıf.createWeaponAttributes()`. 2.0.178'de 27'nin 27'si 2.0.176 ile
aynı çıktı. Tek fark: asaların saldırı hızı artık kademeye bağlı
(`StaffItem` `typeSwitch`: WOOD −2.3, STONE −2.5, IRON −2.65,
GOLD −2.2, DIAMOND −2.3, NETHERITE −2.45).

| silah | Bedrock hasar | dayanıklılık | nadirlik | seri |
|---|---|---|---|---|
| Izdırap | 6 | 2135 | rare | agony_auto_1..4 |
| Antitheus | 8 | 6666 | epic | antitheus_auto_1..4 |
| Kara Yıldız | 9 | 2135 | rare | blackstar_basic_attack_1..4 |
| Ender Tabancası | 7 | 4735 | epic | enderblaster_onehand_auto_1..4 |
| Kötü Ôdachi | 8 | 1635 | rare | katana_auto_1..3 |
| Gesetz | 4 | 4157 | rare | gezets_auto_1..3 |
| Herrscher | 6 | 1582 | rare | herrscher_auto_1..3 |
| Kof Uzun Kılıç | 7 | 875 | rare | longsword_auto1..3 *(Epic Fight)* |
| Pençeli Eldiven | 6 | 782 | rare | fist_auto1..3 *(Epic Fight)* |
| Aysız | 7 | 2135 | epic | moonless_auto_1..3 |
| Napoleon | 7 | 2135 | epic | napoleon_auto_1..4 |
| Nova | 5 | 2135 | rare | nova_attack_1..4 |
| Yörünge | 8 | 2135 | rare | orbit_attack_1..4 |
| Ruine | 7 | 2135 | rare | ruine_auto_1..4 |
| Satsujin | 7 | 2135 | epic | katana_auto_1..3 |
| Güneş | 9 | 2135 | epic | solar_auto_1..4 |
| Azap | 9 | 2135 | rare | torment_auto_1..4 |
| Asalar (6 kademe) | 2–6 | 32–2031 | common | staff_auto_1..3 |
| Balyoz baltalar (4 kademe) | 8–12 | 32–2031 | common | axe_auto1..2 *(Epic Fight)* |

`bedrock = java + 1`: Java'da eşyanın sayısı taban yumruğun üstüne
binen bir değiştirici, Bedrock'ta `minecraft:damage` toplam.

İkonlar 2.0.178 JAR'ındaki dokularla **piksel piksel aynı** (27/27).

2.0.178'de yeni olup alınmayanlar: `eternal_fire_arcane`,
`overly_large_cylinder`, `solar_obscuridad` — üçü de düz `Item`, silah
özelliği yok. Takılar (`ArtefactsItem`, bilezikler) v5.0'da da
alınmamıştı.

## Aktarılamayanlar (uydurulmadı)

- **Saldırı hızı**: Bedrock'ta eşya başına bileşen yok.
- **Dirsek bükülmesi**: Bedrock kolu tek kemik; kemik silaha bakıyor,
  dirsek görünmüyor.
- **Root ötelemesi**: oyuncunun yerini oyun belirliyor.
- **Oyuncu kilidi, stamina, beceri ağacı**: Epic Fight'ın kendisi.
- **3B silah modelleri**: `.obj` üçgen ağı; eldeki silah ikon olarak
  görünüyor.

## Yeniden üretmek

```sh
python3 addon/arac/wom_anim_uret.py <epic-fight.jar> <WeaponsOfMiracles.jar>
python3 addon/kol_uret.py
```

İlki animasyon listesini `ayarlar.js` `WOM_SERI`'den okuyor, çeviriyor,
doğruluyor ve parmak izini yazıyor. Eşik aşılırsa çıkış kodu 1.

## v7.98.2: neden ikinci kez kaldırıldı

Kullanıcı 3B sahnede gördü: bacak ve gövde arada sırada ayrılıyor.
Ölçüldü (bu belgedeki çıktıyla, Bedrock zinciri): **63 animasyonun
60'ında** kalça noktası gövdeden 2 pikselden fazla kopuyor, en kötüsü
**15.3 px** (`solar_auto_1`, `solar_auto_2`), yani neredeyse bir blok.

Sebep çeviride değil, **bedenin kendisinde**:

- Epic Fight'ın modeli deri gibi esneyen tek ağ: gövde eğilince
  kalçadaki köşeler uzayıp bağlı kalıyor.
- Bedrock oyuncusu **katı kutular**; bacaklar gövdeye değil `root`'a
  bağlı. Gövde eğildikçe alt ucu bacakların üstünden kayıyor.

Doğrulayıcı uzuvların **yönünü** ölçüyordu; eklemin **kopup
kopmadığını** hiç sormuyordu. "Medyan 0.02°" doğruydu ama yanlış
soruydu — v5.5'in "önizleme yalan söylüyordu" dersinin üçüncü katı.

**Ders:** bir iskelet animasyonunu başka bir bedene taşırken yön
doğruluğu yetmez; **eklem sürekliliği** (ebeveyn ile çocuğun buluştuğu
nokta ayrılıyor mu) ayrı bir ölçü. Katı kutulu bir bedende esnek ağın
pozu birebir tutmaz.

Silinenler: `WOM_*` ayarları, 27 eşya ve ikon, `wom_dovus.js`,
animasyon dosyası, `arac/ef_anim_cevir.py`, `arac/ef_anim_dogrula.py`,
`arac/wom_anim_uret.py`, `test/wom.mjs`. Kod git geçmişinde
(`f571e03`).

## v7.98.2: gerçek Java istemcisinde gözlem

Bedrock'a taşımadan önce orijinalin nasıl göründüğü **gerçek istemcide**
izlendi. Kurulum (depo dışında, `/tmp`): Minecraft 1.21.1 + NeoForge
21.1.252 + Epic Fight 21.17.3.1 + WoM 2.0.178, portablemc ile çevrimdışı
başlatıcı, Xvfb + Mesa llvmpipe, düz dünya, yaratıcı kip. Epic Fight
kipi `R` ile açılıyor; kapalıyken oyuncu vanilla modelle çiziliyor ve
WoM silahı düz tutuluyor (`enable_player_vanilla_model`).

Kaydedilen üç silah: `moonless` (tırpan/mızrak), `satsujin` (tachi),
`netherite_greataxe` (balta). Görülenler:

- **Kombo gerçekten zincir.** Moonless'ın 8 tıklamasında dürtme,
  sıçrayıp dönme, iz bırakan geniş savuruş, havada ters takla, yere
  vurma (parçacıklı) sırayla geliyor. Beden bütün olarak dönüyor,
  sıçrıyor, yere çöküyor: kök hareketi var.
- **Kılıç izi** (beyaz/mor yay) silahın kendisinde değil, ayrı bir efekt.
- **En sert bükülmede bile gövde ile bacak kopmuyor.** Bel bölgesi
  esniyor.

### Neden Java'da kopmuyor: ölçüldü

`epicfight.jar` → `assets/epicfight/animmodels/entity/biped.json`:

| ölçü | değer |
|---|---|
| eklem | 20 (`Root`, `Thigh/Leg/Knee` ×2, `Torso`, `Chest`, `Head`, `Shoulder/Arm/Hand/Tool/Elbow` ×2) |
| tepe | 260; 196'sı tek eklemli, 63'ü iki, 1'i üç |
| karışık tepelerin 60'ı | **`Chest` + `Torso`** |
| `Thigh_*` ebeveyni | **`Root`** (Bedrock'taki gibi, gövdeye değil) |
| `Torso` ekseni | yerden **13 px** (kalça 12) |
| `Chest` ekseni | **17.8 px** (gövde ortası) |

Yani Java'da da bacaklar gövdeye bağlı değil. Kopmamasının iki sebebi var:

1. Gövde **kalça hizasından** (13 px) dönüyor. Alt kenarı kalçanın
   üstünde kalıyor.
2. Göğüs bükülmesi gövdenin **ortasında** (17.8 px) ve oradaki 60 tepe
   iki eklem arasında karışıyor. Kutunun alt yarısı yerinde duruyor.

Bedrock vanilla oyuncusu (`durus_*.geo.json` ile aynı): `waist` 12 px,
`body` **24 px (boyun)**, bacaklar `root`'un çocuğu. `waist` ≈
`Torso`, ama `Chest`'in karşılığı yok. Gövde tek kutu. Bu yüzden `body`
dönünce kutunun alt kenarı `12 · sin θ` kadar kayıyor.

**Kendi vuruş animasyonlarımız için çıkan kural:** gövde eğilmesi
`waist` ile verilir. `body` yalnız küçük açıyla döner. Her pozda kalça
noktasının gövdeden ayrılmadığı ölçülür, aynı "eklem sürekliliği"
ölçüsü.
