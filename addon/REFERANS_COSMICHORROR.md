# Referans · Cosmic Horror (korkumodu) 0.0.4

**Çalıştırılmadı.** Jar zip olarak açıldı, `.class` dosyalarının sabit
havuzu ve dil dosyası okundu. Oyunda tek satırı denenmedi.

| md5 | bayt | ad |
|---|---|---|
| `e185c34fae5e290f6b4b5a8f5d5bcb56` | 3.914.149 | `cosmichorror0.0.4forge1.20.1curseforge.jar` |

Forge 1.20.1. 223 girdi: 98 `.class`, 41 `.json`, 15 `.png`, 11 `.ogg`,
8 `.nbt`. İç ad alanı `korkumodu`, sınıflar `com.adalances.cosmichorror`.
Varlık ve ses adları Türkçe (`paranoya`, `kurtolum`, `bombardiman`).

## Kullanıcının şartı

> *"bu yaratıklar bana saldırmasın, saldırırsa efsane kendi oluşturduğu
> yaratıklar tarafından saldırıldı gibi bir şey olur ve hiç iyi olmaz"*

## Saldırı taraması

`events/` altındaki **21 olay sınıfının** sabit havuzunda şunlar arandı:
`setTarget`, `setAttacking`, `attack`, `damage`, `hurt`,
`setAggressive`, `startAttacking`, `tryAttack`, `DamageSource`, `kill`,
`setHealth`.

**20 sınıfta hiç iz yok.** Tek istisna `HauntedWolves` ve orada da
bulunanlar `ALLOW_DAMAGE` / `allowDamage` — yani hasara *izin veren*
bir kanca, ve hedef oyuncu değil kurt (`kurtolum` sesi, `Wolf` sınıfı).

Yani modun tasarımı zaten atmosferik: bakma, ses, ışık, illüzyon.
Kullanıcının şartıyla çatışmıyor.

## Alınanlar (5 olay)

Hepsi Efsane duraklarının çevresinde, hiçbiri hasar vermiyor.

| bizdeki | kaynaktaki | ne yapıyor |
|---|---|---|
| Bakış | `Paranoya` | yakındaki yaratıklar dönüp sana bakar |
| Aya Bakış | `MoonLook` | yaratıklar sana değil, göğe bakar |
| Hayalet Ses | `PhantomAnimals` | hayvan sesi — ortada hayvan yok |
| Uzak Kazma | `EchoMining` | yer altındayken uzaktan kazma sesi |
| Uzak Işık | `DistantBeacon` | gece uzakta meşale yanar, sonra söner |

### Bakış nasıl yapılıyor

Kaynak `EntityAnchorArgument$Anchor` kullanıyor, yani `lookAt`.
Bedrock script'te varlığa "şuraya bak" dedirten API yok;
`/tp <hedef> ~ ~ ~ facing ...` var ve yaptığı tam bu.

**Yaratık dönüyor, hedef almıyor.** `setTarget` çağrılmıyor, saldırı
durumu değişmiyor. Zaten saldıran bir zombi saldırmaya devam eder;
saldırmayan biri bu komutla saldırgan olmaz.

Seçici `type=!player` içeriyor: **başka oyuncular döndürülmüyor.**
Bir oyuncunun bakışını zorla çevirmek v7.65'te savunma yazdığımız
griefing kalıplarından biri — kendi eklentimiz onu yapmayacak.

## v7.72 — şart düzeltildi, hasarlılar da alındı

Kullanıcı v7.71'deki şartını düzeltti ve haklıydı; ben yanlış anlamışım:

> *"Ben bir efsaneyim gibiyim aslında; onun kendi yaratıkları kendisine
> zarar verirse bu gülünç bir durum. Korkutması gerekirken 'bu nasıl
> efsane ya, nerede korkunçluk, nerede gizem' diye sorgularlar. Hasar
> olanları da ekle ama bana bir şey yapmasınlar."*

Şart **"hasar olmasın" değil, "hasar bana değmesin"**. `TntRain` ve
`Trap1` bu yüzden artık içeride.

| bizdeki | kaynaktaki |
|---|---|
| TNT Yağmuru | `TntRain` |
| Yıldırım | `Trap1` |

**Güvenlik efektle değil geometriyle.** Tehlike bir halkaya düşüyor:
efsanenin en az 16, en çok 30 blok ötesi. Ve patlama **anında** mesafe
yeniden ölçülüyor — oyuncu bu arada halkanın içine yürüdüyse o patlama
hiç yapılmıyor. TNT havada 2 saniye kalıyor, yalnız doğuş anına bakmak
"muhtemelen güvenli" olurdu.

Direnç efekti verilmiyor: hem *"Direnç V yasak"* kuralına takılır, hem
yanlış çözüm olurdu — oyuncu diğer her şeye karşı da korunmuş olurdu.

TNT'nin görüntüsü vanilla, patlaması bizim (`guclu_tnt.js`'teki aynı
teknik): varlık fitil dolunca elle kaldırılıp yerine bizim patlamamız
çağrılıyor. Böylece hem güç (4, vanilla ile aynı) hem `breaksBlocks`
(**false**) bizde — yoksa Efsane yapısının kendisi havaya uçardı.

Diğer oyuncular varsayılan olarak **vurulmuyor**; habersiz birini
patlatmak v7.65–v7.69'da savunma yazdığımız şeyin kendisi olurdu.

## Hâlâ alınmayanlar ve nedeni

| kaynak | neden alınmadı |
|---|---|
| `TotemHeist` | totemi çalıyor — *"hiçbir yetenek oyuncunun eşyasını kaybettirmez"* kuralına aykırı |
| Envanter illüzyonu | kaynakta *"visual-only, real items never change"* yazıyor; Bedrock script'te görsel-only envanter **yok**, gerçekten değiştirmek gerekirdi — aynı kurala takılıyor |
| `SecondMoon`, `VersionCorruption` | ikisi de `client/` altında, istemci render'ı; Bedrock'ta karşılığı yok |
| `LeafDestroyer` | yaprakları siliyor; oyuncunun kendi yapısını bozabilir ve geri koyma garantisi yok |
| `HauntedWolves` | modun tek hasarlı sınıfı; hedef kurt olsa da kullanıcının evcil hayvanına dokunmuyoruz |

## Sınırlar

- Menzil **32 blok**, müziğinkinden (64) dar: müzik "durağı gördün",
  korku "durağın içindesin" diyor
- Tarama 2 saniyede bir, olay şansı **%25**, olaylar arası en az
  **10 saniye** — korku seyrek olunca korku
- Uzak ışık **geçici**: 5 saniye sonra kaldırılıyor, yalnız havanın
  yerine konuyor ve yalnız *bizim* koyduğumuz meşale siliniyor
- Zincir kurulmamışsa tarama **tek satırda** çıkıyor

## Test

`efsane_korku.mjs` — 30 madde. En önemlisi **hiçbir olayın zarar
vermediği**, ve iki yönden ölçülüyor: kodda hasar çağrısı var mı
(yorumlar çıkarılarak), ve 400 tarama çalıştırılınca oyuncunun canı
değişti mi.

**7 mutasyon denendi, 7'si de yakalandı.**
