# Marvel Project — kaynak notları (v5.2)

Kullanıcının isteği aynen: *"eski kahramanları tamamen atıyoruz, Fisk
modunu boş veriyoruz artık. Onun yerine bunu ekle, bunun tüm
kahramanlarını."*

**FiskHeroes tamamen kaldırıldı.** Dokuz kahraman, yedi ışını, kostüm
geometrisi, dokuları, ikonları, `kahraman.js`, `kaynak_doku/kahraman_coz.py`
ve `REFERANS_FISK.md` silindi. Testte (`test/marvel.mjs` 1. bölüm)
kalıntı aranıyor.

## Kaynak

`Marvel Project Addon v3.0.1` (.mcaddon) — **Bedrock paketi**. Ne bytecode
var ne Java modeli: geometri, doku ve ikon doğrudan kullanılabiliyor,
güçlerin kodu da okunabilir JavaScript (92 dosya, 13.756 satır). Bu
sürümde tek bir sayı bile tahmin edilmedi.

Çıkarma `marvel_coz.py` ile **bir kez** yapıldı, sonucu depoda:

| ne | nerede |
|---|---|
| tablo | `marvel_tablo.py` |
| geometriler | `kaynak_geo/marvel/` |
| dokular ve ikonlar | `kaynak_doku/marvel/` |

`kol_uret.py` moda hiç bakmıyor, yalnız bu üçüne bakıyor.

## Alınanlar

**268 parça** — 142 kostüm, 85 maske, 41 güç. **54 kahraman.**

Kaynağın kendi kalıbı korundu:

| tür | yuva | ne taşıyor |
|---|---|---|
| kostüm | ayak | görünüş + zırh |
| maske | kafa | görünüş + zırh |
| güç | bacak | **yetenek** |

Üçünü tek eşyada birleştirmek daha kolay olurdu ama modun dengesini
bozardı: kostümü giyip gücü takmamak kaynakta geçerli bir seçim.

### Kahraman başına

| kahraman | kostüm | maske | güç |
|---|---|---|---|
| adam_warlock | 0 | 0 | var |
| antman | 9 | 7 | var |
| black_panther | 5 | 5 | var |
| black_widow | 4 | 0 | var |
| captain_america | 15 | 15 | — |
| cyclops | 1 | 1 | var |
| daredevil | 7 | 7 | var |
| deadpool | 1 | 1 | var |
| dr_doom | 3 | 3 | var |
| dr_strange | 2 | 0 | — |
| falcon | 1 | 1 | — |
| fantastic_4 | 9 | 0 | — |
| galactus | 1 | 1 | var |
| gambit | 4 | 0 | var |
| ghost | 1 | 1 | var |
| ghost_rider | 2 | 0 | var |
| groot | 0 | 0 | var |
| guardians | 1 | 0 | — |
| gwenpool | 2 | 2 | var |
| hawkeye | 6 | 1 | var |
| hulk | 0 | 0 | var |
| iron_fist | 2 | 2 | var |
| ironman | 10 | 0 | — |
| jeff_the_land_shark | 0 | 0 | var |
| johnny | 0 | 0 | var |
| loki | 2 | 2 | var |
| luke_cage | 1 | 0 | var |
| mantis | 1 | 0 | var |
| mole | 0 | 0 | var |
| moon_knight | 8 | 8 | var |
| ms_marvel | 1 | 1 | — |
| muse | 2 | 2 | — |
| punisher | 4 | 0 | — |
| red_guardian | 1 | 1 | var |
| reed | 0 | 0 | var |
| rocket_raccoon | 0 | 0 | var |
| rogue | 1 | 0 | var |
| scarlet_witch | 2 | 0 | var |
| sentry | 1 | 0 | var |
| shang_chi | 1 | 0 | var |
| silver_surfer | 2 | 0 | var |
| spiderman | 12 | 12 | var |
| squirrel_girl | 1 | 1 | var |
| starlord | 1 | 1 | — |
| sue | 0 | 0 | var |
| super_soldier | 0 | 0 | var |
| taskmaster | 1 | 1 | — |
| thanos | 0 | 0 | var |
| thor | 6 | 5 | var |
| venom | 0 | 0 | var |
| vision | 0 | 0 | var |
| white_tiger | 2 | 2 | — |
| winter_soldier | 4 | 0 | — |
| wolverine | 2 | 2 | var |

### Kimlik biçimi

    pa:mrv_<kahraman>__<anahtar>

Çift alt çizgi **bilerek**: hem kahraman adında hem anahtarda tek alt
çizgi var (`black_panther`, `ironman_mark50`). Ayıraç tek olsaydı çalışma
zamanı `black_panther_suit`'i "black" kahramanının eşyası sanırdı —
testte ölçüldü, tek ayıraçla 54 kahraman 51'e düşüyor ve 19 kahramanın
güç kümesi kayboluyor.

Bu sayede **268 satırlık bir eşleme tablosunu iki yerde tutmak
gerekmiyor**: kimlik kendi kahramanını söylüyor.

## Zırh puanları

Hepsi modun kendi eşyasından, yeniden hesaplanmadı. Kostümlerdeki
dağılım:

| zırh | kaç kostüm |
|---|---|
| 0 | 5 |
| 4 | 1 |
| 7 | 1 |
| 8 | 2 |
| 10 | 1 |
| 11 | 1 |
| 12 | 60 |
| 13 | 4 |
| 14 | 11 |
| 15 | 7 |
| 16 | 45 |
| 18 | 2 |
| 20 | 2 |

Güç eşyaları kaynakta 5 zırh taşıyor; tek istisna Galactus (10).

## Güçler

Modun güç sistemi oyuncu etiketleriyle çalışıyor (`ironman_fly`,
`spiderman_climb`, `wolverine_impulse1`…) ve her kahramanın kendi
script'i var. Güç kümeleri o etiketlerden ve `functions/*.mcfunction`
dosyalarındaki `effect` komutlarından çıkarıldı; hangi satırın nereden
geldiği `ayarlar.js:MARVEL_GUCLER` içinde yazılı.

Birebir alınan iki örnek:

- **Daredevil** — `functions/daredevil/skill.mcfunction`:
  `absorption 15/4`, `regeneration 10/0`, `night_vision 20/0`.
  (`darkness 2/0` **alınmadı**: kaynakta bu "duyu" efektinin görsel
  parçası, bizde oyuncuyu kör ederdi.)
- **Venom** — `functions/venom/venom_regeneration.mcfunction`:
  `regeneration 3/3` + `saturation`.

**Uçuş** kaynakta `<ad>_fly` etiketiyle işaretli 16 kahramanda var:
Iron Man, Thor, Sentry, Silver Surfer, Galactus, Scarlet Witch, Doctor
Strange, Doctor Doom, Falcon, Star-Lord, Rogue, Vision, Adam Warlock,
Human Torch, Venom, Wasp.

### Güç eşyası olmayan on bir kahraman

Iron Man, Doctor Strange, Falcon, Star-Lord, White Tiger, Taskmaster,
Punisher, Winter Soldier, Ms. Marvel, Muse, Guardians — **modda güç
eşyaları yok**, güçleri kostümün kendisinde. Uydurma bir güç eşyası
üretmedik; onlar için çalışma zamanı ayaktaki kostüme bakıyor
(`ayarlar.js`'te `gucKostumden` işareti).

### Takma adlar

Kaptan Amerika'nın güç eşyası kaynakta `super_soldier_powers`, Fantastic
Four'un kostümleri ortak ama güçler dört ayrı eşya (reed/sue/johnny/mole).
`MARVEL_TAKMA_AD` bunu çözüyor. **Yön önemli**: soldaki karşılığı olmayan
ad, sağdaki gerçek güç kümesi. İlk denemede iki tarafı da
`MARVEL_GUCLER`'e koymuştum ve takma ad ölü kaldı — testte yakalandı.

## Işınlar

Fisk'in yedi ışını gitti, yerine altı Marvel ışını geldi: Unibeam, Optik
Işın, Kaos Işını, Zihin Taşı Işını, Alev Işını, Galactus Işını. Motor aynı
(`isinlar.js`), değişen tek şey **kapı**: mod ışını *eldeki* çekirdeği,
Marvel ışını *bacaktaki* güç eşyasını istiyor.

Hasarlar kaynakta tek bir sayıda durmuyor (her ışın kendi mermi varlığını
doğuruyor ve çarpma hasarını o varlık taşıyor). Bu yüzden hasarlar
**kaynaktan ölçülmedi**, bizim ölçeğimize göre verildi (Isı ışını 400,
Titan lazeri 1000) ve böyle olduğu `ayarlar.js`'te yazıyor.

## Aktarılamayanlar (özetlerde vaat edilmiyor)

- **Duvar tırmanma** — `*_climb` etiketi 10 kahramanda var (Spider-Man,
  Hulk, Black Panther, Wolverine, White Tiger, Moon Knight, Iron Fist,
  Squirrel Girl, Rocket Raccoon, Venom). Bedrock'ta oyuncuya tırmanma
  verilemiyor.
- **Ağ sallanma / kanca** (Spider-Man, Venom, Hawkeye, Daredevil, Reed):
  kaynakta kendi mermi varlığı ve fiziği var.
- **Boy değiştirme** (Ant-Man / Wasp): oyuncuya `minecraft:scale`
  verilemiyor. Kaynak `nausea` ile "küçüldüm" hissi veriyor; biz onu
  taklit etmedik, sahte olurdu.
- **Faz geçişi** (Vision, Ghost), **kuvvet alanı** (Sue), **portallar**
  (Doctor Strange): kendi varlık sistemleri.
- **Görünüş varyantları**: modun attachable'ları kendi varlık
  özelliklerine (`q.property('arathnido:SuitTexture0')`) bakıp bir
  kostümün altı dokusu arasında geçiyor. O özellikler bizim pakette yok;
  render controller'lar `controller.render.armor`'a çevrildi ve
  **varsayılan doku** alındı. Kostüm doğru görünüyor, yalnızca doku
  varyantları gelmiyor.
- **Sonsuzluk eldiveni** (Thanos): kaynakta da zırhın parçası değil,
  ayrı bir eşya.

## Bilinen tuhaflık

İki Iron Man Mark 2 modelinde `maletin` (Ant-Man'in çantası) adlı bir kök
kemik var; oyuncunun hiçbir kemiğine bağlanmıyor, varlığın merkezine göre
çiziliyor. Kaynakta da öyle — düzeltilecek bir şey değil, bilinmesi
gereken bir şey. Test bu ikisini biliyor, başka yabancı kök kemik
çıkarsa düşüyor.
