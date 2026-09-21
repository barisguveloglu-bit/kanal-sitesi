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

## 9. Formlar gerçekten ne veriyor — ikinci turda ölçüldü

Zincir: `ui_saiyajin` skoru → `super_form_*` etiketi → varlık olayı →
`forms_saiyajin<N>` özelliği → animasyon denetleyicisi `stat_health`,
`stat_attack` ve `bp_score` ekliyor.

**Formüller doğrulandı** (`entities/…363.json`, 500 + 550 bileşen grubu):

```
can   = 200 + 10 × stat_health      (500 grubun 500'ü de uyuyor)
hasar = 3   +  3 × stat_attack      (550 grubun 546'sı uyuyor)
```

| form | can | hasar | güç (bp) | ki/tick |
|---|---|---|---|---|
| taban | 220 | 12 | — | 0 |
| oozaru | 220 | 12 | +200 | **0** (aşağıdaki hataya bak) |
| ssj | 260 | 33 | +1.200 | 1 |
| ssj2 | 280 | 48 | +2.500 | 2 |
| ssj3 | 300 | 63 | +3.200 | 3 |
| ssj4 | 320 | 78 | +4.500 | 4 |
| ssj5 | 340 | 93 | +5.200 | 5 |
| ssj god | 360 | 108 | +7.000 | 6 |
| ssj blue | 420 | 123 | +8.200 | 7 |
| ssj blue evolution | 440 | 138 | +9.200 | 10 |
| ssj rose | 400 | 129 | +8.500 | 7 |
| ssj rose evolution | 420 | 144 | +9.500 | 10 |
| ultra instinct (eksik) | 450 | 153 | +12.000 | 10 |
| ultra instinct (tam) | 500 | 183 | +15.000 | 15 |
| beast | 600 | 213 | +18.000 | 7 |
| ultra ego | 700 | 243 | +20.000 | 7 |

Dönüşüm şarjı: çömelirken `forms_tran` +2/tick, **115**'te dönüşüm olur.

**Hiçbir form hız ya da efekt vermiyor.** Depodaki 37 `effect @` satırının
tamamı tarandı: ışınlanma karartması, füzyon görünmezliği ve bulut uçuşu.
Form component_group'ları yalnız `minecraft:scale` içeriyor — o da sadece
`oozaru`da 2, kalan her formda 1.

### İki hata bulundu (kaynağın kendi hataları)

1. **Oozaru ki harcamıyor.** `functions/forms.mcfunction:30` oozaru'ya
   geçerken `dimi_ki` etiketini kaldırıyor, dolayısıyla sızıntı sayacı
   hiç artmıyor. Bedava form.
2. **`forms.mcfunction:276`** — `ssj_blue_rose_evolution` bloğunun içinde
   ama `ki_ssj_blue_rose` etiketini okuyor. Evolution'ın tüketimi aynı
   etikete iki kez yazılıyor (7 + 10).

## 10. Ki sistemi

| ölçüm | değer |
|---|---|
| tavan | **500** (`spawn_scoreboard.mcfunction:121`) |
| taban | 0 |
| başlangıç | 0 |
| pasif yenilenme | sayaç +1/tick, **200'de 1 ki** — yalnız aura kapalıyken |
| elle şarj | çömelerek GUI düğmesi, **+5 ki** |
| Senzu fasulyesi | ki'yi **500'e** tamamlar + instant_health 255 |
| yemek | 38 çeşit, +2 … +8 |
| gösterge | 0–500 aralığı **24 çubuk kademesi** |

Tüketim:

| yol | miktar |
|---|---|
| aura (n_score) | 1.000 sayaçta 1 ki; kademeye göre +1 … **+28**/tick |
| form sızıntısı | 120 sayaçta 1 ki; forma göre 1 … 15/tick |
| uçuş | 20 sayaçta 1 ki |
| Kienzan | **−50** (kullanım şartı ki ≥ 50) |
| Teleport | **−50** |

**Aura (`n_score`)** ayrıca doğrudan güç veriyor: her 10 kademede
`stat_attack` +1 ve `bp_score` +32. Tavan 50'ye kırpılmış ama denetleyici
100'e kadar durum tanımlıyor — kaynağın kendi tutarsızlığı.

**Kaioken:** çömelerek şarj, 500/1000/1500'de 2x/3x/5x. Ama `kaioken_ind`
skorunun cana ya da hasara ne yaptığı **depoda hiçbir yerde okunmuyor** —
ölü sistem.

## 11. Saldırılar — Kamehameha YOK

İki paket baştan sona tarandı: **Kamehameha, Final Flash, Galick Gun,
Masenko, Big Bang, Special Beam Cannon — hiçbiri yok.** Tek eşleşme
"Kame House" adlı bir yapı dosyası.

Üç saldırı eşyası var, üçü de mermi:

| eşya | ki | bekleme | hasar |
|---|---|---|---|
| **Ki Blast** (şarjlı) | doğrudan yok, `ki ≥ 1` şartı | **yok** | patlama 1,2 … 3 |
| **Kienzan** | 50 | 0,8 sn | patlama 1 |
| **Teleport** | 50 | 1,5 sn | yok |

Ki Blast şarjı +10/tick; **240 tick (12 saniye)** en güçlü atış için.
900'ün altında bırakılırsa **hiçbir şey çıkmıyor**. Dördünde de doğrudan
çarpma hasarı yok — hasarın tamamı patlamadan geliyor.

## 12. Kılıç zincirinin malzemeleri

Daha önce sonuçları biliniyordu, şimdi desenleri de ölçüldü:

| tarif | desen | malzeme |
|---|---|---|
| `katanabla` (bıçak) | `AAA / AAA / ␣A␣` | 7 × demir külçe |
| `cabok` (sap) | `A␣A / BCB` | 2 demir + 2 deri + 1 katchinko |
| **`katana`** | `B / C` (dikey) | bıçak + sap |
| `swordbl` (bıçak) | `␣A␣ / BAB / ␣A␣` | 3 katchinko + **2 katanabla** |
| `caboz` (sap) | `A␣A / BCB` | 2 **altın** + 2 deri + 1 katchinko |
| **`espada_z`** | `B / C` (dikey) | bıçak + sap |

Ham maliyet: katana **9 demir + 2 deri + 1 katchinko**;
espada_z **14 demir + 2 altın + 2 deri + 4 katchinko**.

`dbc:katchinko`'nun tarifi **yok** — madencilikten geliyor olmalı.

Battle zırhı üç parça, hepsi tek malzeme (`dbc:warenai`): bot 4, pantolon
7, göğüslük 8. `warenai` fırında `warenai_block`'tan eriyor.

**Bizim iksir zincirimizle örtüşme:** kılıç doğrudan yapılmıyor — önce
bıçak, ayrıca sap, sonra ikisi dikey olarak birleşiyor. Kullanıcının
iksirler için istediği kalıbın aynısı, bağımsız olarak.

## 13. Ölçülemeyenler

- Her formun verdiği güç: form etiketleri bulundu ama etiketin hangi
  efektleri/nitelikleri açtığı animasyon denetleyicilerinde ve `player`
  tanımında dağınık — tek tek çıkarılmadı.
- Ki (enerji) sistemi: skor adları görüldü, tavan ve yenilenme hızı
  ölçülmedi.
- 81 fonksiyonun tamamının komut komut dökümü.
- Saldırı hareketlerinin (Kamehameha vb.) menzil ve hasar sayıları.

Bunlar gerekirse ikinci turda çıkarılır.
