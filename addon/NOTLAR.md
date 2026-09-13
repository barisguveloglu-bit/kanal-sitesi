# v7.85.0 — Efsanenin Dünyası

Kullanıcı: *"bana ait bir özel tohum olacak … her yeri bedrock ama her yeri
hava … ben hani havayı yapmak istedim ama etraf oluyor yani gökyüzü olmuyor,
gökyüzünü de ayarla … bana özel bir dünya olacak. Bir efsanenin ona özel bir
dünyası olması gayet güzel bence."*

## Şikâyet doğruydu: gökyüzü ayrı bir mekanizma

`/fog` **yalnızca mesafe sisini** boyuyor. Gökyüzü kubbesi vanilla mavi
kalıyor — kullanıcının "bildiğin sis oluyor" dediği şey tam olarak bu.
Gökyüzü için kaynak paketinde `biomes/` altında **istemci biyomu** tanımı
gerekiyor (`minecraft:sky_color`). İkisi ayrı dosya, ayrı bileşen.

## Renk ölçüldü, seçilmedi

Sis rengi zaten skinden ölçülmüştü: **#20C5B5** (turkuaz, `kol_uret.py`).
Kullanıcı "gökyüzü biraz koyu olsun" dedi. "Biraz" ölçülebilir bir şey değil;
ölçülebilen şey **ufuk çizgisinin görünmesi**.

Aynı ton (174°), aynı doygunluk (%72), parlaklık %45 → **%22**:
**#106159**, sis ile kontrast **3.38:1**.

3:1 eşiği WCAG'in grafik nesneler için ayırt edilebilirlik sınırı. Altına
düşerse gökyüzü ile sis tek bir düz duvar gibi duruyor — yani şikâyetin
kendisi geri geliyor. Test hem alt (≥3:1) hem üst (≤6:1) sınırı tutuyor;
üst sınır siyaha kaçmasın diye.

## İki şey üretiliyor

**`Simsek_Efsane_Gokyuzu`** — gökyüzü + sis paketi, 87 biyom dosyası.
**AYRI paket, bilerek.** Ana pakete konsaydı modu kuran herkesin bütün
dünyası değişirdi; bu depoda oyuncunun dünyasını geri alınamaz biçimde
değiştiren şey alınmıyor (`REFERANS_BORALO_V5.md`, biyom ezmesi maddesi).
`.mcaddon`'a **girmiyor** — testin en önemli maddesi bunu dosyada denetliyor,
niyet beyanında değil.

**`Simsek_v7.85.0_Efsane_Dunyasi.mctemplate`** — açınca kurulu gelen dünya:
tek kat bedrock, üstü boş, üç paket de bağlı. Doğum noktası y=1 (zeminin
üstü); y=4 yazılsaydı her girişte üç blok düşerdi.

Tohum addan türetiliyor (`sha256("Efsanenin Dünyası · Şimşek TNT · #20C5B5")`),
yani yeniden üretilebilir. Düz dünyada tohum arazi üretmiyor — arazi
`FlatWorldLayers`'tan geliyor — ama kullanıcı "bana ait bir tohum" istedi ve
dünyanın kimliği orada duruyor.

## level.dat elle yazıldı

Bu depoda paket yöneticisi yok, o yüzden küçük bir NBT yazıcı/okuyucu yazıldı
(`arac/nbt.py`). Bedrock biçimi Java'dan üç yerde ayrılıyor: sayılar **küçük
sonlu**, dosyanın başında **8 baytlık başlık**, kök etiket **boş adlı**.

**Bu dosyayı oyunda deneyemedim.** Gösterebildiğim tek şey, yazdığımı geri
okuyup birebir aynı sözlüğü elde etmek — `dogrula()` bunu yapıyor ve üretim
ona bağlı: geçmezse dosya hiç yazılmıyor.

Tür denetimi ayrıca test ediliyor, çünkü bu biçimde en sinsi hata **yanlış
tür**: oyun alanı sessizce atlıyor, hiçbir şey söylemiyor. İlk yazılışta
`rainLevel` CIFT yazılmıştı (Bedrock KESIR bekliyor); zaten varsayılanı 0
olduğu için alan tamamen silindi.

## Test

`test/efsane_dunyasi.mjs`, 33 madde. Mutasyon bataryası 11 mutasyon —
**biri kaçtı ve gerçek bir hata buldu**: üretici klasörü temizlemiyordu,
`BIYOMLAR` listesinden çıkarılan biyomun eski dosyası diskte kalıyordu. Yani
liste ile klasör ayrışabiliyordu. Bu deponun daha önce defalarca düştüğü
tuzak (`kol_uret.py`'deki `beklenen` kümesi tam bunun için var). Düzeltildi,
11/11 yakalandı.

---

# v7.84.0 — Boralo V6: 201 eşya okundu, 2 yetenek alındı

İncelemenin tamamı [`REFERANS_BORALO_V6.md`](REFERANS_BORALO_V6.md).

201 eşyanın 121'inde komut var, o eşyaların çağırdığı **176 function'ın
tamamı** okundu. Çıkan mekanik listesinin **ikisi hariç hepsi bu modda zaten
vardı**. Alınan ikisi: **Kan Yağmuru** (bu depoda havaya dokunan tek satır
yoktu) ve **Göz Sensörü** (körlük başka yeteneklerin içindeydi ama tek işi
körlük olan bir şey yoktu; `SERSEM_KOR` bilerek `false`).

Kaynağın amacı korundu, altyapısı değil: süresiz `weather rain` → süreli;
`damage @e` → menzil + kendimiz hariç; `blindness 9999 255` → 60 tick;
`effect @s clear` → oyuncunun etkilerine dokunulmuyor.

Alınmayanlar: `op @a`, `clear @s`, `fatal_poison 9999 255`, `tp @a @s`,
`replaceitem slot.armor.head`, `entities/player.json`. Ayrıca 11 function
komut olarak geçersiz.

---

# v7.83.5 — Gözcü yanlış pozitif taraması + sürüm numaralandırması

v7.82'deki Warden yanlış alarmı bir sınıftı; altı tanesi bulundu: uzun mob
(gövde ekseni), ölçeksiz sıçrama eşiği, 1.21 öncesi katı blok listesi, zamanda
gezen geri itme ölçümü, rüzgâr yükü, vuruş hızı eşiği 8→14.

Sürüm numaralandırması değişti:

| hane | ne zaman artar |
|---|---|
| üçüncü | hata düzeltmesi, yanlış alarm, ayar |
| ortanca | yeni yetenek, yeni sistem, yeniden yapılandırma |
