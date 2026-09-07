# Referans · SLR 1.7.8 (Solo Leveling: Reawakening)

## Bu dosya ne, ne değil

**Bu bir mod değil, bir CurseForge MODPAKETİ export'u.**

| | |
|---|---|
| Minecraft | 1.21.1 |
| Yükleyici | NeoForge 21.1.249 |
| Mod sayısı | **156** |
| Zip içeriği | `manifest.json` + `modlist.html` + `overrides/` |

`manifest.json` modları yalnızca **CurseForge proje kimliğiyle**
listeliyor — jar dosyaları paketin içinde **yok**. Paketteki 363
girdinin tamamı ayar dosyası, doku ve ses.

İlgili iki mod:
- **Solo Leveling: Reawakening** (Efkrdnzz) — ad alanı `sololeveling`
- **Solo Leveling: Arsenal** (Zerotekz)

## Bu yüzden neyi ölçebildim, neyi ölçemedim

**Ölçüldü** — FTB görev dosyalarından (`overrides/config/ftbquests/`)
doğrudan okunarak:

- Rütbe harfleri (`mana_crystal_e` / `_a` / `_s` ve hançer adları):
  **E · D · C · B · A · S**
- Tam eşya kataloğu ve hangi düşmandan düştüğü
- Boss listesi

**Ölçülemedi:**

- **Hiçbir silahın hasar sayısı.** Jar yok.
- **Stat/seviye tavanı.** Pakette tek SLR ayarı
  `sololeveling-client.properties` ve içinde yalnızca görünüm
  ayarları var:
  ```
  damageNumbersEnabled=true
  entityOutlinesEnabled=true
  perceptionOutlinesEnabled=true
  outlineDensity=1
  notificationLifetimeSeconds=5.0
  ```
  Ne bir stat adı, ne bir tavan, ne bir seviye eğrisi.

## Eşya kataloğu (görev dosyalarından)

### Harfli kademe — rütbe merdiveni

| Rütbe | Hançer | Düşüren |
|---|---|---|
| E | `dagger_karambit_e` | `goblin_archer` |
| D | `dagger_knight_d` | `polar_bear` |
| C | `dagger_chain_c` | `d_knight_2` |
| B | `dagger_golden_b` | `goblin_mage` |
| A | `dagger_heat_a` | `goblin_club` |
| S | — (mana kristali `mana_crystal_s` boss ödülü) | bütün bosslar |

### Adlı kademe — harflerin üstünde

| Eşya | Düşüren |
|---|---|
| **`demon_kings_long_sword`** | `d_knight_1` |
| **`barukas_dagger`** | `mutated` |
| `demon_kings_dagger` | `steel_fang_wolf` |
| `mythic_dagger` | `stone_golem` |
| `gravity_dagger` | `centipede` |
| `emerald_dagger` | `green_orc` |

### Boss listesi

`statue_of_god` · `kamish` · `goblin_king` · `spider_boss` ·
`beru_boss` · `baruka` · `fanged_kasaka` · `blood_red_com_igris` ·
`d_knight_1/2/3` · `ancient_samurai` · `futuristic_golem` ·
`gem_golem` · `mini_gem_golem` · `statueaxe` · `statuehammer` ·
`statuesword` · `mutated`

## Seçilen iki eşya ve gerekçesi

Hasar sayıları okunamadığı için seçim **görev ağacındaki konum** ve
**adlandırma** üzerinden yapıldı. Ölçüm değil, çıkarım —
gerçek sayılar için `sololeveling` jar'ının kendisi gerekiyor.

### 1. `demon_kings_long_sword` — Şeytan Kralı'nın Uzun Kılıcı

- Katalogdaki **tek uzun kılıç**. Diğer bütün `sololeveling`
  silahları hançer.
- Harfli kademeye değil **adlı kademeye** ait.
- `d_knight_1`'den düşüyor — Şeytan Kralı'nın Şövalyeleri'nin
  birincisi, üçünün en üstü.

### 2. `barukas_dagger` — Baruka'nın Hançeri

- Adlı silahlar içinde görev ağacının **en ucunda**: `mutated`'dan
  düşüyor.
- Kaynak eserde sahibinin imza silahı.
- Uzun kılıcın mekanik zıttı: tek hedefe hızlı ard arda vuruş.

**Elenen üçüncü aday:** `demon_kings_dagger`. Aynı adlı seriden
ama `steel_fang_wolf`'tan düşüyor — ağaçta Baruka'nınkinden
daha erken.

## Bizde nasıl karşılandı

`yetenekler/slr.js`, sıra 520–521. İkisi de `esyasiz`.

**Güç kapısı tek:** `SLR_ORAN × ruhCarpani`. `SLR_ORAN` =
`SLR_STAT / SLR_STAT_TAVAN` = 90/100 = **0.9**.

`SLR_STAT_TAVAN` bir **varsayım** (kaynaktan okunamadı). Gerçek
sayı öğrenilirse değiştirilecek tek yer o — `SLR_STAT` ve
`SLR_ORAN` kendiliğinden doğru çıkar.

**Rütbe gösterimi:** S yalnızca tavanın kendisi; tavanın altındaki
her değer en fazla A. Yani 90/100 ekranda `[A · 90/100]` olarak
görünüyor — kullanıcının "tavanın 10 altı" kuralı arayüzde de
okunuyor.
