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

## Alınmayanlar ve nedeni

| kaynak | neden alınmadı |
|---|---|
| `TntRain` | gökten TNT yağıyor — **hasar verir**, şart bunu dışlıyor |
| `Trap1` | oyuncunun konumuna `LightningBolt` — aynı sebep |
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
