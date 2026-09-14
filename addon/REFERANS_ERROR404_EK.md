# Error 404 — ikinci geçiş: v7.74'te almadıklarım

**Bu dosya bir kez yazıldı.** İlk tarama `ayarlar.js` → "EFSANENİN SESSİZLİĞİ"
bölümünde. Bu dosya o taramanın **"alınmayanlar" listesine geri dönüyor**.

Kullanıcı: *"ben sana her zaman ne yiyorum hepsini al demiyor muyum… bundan
sonra kuralımdan vazgeçmeyeceksin… güzel mekanik diye geçme, diğerleri de
güzeldir ama sen onları almazsan o mod kalitesinde olmaz."*

**Kural kabul edildi ve bundan sonra geçerli:** alınabilecek her şey alınır;
alınmayan her şeyin sebebi tek tek yazılır ve sebep ya bir depo kuralı ya
ölçülmüş bir Bedrock sınırı olur — "bence bu daha güzel" bir sebep değildir.

---

## Kaynak

| | |
|---|---|
| dosya | `Error404-1.3.8-forge-1.20.1.jar` (8,6 MB) |
| modId | `glitchmanv` — *GlitchManV2* |
| yapan | lucam, MCreator |
| platform | Minecraft **Java** 1.20.1, Forge + MCreator (+GeckoLib, isteğe bağlı) |
| md5 | `363fa26e7729c9cfe9a805a41c33a4e5` |

```
512 dosya · 253 sınıf · 175 JSON · 61 PNG · 10 ogg · 10 nbt
```

Sınıf dağılımı:

```
113 procedures   38 block      15 init       13 entity
 12 network      10 inventory  10 renderer    9 gui
  6 entity/model  5 item        4 particle    4 block/renderer
  4 block/model   4 display     2 block/entity 1 command
```

**113 prosedürün hepsi `javap` ile açıldı**, çağrılan Minecraft metotları ve
string sabitleri tek tek okundu. Mod çalıştırılmadı.

---

## v7.74'te alınanlar (değişmedi)

Altı olay: Sönen Meşale · Kapı Tıklatma · Kalp Atışı · Ensende Nefes ·
Kaçan Gölge · 404 Kaydı.

## v7.94'te alınanlar — eski "alınmayanlar" listesi

| v7.74'te ne yazmıştım | şimdi |
|---|---|
| *Faz sistemi: "kurulabilir ama ayrı bir iş"* | **ALINDI** |
| *ReplaceBlocksCode: "kalıcı bozar"* | **ALINDI** — defterle |
| *LiftChunks: "geri koyma garantisi yok"* | **ALINDI** — tersine çevrilerek |
| *(hiç değinilmemişti)* Config GUI | **ALINDI** — altı düğme |
| *(hiç değinilmemişti)* Şifre bilmecesi | **ALINDI** — birebir |
| *(hiç değinilmemişti)* CodemanDie / bitiş | **ALINDI** — satırları birebir |
| *ChangeMobTextures: "Bedrock'ta olmaz"* | **YARISI ALINDI** |

### 1. Faz sistemi — `RandomStageGiverProcedure` + `STAGE` niteliği

Kaynakta faz rastgele yükseliyor. Bizde **durakta geçirilen süre**
yükseltiyor: rastgele faz atlamak oyuncuya neden ilerlediğini
söylemezdi. Faz **düşmüyor** ve dünyaya yazılıyor.

Her fazın kendi cümleleri var, kaynaktan birebir:

| faz | kaynak | bizde |
|---|---|---|
| 1 | *I'm feeling watched… · Do you remember? · Something's off* | aynısı, Türkçe |
| 2 | *I see you… · Hello? · Behind You* | aynısı, Türkçe |
| 3 | *dQw4w9WgXcQ* + `<MobID:404> ⛥∅✞∞` | aynen |

`dQw4w9WgXcQ` bir YouTube kimliği ve **kaynağın kendi şakası** — uydurma
değil, o yüzden duruyor.

Faz düşük olayların **kapısını** değil, **kendisini** kapatıyor: seçenek
listesi her zaman aynı uzunlukta. Sebebi test tarafında: liste uzunluğu
değişseydi `efsane_korku.mjs`'in olay zorlama düzeneği sessizce başka bir
olayı çalıştırırdı. Bu tuzağa v7.94'te bir kez daha düşüldü ve testin kendi
yorumuna yazıldı.

### 2. Bozulan Blok — `ReplaceBlocksCodeProcedure`

v7.74'teki itiraz: *"oyuncunun kendi yapısını kalıcı bozar, geri koyma
garantisi yok."* Çözüm zaten depoda vardı — **meşale defterinin birebir
aynısı**: defter önce, zamanlayıcı sonra, geri koyarken "yerinde hâlâ bizimki
mi" denetimi.

Üstüne iki koruma daha:

- Yalnız **doğal zemin** bozuluyor (`stone`, `deepslate`, `dirt`,
  `grass_block`, `gravel`, `andesite`, `diorite`, `granite`, `tuff`).
  Sandık, fırın, yatak, kapı, cam, meşale listede **yok** — test bunu
  tek tek ölçüyor.
- Oyuncu araya girip o yere bir şey koyduysa **dokunulmuyor**; onunki kalır.

### 3. Yükselen Zemin — `LiftChunksProcedure`, tersine

Kaynak zemini yukarı itiyor, yani zeminden blok **eksiliyor**. Burada hiçbir
blok silinmiyor: zeminin bir parçası **havada yankılanıyor**, sonra siliniyor.

Neden tersine: "her kalıcı etkinin çıkışı olacak" kuralı bu depoda en sert
kural ve *zemini silip geri koyma* sözü chunk boşalırsa tutulamaz. Havaya
blok koymak ise en kötü ihtimalde **havada bir blok** bırakır — evinden bir
şey eksilmez. Korku aynı, risk yok. Test "zeminden tek blok bile eksilmedi"
diye ölçüyor.

### 4. Bozulmuş Sürü — `ChangeMobTexturesProcedure`'ün alınabilir yarısı

*"Bedrock'ta çalışma anında vanilla mob dokusu değiştirilemiyor"* — bu ölçüm
hâlâ doğru ve değişmedi. Ama değiştirilebilen bir yarısı var: **davranış.**
Çevredeki barışçıl hayvanlar duruyor ve sana dönüyor. Hayvan ölmüyor,
kaybolmuyor, hasar almıyor; yavaşlık süreli.

### 5. Yapılandırma — kaynaktaki config GUI'nin altı düğmesi

| kaynak düğmesi | bizde |
|---|---|
| Disable/Enable Entity Spawning | `korku_dogum` |
| Disable/Enable Block Converting | `korku_blok` |
| Disable/Enable Chunk Moving | `korku_zemin` |
| Spawn Rate 1/2/3 | `korku_siklik` |
| Clear all mod entities | `korku_temizle` |
| Is there an entity spawned? | `korku_durum` |

Hepsi **kalıcı** — dünya kapanınca unutulmuyor.

`korku_temizle` kaynakta modun varlıklarını siliyor; bizde defterleri
boşaltıyor. Vanilla hayvanları silmek **oyuncunun malını silmek** olurdu.

### 6. Şifre bilmecesi ve bitiş

`PasswordScriptProcedure` telefonu söylüyor (**334-303-9542**),
`Pass1Procedure` kabul edilen kodu tutuyor (**334303**). İkisi de birebir.

- `korku_not` → notu okur, telefonu sohbete düşürür
- `korku_sifre` → `> Şifre Reddedildi`
- `korku_sifre_334303` → `> Şifre Kabul Edildi` + bitiş

Bitiş `CodemanDieProcedure`'ün dört satırı, birebir çevrildi. Bitiş:
olayları durdurur, **fazı sıfırlar, defterleri boşaltır** ("artık hiçbir şey
yok" derken ortada bozulmuş blok kalmasın) ve kaynağın kendi sözü gereği
yapılandırmadan geri açılabilir.

---

## Hâlâ alınmayanlar ve **ölçülmüş** sebepleri

Dördü de "beğenmedim" değil; ikisi depo kuralı, ikisi Bedrock sınırı.

| ne | sebep |
|---|---|
| **`kick @p`** (`SeenScriptProcedure`) | Sahte bir çökme mesajıyla oyuncuyu atıyor: *"Internal Exception: java.io.IOException: Emergency Shutdown"*. Bedrock davranış paketinde `kick` **yok**; olsaydı da sahte bağlantı kopması üretmek yalan olurdu. v7.74'te yerine sohbet satırı alınmıştı — korkusu aynı, yalanı yok. |
| **Jumpscare / deathmode** | Ekranı kaplayan yüz + öldürme. Bedrock script'te **istemci render kancası yok**; öldürme kısmı da kullanıcının şartına aykırı. |
| **`DisturbSleepProcedure`** | İki ayrı sebep: (1) `m_6469_` ile **hasar veriyor** — şart bunu dışlıyor; (2) Bedrock script API'sinde **yatak kancası yok**. v7.74'te Kapı Tıklatma zaten geceye bağlanarak bunun yerine geçmişti. |
| **Mob dokusu değiştirme** | Bedrock'ta çalışma anında vanilla mob dokusu değiştirilemiyor. Davranış yarısı alındı (yukarıda). |

## Taşınamayan dosyalar

| ne | adet | neden |
|---|---|---|
| `.ogg` ses | 10 | Başka modun telifli ses bankası |
| `.nbt` yapı | 10 | Java NBT yapı formatı; Bedrock `.mcstructure` istiyor. Üstelik modun kendi yapıları (bunker, burnt_house, ruined_village…) |
| `.png` doku | 61 | Modun kendi dokuları |
| GeckoLib model | 6 | Modun kendi varlık modelleri |

Bunlar "alınmadı" değil **alınamaz**: telifli varlık dosyaları. Mekaniğini
almak serbest, dosyasını kopyalamak değil.

---

## Şart bozulmadı

`error404.js` içinde `applyDamage(`, `createExplosion(`, `.kill(`,
`setOnFire(`, `clearAll(` ve `minecraft:inventory` **hiç geçmiyor** —
test yorumları soyarak kaynak metninde arıyor.

Kullanıcının şartı: *"bu da aynı şekilde bana zarar vermesin, önceki korku
modlarında eklediğim gibi."*
