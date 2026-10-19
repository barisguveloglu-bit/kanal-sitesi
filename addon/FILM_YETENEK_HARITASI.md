# Film aracı — yetenek haritası

v7.99.15 · 2026-10-19 (Osmanlı Topuzu, balta seti ve dizli bacak eklendi; ilk hâli v7.99.14 · 2026-10-17). Kaynak: `arac/blender_film.py`, `film_poz.py`,
`kamera_denetim.py`, `zemin_denetim.py`, `form_model.py`, `thomas_goz.py`,
`film_ses.py`, `film_birlestir.py` ve `test/` altındaki film testleri.
Kod okunarak çıkarıldı; bu bir envanter, karar değil. Sayılar ya kod
sabiti ya da kayıtlı ölçüm.

## Hazır olan / hiç olmayan

**Hamle**
- Hazır:
  - **Hareket:** `git` (yürüme 4,3, koşma 5,6 blok/sn; `adim` ile elle hız), `bak` (540°/sn), `kacin` geri/sağ/sol (2,4 blok, 0,3 sn; kaçış sırasında vuruş geçmez), `isinlan` (iki mor flaş), `gizle`/`goster`.
  - **Saldırı:** `vur` türleri `oto` (kombo sırası; 2 sn ara verilince başa döner), `kosu`, `hava` (havaya kalkan vuruş) ya da vuruşun adı. Ayarları: `hiz`, `hamle` (atılma çarpanı), `itme`, `kan`, `dusur` (vuruşla yere düşürme). Temas anı ve hamle izi oyundaki WoM verisinden geliyor; menzil 3,5 blok.
  - **Savunma ve tepki:** `savun` (süreli) önden gelen vuruşun itmesini %35'e indirir, darbe tepkisi oynatmaz. Darbe tepkisi (0,4 sn) otomatik. İki aktörün merkezleri arasında en az 1,05 blok kalır.
- Dövüş setleri (17):
  - `antitheus` (Barış): `auto_1/2/4`, koşu vuruşu `agression`, hava vuruşu `guillotine`.
  - `yumruk` (El-Harkos).
  - 6 asa seti: `staff_auto_1–3`, `squall`, `kingkong`.
  - `topuz` (Ömer, v7.99.15): Epic Fight baltasından **türetilmiş** (`arac/wom_cevir.py` `TURETILMIS`): `axe_auto1/2`, koşu `axe_dash`, hava `axe_airslash`, bekleme duruşu Epic Fight'ın normal duruşu. Vuruşlar, süreler, hasar ve hamle baltayla aynı (hız demir balta, 0,9). Silah elde kaymıyor; çarpışma düzeltmesi önce kolda, kalanı bilekte, ikisi de izlemeli.
  - `balta` (v7.99.15): Epic Fight'ın tek elli baltası; eşyası yok, yalnız topuzun tabanı.
  - ruine, longsword, satsujin, evil_tachi, nova, herrscher, solar.
- Ortam: `yer_vurus` (yumruk yere iner, toprak sıçrar, önüne 0,5 blokluk bir blok kopar) → `parca_al` (iki elle; el ile blok arası ≤ 0,15 blok denetleniyor) → `parca_at` (balistik uçuş 0,15–1,5 sn, hedefin önünde kırılır).
- Yok:
  - büyü ya da mermi saldırısı, kalkan, bir aktörü tutup fırlatma, aynı anda birden çok kişiye vuruş;
  - yol bulma, engelden dolaşma, zıplama, tırmanma, uçma;
  - ağaç devirme, blok kırma, topraktan başka blok türü;
  - **Karanlık Tırpan ve Osmanlı Topuzu dışında çizilen silah modeli.** Ay Işığı Asası'nın modeli eklentide var ama filme bağlı değil; başka setle dövüşen aktör eli boş savurur.

**Poz** (`film_poz`, 14)
- Hazır:
  - **Film pozları:** `dus`, `kalk`, `sendele`, `diz_cok`, `yuzustu`, `bayil`, `govde_tut` (yaralı yürüyüş), `comel_dokun`, `etrafa_bak`, `kagit`, `yere_yumruk`, `blok_al`, `blok_at`, `tirpan_bekle`.
  - **Oyundan gelenler:** `savun`, üç yöne `kacin`, `darbe`, `konus`.
  - **Otomatik:** nefes ve yürüyüş.
  - Yere değen pozlar ölçülerek zemine oturtuluyor.
- Yok: yataktan doğrulma, oturma, kitap okuma, büyü yapma ya da el açma, kalkan duruşu, kapı tıklatma, selam.

**Efekt**
- Hazır:
  - kıvılcım (vuruşta sarı, savunmada mavi), mor ışınlanma flaşı, gücü ayarlanabilen toprak sıçraması, uçan ve kırılan blok, azaltılmış kan;
  - çukur (`zemin.cukur`): t anında açılır, ezik zemin ve saçılmış toprak bırakır, aktör çukura basar;
  - `efekt` olayıyla bu efektlerden biri istenen noktaya konabiliyor;
  - `zaman` aralığıyla ağır çekim (0,25) ve donma (≤ 0,04);
  - sarsıntı: savunulmamış vuruşun son temasında ve yer yumruğunda kendiliğinden, **sabit şiddette** (0,06 blok, 0,3 sn).
- Yok:
  - ateş, alev, duman, patlama ışığı;
  - yarı saydam kalkan kubbesi ve çarpma dalgası;
  - buz, kar, donma efekti;
  - şiddeti ayarlanabilen sarsıntı, görüntü titremesi;
  - kararma ve beyaz geçiş;
  - yumuşak hız rampası (`zaman` aralıkları basamak gibi değişiyor).
- **Kurulu ama bağlı değil (v7.99.15):** ateş, duman, patlama, yıldırım,
  kritik vuruş ve büyü parçacıkları (Pooka, Kenney), gerçekçi VDB patlamaları
  (`--vdb`), Quaternius dövüş animasyonları (yumruk, yuvarlanma, kalkan,
  fırlatma, yerden kalkış, büyü atma), MCprep yaratık rig'leri. Yukarıdaki
  "Yok" maddelerinin bir kısmı bunlarla kapanabilir; film aracı henüz hiçbirini
  okumuyor. Ölçüm (Cycles denemesi dahil): `REFERANS_HAZIR_PAKETLER.md`;
  2. bölümde hangisi nerede: `SERI_SEZON1.md` ("4 part kesimi").

**Kamera**
- Hazır:
  - 10 kalıp (`genis`, `yan`, `omuz`, `yakin`, `yakin_on`, `ust`, `dusuk`, `yorunge`, `takip`, POV için `goz`) ve `elle` (nokta, `kaydir`);
  - ayarlar: `gecis`, `lens`, `yatik`, `odak` (alan derinliği), `taraf`, `kam_dz`/`bak_dz`;
  - 180° kilidi ve yumuşak takip kendiliğinden.
- Yok:
  - çekim içinde zoom (lens çekim boyunca sabit);
  - sürekli el kamerası titremesi;
  - diz çöken, yatan ya da birbirine giren aktöre uyan kalıp. Kalıplar ayaktaki aktöre göre kurulu; bu anlar `elle` çekim istiyor.

**Karakter**
- Hazır:
  - skin ve isim;
  - `form`: 1,5 kat boy ve iki ek kol (`alt` ya da `omuz`);
  - Thomas gözleri: `kirmizi`/`mavi` kalıp, her göze ayrı ayar, `goz_kapak`, `goz_bakis`; planda `goz: "thomas"` ile açılır;
  - `silah`: `karanlik_tirpan` (Barış) ya da `osmanli_topuzu` (Ömer); `silah_gizli`/`silah_goster`, `durus`, sol elde kâğıt;
  - `diz: true` (v7.99.15): bacak uyluk + baldır, diz açısı Epic Fight'ın (`wom_cevir.py --diz`; dövüş setlerinin bütün duruş ve vuruşlarında). Yazılmazsa eski düz bacak; oyundaki model değişmez.
- Yok:
  - ağız ve yüz ifadesi;
  - zombi, iskelet, creeper, golem modeli (yalnız insan aktör var);
  - kâğıttan başka eşya (kitap, el lambası).

**Sahne**
- Hazır:
  - **orman:** çimen, açıklığın dışında ağaçlar, çukur, Nishita gökyüzü, güneş ve ay; `isik` anahtarlarıyla sabahtan geceye geçiş;
  - **oda:** deepslate oda, açılan kapı, bembeyaz dış, ışık hüzmesi, sis, toz, iki göz, kötünün karanlığı. Kötü yerinden oynayamaz.
- Yok:
  - bataklık kulübesi (kurucusu yazılmadı), savaş odası, hanedan ve surlar, Nether, zihin ortamı, karlı arazi;
  - hava durumu;
  - el lambası, meşale ve ateş ışığı.

**Yazı ve ses**
- Hazır:
  - **Yazı:** `soyle` (isim ve metin), `anlat`, `baslik` (ayrı siyah kart).
  - **Efekt sesleri** karelere oturuyor: adım, savurma, temas (yumruk, metal, tahta), kan, yer vuruşu, kırılma, fırlatma, düşüş, ışınlanma, kapı, kâğıt, donma vurgusu.
  - **Ortam sesi:** rüzgâr, cırcır böceği, oda uğultusu.
  - **Müzik:** tek parça ve susma aralıkları.
  - Seviye −14 LUFS; stem'ler ayrı veriliyor.
- Yok: ateş, buz, büyü ve kalkan sesleri; ikinci bir müzik parçası.

**Çizim ve denetim**
- Taslak seçenekleri:
  - `--onizleme` (yarım çözünürlük, 6 örnek);
  - `--adim N`, `--kare`, `--aralik`;
  - `motor: workbench` kodda var ama hiç ölçülmedi.
- Tam kalite: 1920×1080, 30 fps, 4096 örnek. Yarıda kalırsa kaldığı yerden sürer.
- Aynı senaryo her seferinde aynı hareketi verir: taslakta görülen dövüş tam kalitede bire bir aynı oynar (`blender_film.mjs`).
- Blender'sız denetim: `kamera_denetim` (9 kural), `zemin_denetim`, tek kare dönüş süzgeci.

## 1. bölümde ne kullanıldı

- **Dövüş:** 17 vuruş, 4 savunma, 3 kaçış.
- **Kamera:** 40 çekim: `elle` 12, `omuz` 8, `yan` 6, `genis` 5, `dusuk` 4, `yakin_on` 3, `goz` 1, `ust` 1.
- **Hiç kullanılmayanlar:** `yorunge`, `takip`, `yakin`, `gecis` (bütün geçişler sert kesme) ve `efekt` olayı.
- **Ağır çekim ve donma:** yalnız iki delen darbede (57,0 ve 63,7 sn).

## Geçmiş hatalar ve onları yakalayan katman

**Kamera denetimi** (kilit: `kamera_denetim.mjs`)
- İlk koşuda 399 sorunlu kare: aktörler birbirinin içinden geçiyordu, 180° kuralı a/b sırasıyla bozuluyordu, yakın planda yüz kadrajı taşıyordu.
- Hamle ve çarpışma çözümü aktörü bir karede ışınlıyordu (1,7 blok).
- Dövüş v2'de fırlatmadan sonra alçak açı Barış'ı kadraj dışına atıyordu; kaçışta geniş açı 0,8 blok sıçrıyordu.

**Önizleme karesi** (betik "0 sorun" derken bulunanlar)
- Ufuk düzlemi çukuru örtüyordu.
- Bir aktör ötekini kapatıyordu. ORTME/ONPLAN kuralları buradan çıktı.
- POV kamerası kafanın içindeydi: ~1 sn gri boşluk.
- Final sahnesi simsiyahtı; kâğıt görünmüyordu.
- Hamle, Barış'ı rakibin içinden geçiriyordu.
- Sönmeyen kıvılcımlar görüntüyü kaplıyordu.
- `adim` adlı bir değişken `--adim`'i ezip 7 karede bir çiziyordu.
- AgX renkleri soldurdu.
- Odada göz kafanın içinde kaldı, taç karanlıkta parladı.
- Thomas kafası 180° ters oturdu.
- Form rakibin içine giriyordu.
- Dövüş v2'de beş kadraj hatası ve çizimi ilk karede çökerten `KeyError`.

**Kullanıcının izlemesi**
- Tırpan tutuşu: sağ el 10–18 px kayıktı (kilit: `tutus.mjs`, `silah_govde.mjs`).
- Kâğıtla el arasında boşluk vardı.
- Dört göz çizilmişti, istenen iki gözdü.
- Tam kalitede elde beyaz tahta görünüyordu: kâğıdın ilk karesine anahtar yazılmamıştı (kilit: `blender_film.mjs`).
- Part 2'de dövüş dengesizdi (8 saldırıya 4).
- Part 2'de kötünün bedeni yoktu ve griydi (kilit: `kotu_karanlik.mjs`).
- Part 2'de aktörler havada yatıyor ve yürüyordu (kilit: `zemin.mjs`).
- Topuz önizlemesinde "ayaklar yerden kesiliyor" (2026-10-18): dizsiz bacak eğilince yere tek köşesiyle basıyordu (asanın `staff_auto_3`'ü: destek bacağı 25° eğik, tabanın öbür köşeleri 1–2 px havada). Dizli bacakla kapandı (kilit: `diz.mjs`). Asanın `kingkong`'unda beden inişten sonra 2,1 px havada kalıyor (aşağıda, açık).

**Tam kalite çıktının uzun denetimi**
- 849, 900 ve 945. karelerde tek kare 18° dönüş vardı; El-Harkos kopyalara dönmüyordu. Sebep takılan yürüyüş (kilit: `tek_kare_donus.mjs`).
- Açılış kıpırdamıyordu.
- Renk BT.601'le kodlanıyordu (kilit: `renk_kodlama.mjs`).
- Ses: −11,3 LUFS, −80 LUFS rüzgâr, sessiz anda +20 dB yükselme, iki kez AAC kodlama, sonda tık (kilit: `ses_seviye.mjs`, `ses_kenar.mjs`).
- Birleştirmede Part 2'nin son karesi düşüyordu (kilit: `ses_dilim.mjs`).

**Silah ölçümü** (çizimden önce, `topuz.mjs`)
- Demir asada el sap boyunca 5–26 px kayıyordu; 17 px'lik topuzda yumruk silahın dışına çıkardı. Asa beş vuruşun üçünde sapın arka ucuyla vuruyor, sol yumruk sapın 14–16 px gerisini tutuyordu (görünmeyen bir sap).
- Çarpışma düzeltmesi yalnız küplerin orta çizgisine bakıyordu, köşeleri 0,9 px kaçırıyordu (`silah_kose`).
- Uzun kılıçta topuz beş vuruşun beşinde bedene giriyordu (düzeltmesiz toplam 2,5 sn, havada vuruşta kafada 3,6 px, `auto1`'in bitişinde yumruk gövdede). Sıfırdan çözüm derin batmada takılıyordu: itmeler birbirini götürüyor (`auto1` t=0,7: tork 8°'de durdu, kaba arama 37°'de temiz). İzlemeyle temizlemek kolu 48°, bileği 50° çeviriyordu.
- On bir set topuzun modeliyle, düzeltmesiz ölçüldü (bedene 0,5 px'ten derin batma süresi, toplam): balta 0,95 sn, asa 1,3, herrscher 1,6, uzun kılıç 2,5, Epic Fight tek elli kılıç 2,5, nova 2,65, evil_tachi 3,35, solar 5,1, antitheus 5,4, ruine 6,15, satsujin 8,6. Balta dört vuruşun dördünde başı önde, sol el sapı hiç tutmuyor; Epic Fight Minecraft'ın topuzunu da balta sayıyor. Kullanıcı baltayı seçti (2026-10-19).
- Baltadan türetilmiş topuz: en derin batma 0,40 px (eşik 0,5); düzeltme kolda en çok 35° (yalnız `axe_auto2`'nin kalkışı: düzeltmesiz topuz kafanın içinden 2,5 px geçiyordu, 0,35 sn'de sıfıra iner), bilekte en çok 25,6°. Bekleme duruşu baltanınkiyle bire bir.

**Süre ölçümü**
- Tek tek anahtar kare yazmak sahne kurulumunu 12 dk yapıyordu; anahtarlar toplu yazılıyor.
- Ağaçlar küp küp nesneydi; tek örgüye birleştirildi.

**Bulut işçisi**
- Kompozitör GPU/EGL istedi, oda işçisi durdu; kompozitör CPU'ya alındı.
- İşçi eski kodla çizilmiş kareyi "var" saydı; kareye `.girdi` imzası eklendi (kilit: `cizim_dagit.mjs`).

**Dış iskeletle karşılaştırma**
- Bizim araç skinleri yatay aynalıyor. Hâlâ açık.

**Ders:**
- Betik temiz derken karede hata çıktı: v7.99.10'da beş, dövüş v2'de beş.
- Part 2'nin üç hatası tam kalite çizimden sonra bulundu ve yeniden çizim gerekti.
- Bu yüzden sıra: Blender'sız denetim → her çekimden önizleme karesi → taslak video → tam kalite.

## 2. bölümden önce açık

- **Takılan yürüyüş:** kök düzeltmesi yapılmadı (SERI_SEZON1, "bilinen hata"). Kalabalık sahneler bunu sık tetikler.
- **Skin aynası:** düzeltip düzeltmemek kullanıcının kararı. Düzeltilmezse Thomas planıyla bizim plan arasında yüz aynalanır.
- **Antitheus `auto_3`:** kullanılmıyor, çünkü sap 0,1–0,2 sn boyunca başın içinden geçiyor.
- **Zıplayan vuruşta iniş:** Barış'ın `guillotine`'inde beden inişten sonra 6,7 px, asaların `kingkong`'unda 2,1 px havada kalıyor; düzeltilmedi. Part 2 çizilirken `antitheus` setine dokunulmadı.
- **Film pozlarında diz yok:** dizli aktörde de `diz_cok`, `dus`, `yuzustu` gibi film pozlarında baldır düz kalır (diz kanalı yalnız dövüş setlerinin animasyonlarında).

## Maliyet ölçüsü

- **Tam kalite:** 1. bölüm Part 2, 2210 kare (orman 1579 + oda 631; 73,7 sn) ve yaklaşık 500 makine-saati sürdü. Ortalama ~13,6 dk/kare, yani **film saniyesi başına ~6,8 makine-saati**. Tek bir kare 6–25 dk arası sürüyor.
- **Ağır çekim ve donma:** bu kareler de tek tek çiziliyor; film süresi, hikâye süresinin hıza bölümü kadar uzuyor. 1. bölümdeki 0,12 sn'lik donma (hız 0,03) 4 sn film tuttu, yaklaşık 27 makine-saati.
- **Taslak:** tek ölçüm `--onizleme` için var: 640×360, 6 örnek, kare başına ≈ 2,4 sn (4 çekirdek, v7.99.9). Bu hızla 74 sn yaklaşık 1,5 makine-saati. 960×540'ta, sisli ya da efektli sahnede ölçülmedi.

## Test koşusu (2026-10-19, v7.99.15)

- **Tam takım** (`kos.sh`'in aynısı, `cizim_dagit.mjs` hariç): 164 testin 163'ü geçti, 32 dk. Düşen `efsane_dunyasi.mjs` (gökyüzü paketinin sürümü 7.94.0, ana paket 7.99.8): HEAD'de de düşüyor, bu işle ilgisi yok.
- **Yeni testler:** `topuz.mjs` (eşya, baltadan türetilmiş set, tutuş, çarpışma, mutasyon) ve `diz.mjs` (geometri, Epic Fight'ın diz açısı, film aracı, mutasyon).
- **Blender'da ölçülen:** dizli aktör film aracında çiziliyor (Ömer topuzla, iki balta vuruşu); `diz` yazılmayan senaryoda HEAD'in film aracıyla bugünkü aynı kareyi **piksel piksel aynı** çiziyor (1. bölüm etkilenmiyor).

### Önceki koşu (2026-10-17)

- **Çalıştırılan:** Blender gerektirmeyen 16 film testi; 122 madde geçti, 0 düştü. Testler: `blender_film`, `kamera_denetim`, `zemin`, `tek_kare_donus`, `kotu_karanlik`, `form_model`, `goz_thomas`, `baslik_karti`, `renk_kodlama`, `ses_dilim`, `ses_kenar`, `ses_seviye`, `tutus`, `silah_govde` (tek başına ~20 dk), `onizleme`, `arac_kur`.
- **Bilerek çalıştırılmayan:** `cizim_dagit.mjs` (çizim işçilerini taklit ediyor) ve `wom_kilic.mjs` (oyun içi eklenti testi). Blender bu makinede kurulu değildi.
- **Yan etki:** testler depoya hiçbir şey yazmadı; çalışma ağacı temiz kaldı.
