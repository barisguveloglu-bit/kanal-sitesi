# REFERANS · FerSReD Client (`ToolMcFSRD_1.19.51_64bit.apk`)

Kullanıcı gönderdi: *"aynı şekilde bir tane daha buldum, hiçbir
şeyi çalıştırmadan savunmaya eklenebilecek, engellenebilecek
şeyleri engelle."*

**Hiçbir şey çalıştırılmadı.** Zip açıldı, ikili dosyalar Python
ile *okundu* (`axml.py`, `dexstr.py`, `arsc.py` — üçü de
`REFERANS_TOOLBOX_TR_APK.md` incelemesinde yazıldı).

## Kimlik

| | |
|---|---|
| dosya | `ToolMcFSRD_1.19.51_64bit.apk` |
| boyut | 27.856.663 bayt |
| sha256 | `9536d9c28c6325e84c9ed67b213199ca17798ff89b21704160abdd139c5bd4bc` |
| paket | `io.mrarm.mctoolbox` — **Toolbox ile aynı** |
| görünen ad | **FerSReD Client** |
| `classes.dex` tarihi | 2022-12-29 |
| izinler | Toolbox For Turkey ile **birebir aynı** (`diff` boş) |

Aynı enjektör ailesi: `MinecraftActivity`, `libyurai.so` (Xbox/MSA
girişi), `targetPackage = com.mojang.minecraftpe`.

### Ek olarak: koruma katmanı

`libnpprotect.so` + `libnpvmp.so` — NetEase'in kod koruma/VMP
katmanı. Kaynak paketin kendisinde yok. Kaynak dosya adları da
karartılmış (`۟.xml`, `۠ۡ.xml`…). Yani bu, **yeniden paketlenmiş
bir sürüm**, geliştiricinin kendi yayını değil.

## "64bit" dosya adı hakkında — ölçüm

Kullanıcı: *"bu hilelerde genellikle 32 bit ve 64 bit ayrımı
oluyor, yüksek kaliteli olanlar 64 oluyor."*

Ölçüldü, **ikisi de doğru değil**:

**1. Bu dosya "64bit" adını taşıyor ama 32 biti de içeriyor.**

```
lib/arm64-v8a/     26 .so   (64 bit)
lib/armeabi-v7a/   27 .so   (32 bit)
```

Yani evrensel bir APK; ad yanıltıcı.

**2. 32/64 bit bir kalite kademesi değil, işlemci mimarisi.**

`armeabi-v7a` = 32 bit ARM, `arm64-v8a` = 64 bit ARM. Hangi
klasörün yükleneceğini **telefon** belirler, kullanıcı değil.
2019'dan beri satılan hemen her Android cihaz 64 bit. Bir
yamanın 64 bit olması onu "daha kaliteli" yapmaz; sadece
**o mimaride çalışır** demektir.

Gerçek fark şurada olabilir: 64 bit yama yazmak biraz daha
zahmetli olduğu için bazı yayınlar yalnız 32 bit çıkar ve
modern telefonlarda hiç açılmaz. "64 bit olanı iyi" izlenimi
muhtemelen buradan geliyor — *iyi* değil, *çalışıyor*.

Karşılaştırma: `Toolbox_For_Turkey.apk`'da da ikisi vardı.

### Sürüm kapsamı

Bu APK **26 farklı Minecraft sürümü** için yama taşıyor:
`1.16.221` → `1.19.51`. Öncekinde tek sürüm vardı (`1.19.51`).

En yenisi **1.19.51** (Aralık 2022). Kullanıcının oyunu **26.45**.
Yamalar sürüme özgü bellek adresleri olduğu için bu APK de
kullanıcının oyununu **başlatamaz**. Pratik tehdidi sıfır.

## Menü — tamamı Türkçe

İlk aramada hiçbir şey bulunamadı çünkü İngilizce anahtarlarla
arandı. Menü **tamamen Türkçeleştirilmiş** ve `resources.arsc`
içinde bitişik duruyor:

```
Anti Geri Tepme        Su Üzerinde Yürüme     Blok Tarama
Otomatik Zırh          Klip Yok               Hava Tarama
Otomatik Yay           Düşme Hasarı Yok       SandıkESP
Hitbox Genişlet        Yay Çekme Yavaşl. Yok  OyuncuESP
Mob/Oyuncu Çarpanı     Faz                    Yakınlaştırma
Aura Öldürme           Yavaş Düşme            Köprü Oluşturucu
Moblara/Oyunculara     Hız · Çarpan           Sandık Hırsızı
   Saldırı             Dokunarak Işınlanma    Erişim Düzeltme
Anahtarlayıcı          Elytra ile Uçma        Patlatma
Yuva Sayısı            Zırh Hud               Başarımları Zorlayıcı
Oyuncuya Işınlanma     Ruh Mod [Freecam]      Item Alma
Havada Zıplama         Full Parlaklık         Hızlı Kırma
Otomatik Süzülme       Can Göstergesi         Sahte İsim
Göz Kırpma             Mini Harita            NBT Düzenleyici
Uçma                   Oyuncuları Göster      Erişim
Yüksek Zıplama         Varlık Anahatları      Hızlı İnşa V1 / V2
Yükseklik              Metin Kesme            Komut Modu
                       Mob/Oyuncu Rengi       Spawn Xp
```

**46 madde** — Toolbox For Turkey'in (26) neredeyse iki katı.

## Ne yeni çıktı

33'ü zaten kapsam tablosundaydı. **13 yeni ad**, sınıflandırıldı:

| yeni madde | sınıf | gerekçe |
|---|---|---|
| `touch_teleport` (Dokunarak Işınlanma) | **kapalı** 7.30 | ışınlanma sıçraması |
| `reach_fix` (Erişim Düzeltme) | **kapalı** 7.30 | menzil zaten ölçülüyor |
| `auto_glide` (Otomatik Süzülme) | açık | `elytra_fly` ölçümüne giriyor |
| `no_bow_slowdown` | ayırt | insandan ayrılamıyor |
| `auto_pickup` (Item Alma) | ayırt | envanter otomasyonu |
| `achievement_forcer` | op | sunucu izni |
| `command_mode` (Komut Modu) | op | operatör yetkisi |
| `fake_name` (Sahte İsim) | imkânsız | ad Xbox hesabından gelir |
| `health_display`, `armor_hud`, `entity_outline`, `nametag_cut`, `mob_color` | imkânsız | görüntü ailesi |

### Ve üç maddesi "açık kalanlar" listemizdeydi

`Su Üzerinde Yürüme` (jesus), **`Düşme Hasarı Yok` (no_fall)**,
`Yavaş Düşme` (slow_falling) — üçü de v7.38'den beri *"ölçülebilir
ama yazılmadı"* diye duruyordu.

**`no_fall` bu sürümde yazıldı** (v7.47). Ayrıntısı `NOTLAR.md`'de.
Diğer ikisi hâlâ açık.

## Kapsam — bu kaynağa göre

```
FerSReD Client (ToolMcFSRD)
  toplam 46 · kapalı 18 · açık 4 · ayırt 6 · op 4 · imkânsız 14
  ham %39   engellenebilir %82
```

Genel tablo altı dosyayla birlikte **99 özellik**; engellenebilirin
**%70'i** kapalı.
