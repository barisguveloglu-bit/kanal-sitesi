# Minecraft Kullanım Kılavuzu — okundu, uyulacak kurallar

Kaynak: <https://www.minecraft.net/en-us/usage-guidelines> — 2026-10-10'da
resmî sayfadan okundu (ilk iki denemede 503, sonra 200). Kullanıcının
isteği: *"o kurallardan asla çıkmamıza yarayabilir."* Kılavuz değişebilir
(kendisi söylüyor: "It's up to you to occasionally check back") — her
yayından önce sayfa yeniden açılıp bu belge doğrulanır.

Tanımlar: "isim" = Minecraft adı ve benzerleri; "marka" = logo, yazı tipi,
**dokular** ve ayırt edici özellikler; "varlık" = kod, grafik, **doku,
model, ses**, oyundan alınan video/ekran görüntüsü. Bizim filmlerimiz
blok dokusu ve (2. bölümden itibaren) yaratık kullandığı için **kılavuzun
kapsamında.** Kılavuz paylaşılan her şeyi "ticari kullanım" sayıyor —
para kazanılsın ya da kazanılmasın.

## Her video için kontrol listesi

| # | kural (kılavuzdan) | bizde |
|---|---|---|
| 1 | Resmî/onaylı/ilişkili izlenimi verme | kendi kanalımız, kendi hikâyemiz |
| 2 | Açıklamaya belirgin uyarı: *"NOT AN OFFICIAL MINECRAFT [PRODUCT/SERVICE/EVENT/etc.]. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT"* | videolar için: **"NOT AN OFFICIAL MINECRAFT VIDEO. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT."** — Part 1 dahil her videonun açıklamasına |
| 3 | "Minecraft" adı yalnız **ikincil** başlıkta; başlığın baskın/ilk öğesi olamaz | "<Ad> - Bir Minecraft Animasyonu" biçimi |
| 4 | Logo ya da markanın başka bir parçası (logoya benzeyen yazı tipi dahil) kendi markamızda kullanılmaz | kapakta/videoda Minecraft logosu yok |
| 5 | Video tamamen **ücretsiz** izlenebilir (ödeme duvarı yok); kopyası satılmaz; ücretli platformda (iTunes, Prime Video) dağıtılmaz | YouTube, reklam geliri — kılavuzun "we're cool with this" örneği |
| 6 | Reklam geliri için **yeterince özgün içerik** | kendi senaryo, karakter, kurgu, ses |
| 7 | **Başlık kartı, jenerik, sponsor notu ve diğer ibareler oyun içeriğinin DIŞINA** konur; sponsorlar çocuklara uygun olmalı | "1. BÖLÜM" yazısı sahnenin üstünden alınıp **ayrı (siyah) karta** konmalı — birleştirmede yapılır, kare yeniden çizilmez |
| 8 | Markaya zarar veren içerik yok: *"gambling, pornography, violence, terrorism, or other unsafe/mature content"* | **kan efekti dikkat**: kılavuz "violence" ve "mature content" sayıyor; dövüş Minecraft videolarında yaygın ama **gerçekçi kan** en riskli öğemiz (kullanıcı kararı bekliyor) |
| 9 | Kullanılan her müzik/ses için sahibinden izin, gerekli ücretler | CC0 müzik; Minecraft müziği yok |
| 10 | Minecraft ile ilgisiz ürün/hizmet reklamı için video yapılmaz | — |

## Mod tarafı (mod oturumu için)

Kılavuzun "Extended functionality and modifications" bölümü: mod =
Mojang'ın telifli kod/içeriğinin önemli bir kısmını **içermeyen** özgün
eklenti. Dağıtılabilir, eğer: yalnız mod dağıtılır (modlanmış Minecraft
değil); gerçek paraya dönen kazanç (play-to-earn) yok; oyun dışı ürün
sahipliğini (ör. NFT) doğrulayan bir işlev yok. Depo kuralımız bununla
uyumlu: Mojang dosyaları depoya/pakete girmez.

## Bilinçli yorum

Kılavuzun video bölümü oyun görüntüsü (gameplay) için yazılmış; Blender'da
çizilmiş bir animasyon da "varlık" (doku, model) kullandığı için aynı
kuralları uyguluyoruz — en dar okumayı seçiyoruz.

## Köylü dokuları ve modeli (v7.99.16)

Kullanıcı: *"köylüler de olacak fakat biraz az olsun … skinler bayağı fazla
hepsini indir."* MCprep'te yalnız çıplak köylü (`villager.png`) var; biyom,
meslek ve rütbe katmanları yok. Hepsi Mojang'ın Java istemcisinden alındı.

| ne | değer |
|---|---|
| kaynak | Mojang resmî sürüm listesi `piston-meta.mojang.com` → Java **26.3** (son kararlı sürüm, 2026-09-15) |
| istemci JAR'ı | `https://piston-data.mojang.com/v1/objects/e877b6a07acd633fb3bb475002175cec036e7b87/client.jar` (41.483.720 bayt) |
| SHA-1 (Mojang'ın listesinden) | `e877b6a07acd633fb3bb475002175cec036e7b87` |
| SHA-256 (bizim ölçümümüz) | `4508d006323f24fa02876310c192d739af56516eb259000ac50f0909a68c9a2d` |
| alınan | yalnız `assets/minecraft/textures/entity/villager/` (35 doku: çıplak yetişkin ve bebek, 7 biyom, 14 meslek, 5 rütbe, 7 bebek biyomu; 8 `.mcmeta`) |
| kurulum | `arac/arac_kur.sh` → `$KOYLU_DOKU` (`/opt/araclar/paketler/koylu`); JAR silinir |

**Depoya ve pakete girmez:** Mojang dosyası; yalnız filmde (videoda)
kullanılıyor, yukarıdaki kontrol listesiyle. `test/arac_kur.mjs` hem
sürümü ve iki özeti hem de depoda köylü dokusu olmadığını ölçüyor.

**Model uydurulmadı.** `arac/koylu.py`'deki kutular, pivotlar, kol açısı
(−0,75 rad) ve ölçek (0,9375) aynı JAR'dan `javap` ile okundu:
`VillagerModel.createBodyModel`, `LayerDefinitions`
(`MeshTransformer.scaling(0.9375)`) ve `VillagerProfessionLayer` (şapka
kuralı: biyomun şapkası yalnız mesleğin şapkası yoksa ya da yarımsa ve
biyomunki tam değilse görünür). Mojang 26.x'te Java kodunu karartmadığı
için sınıf ve yöntem adları okunur durumda. JAR sürüm atlarsa: yeni
JAR'ı indir, aynı üç sınıfı `javap -c -p` ile oku, `koylu.py`'deki
`PARCALAR`, `OLCEK`, `KOL_ACISI` değerlerini karşılaştır, sonra
`node addon/test/hanedan.mjs`.

## Buz ordusu modelleri (2026-11-24)

Kullanıcı: *"Ölçülerini oyunun kendi model kodundan okuyup skinlerini kodla
çizeceksin."* Zombi, iskelet, creeper ve örümceğin kutuları köylüdeki
JAR'dan (aynı SHA-1) `javap -c -p` ile okundu. JAR yalnız geçici klasöre
indi, depoya girmedi. **Dokuların hiçbir pikseli Mojang'ın değil:**
`arac/buz_ordu.py` her pikseli kodla çiziyor ve hiçbir dosya okumuyor
(`test/buz_ordu.mjs` bunu ölçüyor).

| yaratık | sınıf | okunan |
|---|---|---|
| zombi | `LayerDefinitions.createRoots`: `ZOMBIE = HumanoidModel.createMesh(NONE, 0)` | kafa 8³ (şapka katmanı +0,5), gövde 8×12×4, kol ve bacak 4×12×4; kol pivotu (±5, 2, 0), bacak (±1,9, 12, 0) |
| iskelet | `SkeletonModel.createBodyLayer` → `createDefaultSkeletonMesh` | kafa ve gövde zombininki; kol ve bacak 2×12×2, kol (±5, 2, 0), bacak (±2, 12, 0); `translateToHand` eşya için kolu 1 px içeri alıyor |
| creeper | `CreeperModel.createBodyLayer(NONE)` | kafa ve gövde (0, 6, 0); dört bacak tek kutu listesi, 4×6×4, (±2, 18, ±4) |
| örümcek | `SpiderModel.createSpiderBodyLayer` | kafa (0, 15, −3) 8³; body0 (0, 15, 0) 6³; body1 (0, 15, 9) 10×8×12; bacak 16×2×2, pivot (±4, 15, 2 / 1 / 0 / −1); dönüş y ±π/4 · ±π/8, z ±π/4 · ±0,58119 |

Hareket sabitleri (film aracına henüz bağlı değil; aynı JAR'dan):
- **Zombi kolları** (`AnimationUtils.animateZombieArms`): el boşsa xRot
  −π/2,25 (saldırganken −π/1,5), yRot sağda −0,1, solda +0,1.
- **Yay duruşu** (`HumanoidModel.poseRightArm`, BOW_AND_ARROW): sağ kol
  xRot −π/2, yRot −0,1; sol kol xRot −π/2, yRot 0,1 + 0,4.
- **Creeper yürüyüşü:** çapraz bacak çiftleri xRot = cos(0,6662·adım)·1,4·hız
  (öbür çift +π).
- **Yürüme sayacı** (`LivingEntity.calculateEntityAnimation`, `updateWalkAnimation`,
  `WalkAnimationState.update`): her tikte alınan yatay yol d (blok) → hedef
  min(4·d, 1); hız += (hedef − hız)·0,4; konum += hız. Yetişkinde konum
  ölçeği 1, bebekte 3. Aşağıdaki "adım" bu konum, "hız" bu hız.
- **Creeper şişmesi** (`CreeperRenderer.scale`): f1 = 1 + sin(100·ş)·ş·0,01;
  f = sınırla(ş, 0, 1)⁴; enine (1 + 0,4·f)·f1, boyuna (1 + 0,1·f)/f1. Beyaz
  parlama (`getWhiteOverlayProgress`): ⌊10·ş⌋ çiftse 0, tekse sınırla(ş, 0,5, 1).
  Filmde beyaz yerine tıslama ışıması bu ritimle yanıp sönüyor.
- **Örümcek yürüyüşü:** f = 0,6662·adım. Dört bacak çiftinde (arka, orta-arka,
  orta-ön, ön) yRot'a −cos(2f + 0 / π / π⁄2 / 3π⁄2)·0,4·hız, zRot'a
  |sin(f + 0 / π / π⁄2 / 3π⁄2)·0,4|·hız eklenir (sağda +, solda −).

**Buz kabuğunun kalınlığı da oyundan:** `LayerDefinitions` statik
başlangıcında `INNER_ARMOR_DEFORMATION = 0.5`, `OUTER_ARMOR_DEFORMATION = 1.0`.
Oyunun kendi buz iskeleti Stray'in dış katmanı (`STRAY_OUTER_LAYER`) ise
`HumanoidModel.createMesh(new CubeDeformation(0.25), 0)`, doku 64×32: ince
kemiği insan boyu kutularla sarıyor. Zombinin kabuğu gövde kutularını 0,5
şişiriyor (iç zırh). İskeletin bilek ve incik kabuğu kemiğin kendi kesitini
her yandan 1 px (dış zırh) sarıyor; boyu bizim seçimimiz (alt yarı).

**Dönüşte x'in işareti açık:** `jar_model_coz.py` Java'dan Bedrock'a −rx
yazıyor, film aracının `bb_mat` kuralından türetme ise +rx veriyor. Bu dört
modelin dinlenme pozunda x dönüşü yok. `buz_ordu.cevir_donus` x dönüşü
görürse duruyor: önce ölçülsün diye. Y ve z işaretlerinde iki kaynak aynı
sonucu veriyor; örümceğin bacak uçları film aracının zincirinden geçirilip
ölçüldü (zeminde, dışa ve doğru yöne).

JAR sürüm atlarsa: yeni JAR'ı indir, aynı sınıfları `javap -c -p` ile oku,
`buz_ordu.py`'deki `JAVA` tablosuyla karşılaştır, sonra
`node addon/test/buz_ordu.mjs` çalıştır.
