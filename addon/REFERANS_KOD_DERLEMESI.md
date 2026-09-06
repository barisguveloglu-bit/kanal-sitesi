# REFERANS · "300K KOD DOSYASI" derlemesi

Kullanıcı bir dosya buldu: `KOD 300K VE TOOLBOX 1000k özel(2).zip`,
**88 MB**. *"İçinde bir cevher yatıyor bizim için."*

Cevher vardı. Ama dosyanın kendisi 88 MB olmasına rağmen taşınan
bilgi **birkaç yüz kilobayt** çıktı.

## Hiçbir şey çalıştırılmadı

Zip açıldı, ikili dosyalar Python ile *okundu*. PE başlığı
ayrıştırıldı, sertifika zinciri okundu. Çalıştırma yok.

## Dosyalar adlarının söylediği şey değildi

| ad | gerçek tür |
|---|---|
| `r dosya 7z.txt` | **zip arşivi** — bütün koleksiyonu içeriyor |
| `827272828 … PİYASA KOD DOSYASU.txt` | `exzero(4).txt` ile **birebir aynı** (`5ea00b60…`) |
| `AREX_Kod!dosya.zip` | `100k_kod.zip` ile **birebir aynı** (`a85b6bbf…`) |
| `FFPsetup.exe` | **Internet Download Manager** kurulumu (aşağıda) |

Koleksiyon kendi içinde tekrar tekrar paketlenmiş. 88 MB'ın
sıkışmamasının sebebi bu: zaten sıkıştırılmış şeyler.

### Kopya oranı ölçüldü

```
çıkarılan metin dosyası      573
içerik olarak benzersiz      138   (%76'sı kopya)
benzersiz gövde           52.199 satır
```

Bir zip'in içinde `BlackXMarka.kod.dosyalar` **üç kez** var, üçü de
161.444 bayt. Başlıktaki "300K" muhtemelen kopyalarıyla sayılmış.

### Sonradan gelen partiler sıfır yeni içerik getirdi

Kullanıcı ikinci ve üçüncü parti dosya gönderdi. Ölçüm:

| parti | benzersiz dosya | *yalnız* o partide olan |
|---|---|---|
| 2 | 91 | **0** |
| 3 | 5 | **1** (ve o da 0 yeni animasyon getirdi) |

İlk gönderilen tek dosya (`r dosya 7z.txt`, 11,6 MB) zaten hepsini
taşıyordu.

## `FFPsetup.exe` — alarm verildi, sonra geri alındı

İlk bakışta "bir Minecraft kod paketinde Windows `.exe`" diye
uyarı verildi. Ölçüm bunu **çürüttü**:

```
bölümler: .text 55 KB · .data 8 KB · .rsrc 7 KB   (toplam ~70 KB)
dosya   : 9,2 MB   ->   ~9,1 MB overlay = kendi kendine açan kurulum
sertifika: CN = Tonec Inc. · OU = Internet Download Manager
           issuer = VeriSign Class 3 Code Signing 2010 CA
derleme  : 2015-07-03
```

İmzalı, ticari bir Windows programı. Yeri yanlış, tehlikeli değil.

**Sınır:** sertifika *zinciri* okundu, imza kriptografik olarak
doğrulanmadı.

Kalan her şey tarandı: `.bat`, `.sh`, `.vbs`, `.ps1`, `.jar`,
`.apk`, `.dex`, `.so` — hiçbiri yok. Bir `.doc` çıktı (WPS
belgesi), **makro yok**, içinde tek satır Türkçe not var.

## Savunma tarafı: boşluk yok

Başkasını hedefleyen bütün komutlar sayıldı:

| komut | corpus | karşılığı |
|---|---|---|
| `playanimation` | 3.469 | Arınma ✓ |
| `effect` `title` `fog` `playsound` `camerashake` `camera` | 590 | Arınma ✓ (v7.35) |
| `fill` · `setblock` | 3.879 | Kafes Kır ✓ (v7.36) |
| `tp` | 52 | Hareket denetimi ✓ |
| `gamemode` | 27 | Oyun kipi ✓ (v7.38) |
| `clear` | 12 | Envanter Yedeği ✓ |
| `kill` · `damage` | 38 | karşılığı yok, olamaz da |

**Bu derlemenin içinde savunamadığımız yeni bir saldırı yok.**

## Cevher: animasyon kimlikleri

Corpus'ta **747 benzersiz** animasyon kimliği. Mojang'ın örnek
paketindeki (`bedrock-samples`) **33 animasyon dosyası** indirildi,
**175 gerçek kimlik** okundu ve karşılaştırıldı.

> **98 tanesi gerçek vanilla animasyonu ve bizim depoda yoktu.**

Bunların 31'i v7.48'de poz sandığına eklendi. Seçim ölçütü:

- **Alındı:** görünür bir duruş üretenler (armor stand pozları,
  `base_pose.upside_down`, `move.arms.statue_of_liberty`, enderman,
  humanoid tutuşları, hayvan duruşları)
- **Alınmadı:** iç karışım katmanları (`move.arms`, `bob`,
  `attack.rotations` gibi). Onlar oyuncunun üzerinde zaten sürekli
  çalışıyor; poz olarak çağrılınca ya hiçbir şey yapmazlar ya da
  duran pozu bozarlar.

### Derleme kaynak değil, SÜZGEÇ oldu

Poz adları bu derlemeden *alınmadı* — derlemenin işaret ettiği
adlar **Mojang'ın kendi dosyasında aranıp bulundu**. Bulunamayan
hiçbiri eklenmedi.

## Yan kazanç: mevcut listedeki 3 bozuk kimlik

`ayarlar.js` şöyle diyordu:

> *"BU LISTE DOGRULANMADI, DOGRULANAMAZ DA — vanilla animasyon
> kimliklerinin listesi bu depoda YOK"*

O cümle artık doğru değil. Mevcut 39 poz da doğrulandı:

```
23 vanilla dosyalarında BULUNDU
 3 BULUNAMADI      -> düzeltildi
13 emote/persona   -> örnek pakette yayınlanmıyor, hâlâ doğrulanamaz
```

Bulunamayan üçü:

| yanlış | doğrusu | kanıt |
|---|---|---|
| `animation.ghast.scale` | `animation.ghast.move` | `ghast.animation.json`'da **tek** animasyon var, o da `move` |
| `animation.evoker_casting` | `animation.evoker.casting` | `evoker.animation.json` |
| `animation.evoker_casting.v1.0` | `animation.evoker.casting.v1.0` | `evoker.animation.json` |

**Eski yorum bunu tahmin etmişti** — *"alt çizgili biçim bu düzene
uymuyor"* — ama *"tahminle silmek yerine tablette denenmesi doğru"*
diye bırakmıştı. Tahmin doğruymuş, bırakmak da doğruymuş: şimdi
silinmedi, **düzeltildi**.

## Doğrulanamayan: parçacık listesi

Derlemede `BlueXMarka.tüm.partiküller.txt` var, **134 parçacık
adı**. Mojang parçacık indeksi yayınlamıyor (denenen yol 404).
İsimler gerçeğe benziyor ama **ölçülmedi**, o yüzden kullanılmadı.
