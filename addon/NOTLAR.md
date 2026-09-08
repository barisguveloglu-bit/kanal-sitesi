# v7.66.0 — Baştan sona tarama + erişilemeyen 16 yetenek

Kullanıcı: *"yeni sürümü göndermeden önce bir açık varsa veya bir ölü
kod varsa temizle, tüm sistemi baştan sona tara, bu konuda ciddiyim."*

105 dosya, 40.802 satır tarandı. Aşağıdakiler **ölçüm**, tahmin değil.

## Taramanın bulmadıkları (yani temiz çıkan yerler)

| aranan | sonuç |
|---|---|
| ölü ayar sabiti | 6 tane — **hepsi zaten belgeli ve bilinçli** (`LAZER_HIZ_*`, `LAZER_KALKAN_*`, `LAZER_SERSEM_SURE`, `LAZER_SAVUR_GUC`). `tarama.mjs` bunları v7.51'den beri sayıyor; bağımsız tarayıcı aynı 6'yı buldu — mevcut koruma dürüst. |
| ölü limit (`_TAVAN`/`_SINIR`) | **yok.** 12 tanesi ilk taramada "karşılaştırılmıyor" göründü, hepsi yanlış alarm: ortak hedef bulucuya `tavan:` olarak geçiyorlar. |
| hiç import edilmeyen dosya | **yok.** 40 dosya öyle göründü; `main.js` onları 62 yan etki importuyla (`import "./x.js"`) yüklüyor. |
| çağrılmayan fonksiyon | **yok.** 4 aday da değer olarak geçiliyor (`filter(moblaraIsler)`, `kaydet(..., simsekIsleri)`, `ilkelKancasi(bakim)`). |
| ad çakışması | 4 aynı ad var (`savunmadaMi`, `kolTakili`, `tavanDoldu`, `defteriUnut`) ama **hiçbiri birlikte import edilmiyor**; her biri kendi dosyasında kalıyor. Aktif hata yok. |
| gereksiz `export` | 43 tane (kendi dosyasında kullanılıyor, dışarı açılması gereksiz). Kozmetik; 43 dosyayı çalkalamamak için dokunulmadı. |

## Bulunan gerçek kusur: 16 yetenek pratikte erişilemez

Jest döngüsü **216 yeteneğe** ulaşmış. Sıra numaraları artan olduğu için
yeni eklenen her şey listenin **sonuna** giriyor. Ölçüm:

    201/216  jjk_yar        209/216  yami_kurouzu
    202/216  jjk_mabet      210/216  yami_delik
    203/216  jjk_fuga       211/216  yami_madde
    204/216  jjk_kollar     212/216  ope_oda
    205/216  simbiyot       213/216  ope_shambles
    206/216  gura_gekishin  214/216  ope_gamma
    207/216  gura_tenchi    215/216  meyve_sec
    208/216  gura_kabuto    216/216  ope_sok

`ope_sok`'a çömel+yukarı bak jestiyle ulaşmak için **216 kez** döngü
çevirmek gerekiyordu. Yani JJK, Simbiyot ve Şeytan Meyveleri yazıldı,
sınandı ve **kullanılamıyordu**.

Sohbette `jjk` ve `meyve` komutları vardı ama onlar karakter/meyve
*değiştiriyor*, yeteneği çalıştırmıyor. `kancalar.yetenek` genel bir
çalıştırıcıydı ama sohbet onu yalnız **8 sabit kimlikle** çağırıyordu.

## Yama: `yetenek <ad>`

```
yetenek                → 216 yetenek var, nasıl aranır
yetenek gura_tenchi    → çalıştırır
yetenek gura           → 3 eşleşme, listeler (SEÇMEZ)
yetenek boyleseyyok    → bulamadım
```

**Yeni bir güç değil, var olan gücün kapısı.** Aynı kapıdan geçiyor:
`yetenekTetikle` içindeki `AYNI_ANDA`, `BEKLEME`, `yetenekYetkisi` ve
`anlikHazirMi` denetimlerinin hepsi işliyor. Sohbetten çalıştırmak
jestten daha serbest **değil**.

Arama `main.js`'te yapılıyor, `sohbet.js`'te değil: kayıt defterine
erişim orada ve iki katman ayrı kalsın diye. İki kanca (`yetenek`,
`yetenekAra`) **tek gövdeyi** paylaşıyor — `yetenegiCalistir`.

**Belirsizken seçmiyor, listeliyor.** Yanlış yeteneği çalıştırmak
bekleme süresini boşa harcatır ve kullanıcı nedenini anlamaz.

### Tam kimlik kısayolu ölçümle doğrulandı

`yetenekAra` önce tam kimlik eşleşmesine bakıyor. Bu şart mı diye
ölçtüm: 216 kimlikten **tam biri** başkasının öneki —
`ben_sald_gulle_motion_damage`, `..._dash`'in öneki. Kısayol olmasa o
kimliği tam yazan biri "2 eşleşme" cevabı alır ve yetenek çalışmazdı.
Tek örnek ama gerçek, ve teste yazıldı.

## Test

`yetenek_ara.mjs` — 18 madde. En önemlisi **kapının aynı kapı olduğu**,
ve o madde *tersten de* tutuluyor: etiketli oyuncu geçebiliyor,
etiketsiz geçemiyor. İlk yazılışta yalnız etiketsiz tek oyuncuyla
sınanmıştı; `yetkiliMi`'nin "kimse etiketli değilse kapı açık" kuralı
yüzünden o test **hiçbir şey sınamıyordu** ve yeşil yanacaktı.

**9 mutasyon denendi, 8'i yakalandı.** Kaçan mutasyon ve neden kaçtığı
test dosyasının sonuna yazıldı: ortak gövdeyi ikiye ayıran bir refactor
bütün güvenlik davranışını koruyor, yalnız reddetme mesajını
kaybediyor; onu görmek için `AYNI_ANDA` tavanını gerçekten doldurmak
gerekiyor ve sahte dünyada yetenekler kol/ruh/oda şartı yüzünden erken
çıkıp iş oluşturmuyor. "9/9" demek yanlış olurdu.

Ayar sabitinin kendisi de sınanıyor (`YETENEK_ARA_LISTE <= 12`) —
beklentiyi sınanan şeyden türetirsen ayarı 999 yapan mutasyon kaçar;
`dusmus.mjs`'te öğrenilen ders.
