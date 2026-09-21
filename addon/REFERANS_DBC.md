# Dragon Block C Ultimate V1.1.0 — ölçüm

| alan | değer |
|---|---|
| dosya | `Dragon_Block_C_Ultimatev_V1.1.0.mcaddon` |
| paket adı | `Dragon Block C Utimate 2.0 V1.1` (yazım kaynakta böyle) |
| **lisans** | **BEYAN YOK** — pakette `LICENSE`, `README` ya da izin metni yok |
| marka katmanı | Dragon Ball → **Toei / Shueisha / Bird Studio** |
| yapımcı dili | Portekizce (kod yorumları ve dosya adları) |
| platform | Bedrock, `min_engine_version` 1.20.50 |
| içerik | 1.538 dosya · 724 PNG · 704 JSON · 81 mcfunction · 15 OGG · 8 mcstructure · **3 JS** |

**İzin kademesi: BİRİNCİ — hiçbir dosya alınmadı.** Lisans beyanı yok,
üstüne üçüncü taraf marka katmanı var. Yalnız sayılar ve mekanikler okundu.

---

## 1. Bu mod betikle değil KOMUTLA çalışıyor

Toplam JavaScript: **93 satır**, üç dosya. İkisi oyunu hiç etkilemiyor:

| dosya | satır | ne yapıyor |
|---|---|---|
| `dmg.js` | 34 | vuruşta havaya hasar sayısı yazıyor (`summon pp:damage`) |
| `health.js` | 54 | can ve azami canı skor tahtasına yazıyor (HUD için), 5 tick'te bir |
| `main.js` | 5 | ikisini içeri alıyor |

Bütün mekanik **81 `.mcfunction`** dosyasında ve **108 varlık JSON'unda**.
Bu, deponun daha önce işlediği BoraLo / Dave / Kevin modlarıyla aynı kalıp —
ama çok daha büyük ölçekte.

## 2. Irk ve form sistemi

Üç ırk (`functions/config_dbc/race/`):

| ırk | kaynak adı |
|---|---|
| Saiyan | `forma_base_saiyajin` |
| Namek | `forma_base_namekuseijins` |
| Arcosian (Frieza ırkı) | `forma_base_arcosiano` |

Saiyan'ın **dokuz form etiketi**:

`super_form_ssj` · `ssj2` · `ssj3` · `ssj4` · `ssj5` · `ssj_god` ·
`ssj_blue_rose` · `ssj_blue_rose_evolution` · `oozaru`

**Mekanik:** form seçimi bir **skor** (`ui_saiyajin`), uygulaması **etiket**.
Her form değişiminde önce bütün öbür etiketler siliniyor, sonra istenen
ekleniyor — yani formlar karşılıklı dışlayıcı ve durum tek yerde tutuluyor.

Bizim `BEN10` ve `ZIRH_MODLAR` sistemlerimizle aynı fikir; farkı, orada
durum bellekte ve dinamik özellikte, burada skor tahtasında.

## 3. Füzyon

`functions/fusion/` altında **iç içe bir fonksiyon ağacı**: `fusion_start`
→ `acontesa_fusao` → `fusao_segura` → `fusion_end`, birden çok kademede
(`fusion/1/1/1/`). İki oyuncunun birleşmesi ve süre sonunda ayrılması.

Deponun hiçbir yerinde iki oyuncuyu birleştiren bir mekanik yok.

## 4. Düşmanlar — ölçülen can ve hasar

108 varlığın 81'inde `minecraft:health` tanımlı.

| varlık | can | hasar |
|---|---|---|
| `dbc:sombra` | **40.000** | 20 |
| `dbc:cell3_form_fn_saga` | 5.500 | **120** |
| `dbc:cell3_form3_saga` | 5.000 | 120 |
| `dbc:cell2_form2_saga` | 4.800 | 110 |
| `dbc:android18_saga` | 4.500 | 100 |
| `dbc:cell1_form1_saga` | 4.500 | 100 |
| `dbc:android16_saga` | 4.200 | 100 |
| `dbc:android17_saga` | 4.000 | 80 |
| NPC'ler (Babidi, Bills, Kaioh, Enma, Kame, Kamisama, Karin, Piccolo) | 4.000 | — |

**Kıyas:** bizim en dayanıklı oyuncumuz 420 can (absorption'la 520 havuz).
Bu modun sıradan bir NPC'si 4.000, en güçlü düşmanı 40.000 can taşıyor —
yani ölçek bizimkinin yaklaşık **on katı**. Sayılar olduğu gibi alınamaz.

## 5. Eşyalar

67 özel eşya. 44'ünde hasar, 40'ında koruma tanımlı (bazıları ikisi birden).

| silah | hasar | netherite kılıç katı |
|---|---|---|
| `dbc:espada_trunks` | 20 | 2,5× |
| `dbc:espada_z` | 15,5 | 1,9× |
| `dbc:katana` | 10,5 | 1,3× |
| `dbc:bastao_magico` | 5 | 0,6× |

Zırhta parça başına **en yüksek koruma 9** — ceketler ve göğüslükler
(`jaqueta_*`, `whis_peitoral`, `bills_peitoral`, `vegeta_peitoral`,
`goku_black_peitoral`, `goku_xeno_peitoral`).

**Kıyas:** bizim en iyi tek parçamız 20 koruma. Bu mod zırhta bize göre
ölçülü, silahta ise çok daha ölçülü (bizim Void Kılıcı 255).

## 6. Üretim tarifleri — 12 tane

Bu modun **gerçek craft zinciri var**, bizim v7.96.5'te kurduğumuza benzer:

| tarif | sonuç |
|---|---|
| `espadaz` | `dbc:espada_z` |
| `katana` | `dbc:katana` |
| `katanablade` | `dbc:katanabla` (ara ürün) |
| `swordblade` | `dbc:swordbl` (ara ürün) |
| `caboespadaz` | `dbc:caboz` (kabza, ara ürün) |
| `cabokatana` | `dbc:cabok` (kabza, ara ürün) |
| `battle1_peitoral` · `battle1_calsa` · `battle1_bota` | zırh parçaları |
| `tesoura` | `dbc:tesoura` (makas) |
| `minerio_de_warenai` | cevher işleme |
| `dino_asado` | yemek |

**Bizim iksir zincirimizle aynı fikir:** kılıç doğrudan yapılmıyor —
önce **bıçak** (`katanablade`, `swordblade`), ayrıca **kabza** (`cabok`,
`caboz`), sonra ikisi birleşip kılıç oluyor. Kullanıcının iksirler için
istediği "tek tek yap, sonunda birleştir" kalıbının aynısı.

## 7. Diğer içerik

| ne | sayı |
|---|---|
| varlık (BP) | 108 |
| istemci varlığı (RP) | 70 |
| model | 123 |
| animasyon | 41 |
| attachable | 49 |
| parçacık | 31 |
| ses | 16 |
| doku | 730 |
| blok | 26 |
| diyalog | 32 |
| ganimet tablosu | 11 |
| yapı (`.mcstructure`) | 8 |
| biyom / özellik | var |

32 diyalog dosyası: NPC'lerle konuşma ağaçları (Kame, Kamisama, Karin,
Piccolo, Enma, Babidi, Bills, Kaioh).

## 8. Bizde olmayan üç şey

1. **Füzyon** — iki oyuncunun birleşmesi. Depoda karşılığı yok.
2. **NPC diyalog ağacı** — 32 konuşma dosyası. Bizde sohbet komutu var,
   NPC diyaloğu yok.
3. **Yapı yerleştirme** (`.mcstructure` × 8) — hazır binalar. Bizde
   `dunya_uret.py` dünya üretiyor ama yapı yerleştirme yok.

## 9. Ölçülemeyenler

- Her formun verdiği güç: form etiketleri bulundu ama etiketin hangi
  efektleri/nitelikleri açtığı animasyon denetleyicilerinde ve `player`
  tanımında dağınık — tek tek çıkarılmadı.
- Ki (enerji) sistemi: skor adları görüldü, tavan ve yenilenme hızı
  ölçülmedi.
- 81 fonksiyonun tamamının komut komut dökümü.
- Saldırı hareketlerinin (Kamehameha vb.) menzil ve hasar sayıları.

Bunlar gerekirse ikinci turda çıkarılır.
