# REFERANS · Toolbox For Turkey (`io.mrarm.mctoolbox`)

Kullanıcı gönderdi: *"aynı şekilde bir tane daha buldum, hiçbir
şeyi çalıştırmadan savunmaya eklenebilecek, engellenebilecek
şeyleri engelle."*

**Hiçbir şey çalıştırılmadı.** Yalnız zip açıldı, ikili dosyalar
Python ile *okundu* (`AndroidManifest.xml` string havuzu,
`classes.dex` string tablosu, `resources.arsc` string havuzu,
`.so` içindeki düz metinler).

## Kimlik

| | |
|---|---|
| dosya | `Toolbox_For_Turkey.apk` |
| boyut | 6.890.681 bayt |
| sha256 | `9756610cc81bc87fdc05bc1b8e4c329bd0e646bf57c1d06a6c9c6855daa6622e` |
| paket | `io.mrarm.mctoolbox` |
| imza tarihi | 2024-01-17 |
| yerli kütüphane | `libtoolbox-1.19.51.01.so`, `libyurai.so` |
| izinler | INTERNET, ACCESS_NETWORK_STATE, READ/WRITE_EXTERNAL_STORAGE, VIBRATE, WAKE_LOCK |

## Bu öncekilerden FARKLI bir sınıf

Elimizdeki dört dosya iki sınıftaydı:

- **İstemci** (MH_TEAM_V5 · WDBAX · BloodyClient) — Minecraft'ın
  *yerine* geçen, MuCute tabanlı üçüzler. Üçünün özellik listesi
  bire bir aynıydı (`diff` boş, 65 satır).
- **Vekil** (WClient) — paketleri araya girip değiştiren.

Bu **üçüncü sınıf: enjektör.** `MinecraftActivity` ile gerçek
Minecraft'ı **kendi süreci içinde** başlatıp yamalıyor.
`com.mojang.minecraftpe` manifestte `targetPackage` olarak
geçiyor.

Kaynağı da kurumsal: Xbox/MSA giriş akışı (`libyurai.so`,
`XalLoginActivity`, `XboxLoginActivity`), Google Play faturalama,
AdColony/AdMob reklamları, "Premium" aboneliği. Yani bu bir
yeraltı istemcisi değil, mağaza uygulaması biçiminde bir araç.

### Ama hedef sürümü ÇOK ESKİ

`libtoolbox-**1.19.51**.01.so` — Minecraft **1.19.51** için
derlenmiş yamalar. Kullanıcının oyunu **26.45**. Enjektörün
yamaları sürüme özgü bellek uzantıları olduğu için bu APK
kullanıcının oyununu **başlatamaz bile**. Bugünkü pratik
tehdidi sıfıra yakın.

Bu satır bir uyarı: *bu dosya bugün çalışmıyor diye ondan
öğrenilecek bir şey yok demek değil.* Menüsü bir kör noktamızı
açığa çıkardı (aşağıda).

## Menü — `resources.arsc` içinden okundu

Etiketler bitişik duruyor, yani bu gerçekten tek bir menünün
kendisi:

```
Anti-Knockback / Anti-Geritepme    Fullbright
Auto-Armor                         Minimap (Radius)
Auto-Bow                           X-Ray
Kill-Aura (Interval,               ChestESP
   Switcher, Slot Count)           PlayerESP
Air Jump                           Zoom
Auto-Sprint                        Nuke
Blink                              Haste
No-clip                            NBT Editor
Phase                              Reach
Elytra Fly                         Spawn Experience Orb
FreeCam                            Enchanter
```

Ayrıca `Server Mode` düğmesi var — uygulama özelliklerin bir
kısmının sunucuya göründüğünü kendisi biliyor.

Türkçe yerelleştirme gerçek: `Anti-Geritepme`, `Mob rengi`,
`Mob/Blok`.

### Görüntü ailesinin kanıtı APK'nın içinde

`assets/tb-1/` altında:
- `resource_packs/vanilla/materials/wireframe.material`
- `resource_packs/vanilla/materials/barrier.material`
- `shaders/glsl/outline.fragment`

X-Ray ve ESP'nin nasıl çizildiği bunlar. **Hiçbiri sunucuya bir
şey göndermiyor** — bu ailenin neden kalıcı olarak görünmez
olduğunun somut kanıtı.

## Yeni ne çıktı

26 menü maddesinin 23'ü zaten kapsam tablomuzda vardı. Üç ad
yeniydi ve ikisi zaten başka anahtarla listedeydi (`freecam`,
`spawn_exp`). Geriye **bir tane** kaldı:

### Elytra Fly — ve asıl bulgu

Menüde `Elytra Fly` var, bizde karşılığı yoktu. Ama asıl sorun o
değil. Kodu kontrol ettim:

```js
export function hareketMuaf(oyuncu, isVarMi) {
  ...
  if (oyuncu.isGliding) return "suzuluyor";
```

ve çağıran taraf:

```js
if (muaf) { iz.yukselme = 0; iz.kati = 0; continue; }
```

Yani **süzülme TOPTAN muafiyetti.** Elytra takıp süzülme
durumunda kalan biri hız, sıçrama, yükselme ve katı blok
denetimlerinin **hepsini birden** kapatıyordu — Elytra Fly
kullanmasa bile. Bir düelloda karşındakinin tek yapması gereken
sırtına elytra takmakmış.

**Muafiyetin kendisi doğruydu, kapsamı yanlıştı.** Gerçek süzülme
roketle 30+ blok/sn yapıyor; hız denetimi olduğu gibi çalışsaydı
her süzülen oyuncu hileci sayılırdı.

Ölçülebilen tek şey **roketsiz yükselme**: gerçek elytra kendi
başına yükselemez. Dalıştan çıkarken hızını yüksekliğe çevirip
kısa süre tırmanabilir, ama *sürdüremez*; sürdürmek için havai
fişek gerekir. Elytra Fly hilesi tam bunu yapıyor.

Ölçüt: süzülürken, havai fişek atmadan, üst üste `SUZULME_ORNEK`
(5) örnek boyunca `SUZULME_PAY` (0,4) kadar yükselmek. 5 örnek ×
10 tick = **2,5 saniye kesintisiz tırmanış**.

Havai fişek `itemUse` ile yakalanıyor ve 100 tick'lik (5 sn) bir
pencere açıyor; o pencerede tırmanış suçlanmıyor. Pencere
**harcanmıyor** (ışınlanma affının aksine) çünkü roketin itişi
bir örnekten uzun sürer.

Süzülmenin öteki ölçümleri **hâlâ muaf**. Onlar için doğru eşik
yok ve ölçülmedi.

## Kapsam — bu kaynağa göre

```
Toolbox For Turkey (enjektör)
  toplam 26 · kapalı 10 · açık 1 · ayırt 4 · op 3 · imkânsız 8
  ham %38   engellenebilir %91
```

Açık kalan tek madde `blink` (paket geciktirme) — üç kaynakta da
açık, ölçümü paket kuyruğu gerektiriyor.

`op` üçlüsü (`enchant`, `nbt_editor`, `spawn_exp`) enjektörün
kendi özelliği değil, **operatör yetkisi** istiyor: sunucuda op
vermemek yeterli.

`imkânsız` sekizlisi görüntü ailesi — yukarıdaki shader
dosyaları bunun kanıtı.

## Ölçüm nasıl yapıldı

```
unzip -l                                  → 1568 dosya, tek classes.dex
axml.py  AndroidManifest.xml              → paket adı, izinler
dexstr.py classes.dex                     → 28.910 dize
arsc.py  resources.arsc                   → 5.707 dize (menü buradan)
strings  libtoolbox-*.so / libyurai.so    → yerli kütüphaneler
```

Üç ayrıştırıcı da bu inceleme için yazıldı ve **yalnız okuyor**.
