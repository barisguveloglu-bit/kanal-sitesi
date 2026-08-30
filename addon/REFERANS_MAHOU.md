# Mahou Tsukai — kaynak notları (v5.4)

Kullanıcının isteği: *"bir tane daha mod buldum bunu da ekle aynı
şekilde... kalıcı olarak aktar."*

## Kaynak

`mahoutsukai 1.21.1 v1.36.27` (NeoForge jar). Sayıların **tamamı** modun
kendi yapılandırmasından:

    stepsword/mahoutsukai/config/MTConfig$Server.class

Bu sınıf **448 ayarı** `intconfig` / `doubleconfig` / `booleanconfig`
çağrılarıyla tanımlıyor. `mahou_coz.py` bytecode'u okuyup her ayarın
**varsayılan** değerini çıkardı; sonuç `mahou_config.json` olarak depoda.
`test/mahou.mjs`'in 5. bölümü otuzdan fazla sayıyı oradan geri okuyup
`ayarlar.js` ile karşılaştırıyor.

## Alınanlar

**36 eşya** — 16 silah/asa/alet + 20 büyü parşömeni.

### Silahlar ve odaklar

| eşya | hasar | dayanıklılık | kaynak |
|---|---|---|---|
| Caliburn | 3 | 1000 | `GrowSwordItem(Tiers.IRON, 3.0f)` |
| Clarent | 3 | 1500 | `CLARENT_DURABILITY` |
| Morgan | 3 | 1000 | |
| Rule Breaker | 5 | 1000 | `SwordItem(Tiers.IRON)` |
| Rhongomyniad | 3 | 1000 | |
| The Ripper | 2.5 | 1200 | `RIPPER_DAMAGE`, `RIPPER_DURABILITY` |
| Nobu | 8 | 10000 | `NOBU_BULLET_DAMAGE`, `NOBU_DURABILITY` |
| Emrys · Mystic Staff · Spatial Staff · Hazine Eldiveni | — | 1000 | odak |
| Hançer · Çekiç · Kodoku · Uyumlu Elmas/Zümrüt | — | — | alet (kaynakta da hasarsız) |

Hasar dönüşümü WoM'daki ölçülmüş kural: Java'da eşyanın sayısı bir
**değiştirici**, Bedrock'ta `minecraft:damage` **toplam** → +1. Eşitlik
**aşağı** yuvarlanıyor (v4.96 kuralı: kaynaktan fazlasını asla verme) —
The Ripper'ın 2.5'i bu yüzden 3 oluyor, 4 değil.

### Mana — modun kalbi

| ayar | değer |
|---|---|
| `MAX_MANA_CAP` | 200000 |
| `MANA_REGEN_PER_TICK` | 1 |

Her büyünün bir bedeli var ve **manan yoksa büyü çalışmıyor**. Yarım
ödeme yok: ya tamamı iner ya hiçbir şey olmaz. Bu olmasaydı yirmi büyü
yirmi bedava düğmeye dönerdi ve modun dengesi kaybolurdu.

Başlangıç manası (2000) **bizim seçimimiz**; kaynakta oyuncu 0 mana ile
başlıyor ve ritüellerle artırıyor (`MANA_INCREASE 1`). Ritüel sistemi
alınmadığı için bir başlangıç vermek gerekti ve bunun kaynakta karşılığı
olmadığı `ayarlar.js`'te yazıyor.

### Büyü bedelleri (hepsi kaynağın kendi ayarı)

| büyü | mana | ayar adı |
|---|---|---|
| Gandr | 5 | `GANDR_MIN_DAMAGE` ölçeği |
| Yükseliş | 30 | `ASCENSION_SCROLL_MANA_COST` |
| Hasar Takası | 40 | `DAMAGE_EXCHANGE_MANA_COST` |
| Fay Görüşü | 100 | `FAY_SIGHT_MANA_COST` |
| Uzamsal Karışıklık | 100 | `SPATIAL_DISORIENTATION_MANA_COST` |
| Kelebek Etkisi | 100 | `BUTTERFLY_EFFECT_MANA_COST` |
| Kehanet | 220 | `CLAIRVOYANCE_MANA_COST` |
| Kara Alev | 300 | `BLACK_FLAME_MANA_COST` |
| Rho Aias | 300 | `RHO_AIAS_MANA_COST` |
| Zihinsel Yer Değiştirme | 300 | `MENTAL_DISPLACEMENT_MANA_COST` |
| İçgörü | 320 | `INSIGHT_MANA_COST` |
| Bağlama | 320 | `MYSTIC_EYES_MANA_COST` |
| Bağışıklık Takası | 400 | `IMMUNITY_EXCHANGE_MANA_COST` |
| Ölüm Toplama | 400 | `DEATH_COLLECTION_MANA_COST` |
| Düşüş | 2000 | `FALLEN_DOWN_MANA_COST` |
| Sınır büyüleri | 1–5 / çevrim | `*_BARRIER_MANA_COST` |

**Tek tahmini bedel**: Varlık Gizleme (100). Kaynakta ayrı bir mana ayarı
yok; Fay Görüşü ile aynı kademede duruyor. Özette *"bedeli tahmini"*
yazıyor ve test bu ibarenin orada kaldığını sınıyor.

## Aktarılamayanlar (özetler vaat etmiyor)

- **Büyü çemberleri.** Modun asıl arayüzü yere çizilen çember (blok
  deseni + ritüel). Bedrock'ta blok deseni okuyup ritüel çalıştırmak ayrı
  bir sistem; büyüler bizde **parşömeni tutup** tetikleniyor.
- **Büyüyen kılıçlar.** Caliburn/Clarent/Morgan kaynakta bir ritüelle
  güçleniyor (`POWER_CONSOLIDATION_SWORD_MANA_COST 5000`, göl eşiği 150,
  tavan 5.000.000). Ritüel sistemi alınmadı; kılıçlar **taban** güçleriyle
  geliyor.
- **Familya, Gerçeklik Mermeri, Kadeh (grail).** Kendi boyutları ve
  varlıkları var.
- **William.** Modda **2B ikonu yok** (`builtin/entity` ile çiziliyor),
  yani alınacak piksel yok. Uydurma ikon çizmek yerine aktarılmadı.
- **Güçlendirme** kaynakta *eşyayı* güçlendiriyor; Bedrock'ta eşyanın gücü
  script'ten değiştirilemiyor, o yüzden **oyuncuyu** güçlendiriyor ve özet
  de öyle diyor.

## Bir tuhaflık: parşömenler tek ikonu paylaşıyor

Modda 45 büyünün hepsi `spell_scroll.png` kullanıyor — büyü başına ayrı
ikon **yok**. Bizde de öyle: yirmi parşömen tek ikonla geliyor. Farklı
görünsünler diye ikon uydurmadık; ayırt edici şey eşyanın adı ve menüdeki
özeti.

## Test bir gerçek hata buldu

`manaYaz` ilk yazımda `setDynamicProperty` yoksa `hataYaz` çağırıyordu.
Tarama testi yakaladı:

```
✗ hicbir yetenek HATA GUNLUGE dusurmedi
  :: HATA @ mahou.manaYaz: oyuncu.setDynamicProperty is not a function
```

Content Log saniyede üç kez, her oyuncu için dolardı. Artık eksiklik **bir
kez** ölçülüyor, bir kez bildiriliyor ve bellekteki deftere düşülüyor —
mana o oturumda çalışıyor, yalnız dünya kapanınca sıfırlanıyor.
(`bot_ilkel`deki *"eksik API özelliği kapatır, paketi öldürmez"* kuralı.)
