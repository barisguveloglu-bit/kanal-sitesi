# v7.84.0 — Boralo V6: 201 eşya okundu, 2 yetenek alındı

Kullanıcı `.mcaddon.zip` gönderdi: *"bundan her şeyi ekle her şeyi kötü bir
altyapısı varsa iyi bir altyapıyı değiştirerek amacını değiştirmeden ekle."*

İncelemenin tamamı [`REFERANS_BORALO_V6.md`](REFERANS_BORALO_V6.md).
Paket **çalıştırılmadı** — zip açıldı, JSON ve `.mcfunction` okundu.

## Dürüst sonuç: alınacak şey azdı

201 eşyanın 121'inde komut var, o eşyaların çağırdığı **176 function'ın
tamamı** okundu. Ortaya çıkan mekanik listesinin **ikisi hariç hepsi bu modda
zaten vardı** — Taser yerine üç aşamalı sersem→mezar zinciri, Time Clock
yerine `zaman_saati`, Traction yerine `cekim_silahi`, Kevin Sword'ün beş
özelliği yerine `kafes`/`isinlanma`/`yildirim`/`ucurma`/`ucus`…

"Her şeyi ekle" isteğine karşı cevap bu: çoğu zaten eklenmişti (V2, V4 ve V5
incelemelerinde).

## Alınan iki şey, ikisi de gerçek boşluktu

**Kan Yağmuru.** Bu depoda havaya dokunan **tek bir satır yoktu**.
`weather rain` + çevreye hasar.

**Göz Sensörü.** Körlük birkaç yeteneğin *içinde* vardı ama tek işi körlük
olan bir şey yoktu. Üstelik `SERSEM_KOR` bilerek `false` — sersemletilen
görsün diye. Yani kasıtla boş bırakılmış bir yer vardı, dolduran yoktu.

## Değiştirilen altyapı

Kaynağın **amacı** korundu, **altyapısı** değil:

| kaynakta | bizde |
|---|---|
| `weather rain` (süresiz, dünya kalıcı yağmurda kalıyor) | `weather rain 60` — çıkış yolu vanilla'nın kendisinde |
| `damage @e 1` (dünyadaki her şey, oyuncunun kendisi dahil) | menzil + kendimiz hariç + botlar hariç |
| `blindness 9999 255` (sonsuz körlük) | 60 tick; 255 seviyesi zaten anlamsız, körlüğün seviyesi yok |
| `effect @s clear` (kullanıcının kendi etkilerini siliyor) | oyuncunun etkilerine dokunulmuyor |
| `playsound @a` (dünyadaki herkes duyuyor) | olay yerinde çalıyor |
| `r=10` yarıçap (arkandaki de kör oluyor) | koni |

## Alınmayanlar

`op @a` (tek satır, geri alınamaz, herkesi operatör yapıyor) ·
`clear @s` (dört ayrı function, "kolu kapat" demek için bütün envanteri
siliyor) · `fatal_poison 9999 255` · `tp @a @s` (menzilsiz çekme) ·
`replaceitem ... slot.armor.head` (taktığın miğferi yok ediyor) ·
`entities/player.json` (183 bileşen grubuyla vanilla oyuncuyu eziyor).

Ayrıca **11 function çalışmıyor**: `setblock ~~~fire` (boşluk yok),
`execute positioned^^^10` (bitişik), `particle` iki satıra bölünmüş,
`give @s bobby_kol_sagtik` (`pa:` öneki unutulmuş), `pa:Stone_Man_Stone`
(büyük harf). 10 blok boş, `entity.material` bir araba modundan kopya.

Karakter kadrosu ve NPC dialogue alınmadı — gerekçe V5'te yazılmıştı ve hâlâ
geçerli.

## Test

`test/boralo_v6.mjs`, 22 madde. Her maddenin karşılığı kaynaktaki bir kusur.
Mutasyon bataryası **8/8**: sekiz düzeltmenin her biri tek tek geri alındı,
sekizinde de test düştü.

---

# v7.83.5 — Gözcü yanlış pozitif taraması + sürüm numaralandırması

v7.82'deki Warden yanlış alarmı tek bir kaza değil bir sınıftı. Aynı sınıf
bütün Gözcü ölçümlerinde arandı, **altı tanesi** çıktı:

1. **Uzun mob.** `location` ayak noktası. Warden 2,9 blok: yanından gövdesine
   bakınca bakış yönü ile "gözden ayağa" vektörü arasındaki açı 100 dereceyi
   buluyordu, eşik ~75 — yani "bakmadan vuruş". Artık ayak–baş doğru
   parçasının göze en yakın noktası ölçülüyor.
2. **Ölçeksiz sıçrama eşiği.** Hız geçen tick'e bölünüyordu, sıçrama
   bölünmüyordu. Tarama gecikince koşan oyuncu ışınlanma sayılabiliyordu.
3. **Katı blok listesi 1.21 öncesi haldeydi.** `tallgrass` ve `double_plant`
   bölündü; iki isim hiçbir şeyle eşleşmiyordu. Uzun otun içinde durmak iki
   saniyede damga yiyordu. Nether geçidi, şeker kamışı, mağara sarmaşıkları
   da eksikti. Yedek olarak API'nin `isSolid` cevabı soruluyor.
4. **Geri itme ölçümü zamanda geziyordu** (6–15 tick). Geç ölçüldüğünde
   saldırganın üzerine geri koşan oyuncu "geri itilmedi" damgası yiyordu.
5. **Rüzgâr yükü** hasar vermeden savuruyor, v7.82'nin vurulma affı
   kapsamıyordu.
6. **Vuruş hızı eşiği 8 → 14.** Eski gerekçe Java Edition'ı anlatıyordu;
   Bedrock'ta saldırı bekleme süresi yok.

Kendi Efsane TNT yağmurumuz da bakıldı: güvenli yarıçap 16 blok, patlama gücü
4 (yarıçap ~7). Geri itme oyuncuya hiç ulaşmıyor — değişiklik gerekmedi.

## Sürüm numaralandırması değişti

Üçüncü hane uzun süredir hep 0 yazılıyor, her değişiklik ortanca haneyi
artırıyordu — küçük bir yanlış alarm düzeltmesi de yeni bir yetenek de aynı
büyüklükte görünüyordu.

| hane | ne zaman artar |
|---|---|
| üçüncü | hata düzeltmesi, yanlış alarm, ayar |
| ortanca | yeni yetenek, yeni sistem, yeniden yapılandırma |

v7.83 **"yeniden yapılandırılmış sürüm"** olarak işaretlendi; üçüncü hanenin
0 yerine 5'ten başlaması bunun işareti. Kural `SURUM_NO`'nun hemen üstünde.
