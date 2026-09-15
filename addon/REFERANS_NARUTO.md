# Referans · NarutoMod 0.3.1-beta

**Kaynak:** `NarutoMod-1.12.2-0.3.1.beta.jar` · Minecraft **1.12.2** · Forge ·
MCreator ile üretilmiş · yazar **AHZNB**.

**Yöntem:** jar **hiç çalıştırılmadı**. Zip olarak açıldı, `.class` dosyaları
`javap -c -p` ile okundu.

> **LİSANS — önce bu.** Mod içinde **lisans dosyası yok**. Yani tüm hakları
> saklı sayılır. Doku, ses, model, yapı ve kodun hiçbiri kopyalanamaz.
> Bu belge ve yanındaki katalog **yalnızca envanter ve ölçümdür**; JAR da
> depoya **alınmadı** (29 MB ve alınmasına gerek yok).
>
> Fikirler ve sayılar başka: bir mekaniğin nasıl kurulduğunu okuyup **kendi
> uygulamamızı yazmak** serbest. Bu deponun `REFERANS_*` dosyalarının hepsi
> zaten böyle çalışıyor.

## Modun ölçüsü

| | Ham `.class` | Gerçek üst düzey |
|---|---|---|
| Toplam sınıf | 2253 | — |
| `entity/` | 932 | **149** |
| `item/` | 744 | **196** |
| `procedure/` | 212 | — |
| `gui/` | 169 | **52** |
| `potion/` | 23 | **10** |
| `block/` | 23 | **7** |
| `keybind/` | 15 | **5** |

Ham sayılarla gerçek sayı arasındaki fark **MCreator'dan**: her özellik iç
sınıflara bölünüyor. İlk bakışta 932 varlık görünüyor, gerçekte 149.

Varlıklar: 463 PNG · 130 OGG · 22 `.nbt` yapı · 501 JSON · 1 OBJ · 771 satır
dil dosyası.

Ayrıntılı içerik dökümü: **`REFERANS_NARUTO_KATALOG.md`** (30 karakter,
9 bijuu + Ten Tails + Gedo Mazo, 11 doujutsu eşyası, 22 çakra doğası,
49 silah, 40 zırh sınıfı, 52 jutsu parşömeni, 22 başarım).

## Asıl kazanç: `jar_model_coz.py` bu mod üzerinde büyüdü

Bu JAR **1.12.2**, yani `jar_model_coz.py`'nin yazıldığı sürümün ta kendisi.
Araç bu mod üzerinde denendi ve **üç yerden birden genişletildi** (v7.94.3).
Kazanç ölçüldü:

| | önce | sonra |
|---|---|---|
| Çözülebilen model sınıfı | **1** (adı koda gömülüydü) | 223'ün hepsi denendi |
| Kutulu geometri çıkan | 75 | **112** |
| Sert hata (model tümden kayıp) | 43 | **0** |

### 1. Sabit sınıf adı kaldırıldı

Betik kurucuyu `"Modelthatthingturkishmcl();"` diye **sabit bir adla**
arıyordu — yani pratikte tek bir sınıfı çözebiliyordu. Başka model
verildiğinde `bas` `None` kalıyor ve istisna atıyordu. Artık sınıf adı
bildirimden okunuyor, kurucu ondan türetiliyor, gövde bir sonraki metot
bildirimine kadar alınıyor. (Bitiş koşulu da sabitti: `setRotationAngles`
aranıyordu, bu modda metot **`setRotationAngle`** — tekil.)

### 2. Eksik yığın artık modeli yakmıyor

Ayrıştırıcı yalnız **sabit itmelerini** sayıyor. Bir `addBox` argümanı
hesaplanmışsa (`fneg`, `fmul`, `getstatic`…) yığına 10 değer birikmiyor ve
`unpack` istisna atıp **modelin tamamını** yakıyordu. 223 modelin 43'ü tam
bu yüzden hiç çıkmıyordu. Artık yalnız o kutu atlanıyor, kalan model
çıkıyor ve atlanan sayısı `ATLANAN KUTU: n` diye **yazılıyor** — eksik
model, hiç model olmamasından iyi; ama sessiz değil.

### 3. Bedrock `.geo.json` artık üretiliyor

Java → Bedrock çevirisi dosyanın başında **yazılıydı ama uygulanmıyordu**;
her model için elle yapılıyordu. Artık `--geo <kimlik>` ile doğrudan
geometri çıkıyor.

```sh
python3 addon/jar_model_coz.py mod.jar --liste
python3 addon/jar_model_coz.py mod.jar '<Sınıf>' --geo geometry.x > x.geo.json
```

**Kutu köşesi formülü:**

```
pivot_bedrock  = [ px,      24 - py,             pz      ]
origin_bedrock = [ px + jx, 24 - (py + jy + h),  pz + jz ]
```

Java'da +Y **aşağı**, Bedrock'ta +Y **yukarı**; kutunun alt köşesi bu yüzden
`py + jy + h` üzerinden hesaplanıyor.

**Formül tahmin edilmedi.** `kol_uret.py`'deki zırh geometrileri vanilla
biped ölçülerinden alınmıştı; çevrim üçünü de birebir yeniden üretiyor
(head · body · rightLeg). Bu üç çapa `test/model_cevrim.mjs` ile kilitlendi
ve mutasyonla denendi: `h` terimi silinince üçü de düşüyor.

Üretilen geometri ayrıca `arac/bicim_dogrula.py`'den (v7.94.2, GeckoLib'ten
çıkarılan kurallar) **temiz geçiyor** — yani biçim olarak geçerli.

### Bilinen sınır

Alt kemik pivotları ebeveyne göreli sayılıp zincir boyunca toplanıyor.
Dayanağı Java'nın çizim sırası (`ModelRenderer.render` önce kendi noktası
kadar öteliyor, sonra çocukları çiziyor) ve büyüklük kontrolü. **Bu adım
ölçülmüş depo verisine karşı doğrulanamadı** — kutu formülünün aksine.
Yeni bir model taşınırken oyunda gözle bakılsın.

223 sınıfın 111'inden kemik çıkıyor ama kutu çıkmıyor; bunlar kutularını
başka yoldan kuran modeller. Bu, hata değil kapsam dışı — raporlanıyor.

## Bedrock'a ne taşınabilir, ne taşınamaz

**Taşınabilir (fikir olarak, kendi uygulamamızla):** çakra benzeri bir kaynak
sayacı, bekleme süreli yetenekler, parşömenle yetenek açma, kademeli göz
gücü (Sharingan → Mangekyo → Rinnegan gibi bir ilerleme), kuyruklu canavar
tarzı "içindeki güç" mekaniği. Bu deponun `ayarlar.js` + `yetenekler/`
düzeni bunların hepsini zaten karşılıyor.

**Taşınamaz:** Java'ya özgü capability/NBT katmanı, Forge olay kancaları,
`.nbt` yapı dosyaları (Bedrock karşılığı `.mcstructure`), Java zırh katmanı
düzeni, özel boyut (Kamui) kurulumu. Bunlar yeniden yazılır, çevrilmez.

**Alınamaz:** dokular, sesler, modeller — lisans yok (yukarı bak).

## Taranmayan kısım

Bu taramada **jutsu mekaniklerinin sayıları** (hasar, bekleme, çakra
maliyeti) ve **çekirdek sistem tasarımı** (çakra nerede saklanıyor, seviye
nasıl artıyor) çıkarılamadı: o iki taramayı yürüten agent'lar oturum
sınırına takılıp yarıda kesildi. `procedure/` altındaki 212 sınıf ve
`EntityBijuManager` hâlâ okunmayı bekliyor.
