# WoM + Epic Fight: duruş ve vuruşlar nasıl görünüyor (ölçüm)

v7.98.2. Kendi vuruş animasyonlarımızı yazmadan önce orijinalin **ne
yaptığını** anlamak için. Ekran görüntüsünden değil, oyunun kendi
verisinden okundu: Weapons of Miracles 2.0.178 ve Epic Fight 21.17.3.1
JAR'ları, Java 1.21.1 istemcisinin yüklediği dosyaların aynısı.
Dosyaların hiçbiri depoya alınmadı; burada yalnız sayılar var.

## Nereden okundu

| ne | kaynak |
|---|---|
| hangi silah hangi seti kullanıyor | `data/wom/capabilities/weapons/*.json` → `type` |
| setin duruşu, yürüyüşü, kombosu | `WOMWeaponCapabilityPresets` bytecode'u (`livingMotionModifier`, `newStyleCombo`); Epic Fight setleri için `EpicFightMovesets` |
| animasyon adından dosyaya | `Anims*` ve `Animations` sınıflarındaki yol dizgeleri (826 kayıt) |
| bıçağın eklemdeki yönü | `WOMWeaponColliders` vuruş kutularının merkezi (`Tool_R` yerel uzayında) |
| poz | animasyon JSON'ları + `biped.json` iskeleti, ileri kinematik |

Kombo sırası Epic Fight kuralı: `oto…, koşu vuruşu, hava vuruşu, binek`.
`newStyleCombo`'nun son üç öğesi bunlar.

### Okurken bulunan iki tuzak

1. **`Coord` eklemi.** Epic Fight'ın kendi dosyalarının bir kısmında
   (uzun kılıç, tachi) `Root`'un üstünde iskelette olmayan bir `Coord`
   var; dikliği ve hareketi o taşıyor. Hesaba katılmazsa beden 90°
   yatık çıkıyor. WoM'un 376 dosyasından yalnız 1'inde var.
2. **Kök hareketi modelde görünmüyor, oyuncuyu taşıyor.**
   `ActionAnimation.correctRootJoint` çizimden önce `Root`'un yatay
   kaymasını siliyor (dikeyi yalnız `MOVE_VERTICAL` varsa kalıyor). O
   mesafe oyuncuya hareket olarak veriliyor. Aşağıdaki "ilerleme"
   sütunu bu yüzden **oyuncunun gerçekten gittiği yol**.

## Genel tablo

**Duruş (silah eldeyken bekleme):**

- **İki elli silahların çoğu yan duruyor.** Göğüs hedefe göre 55–81°
  sağa dönük (asa, Torment, Ruine, Moonless, Satsujin, Orbit,
  Blackstar, balyoz balta). Kafa göğüsten az dönük, yani bakış hedefte.
  Önde duran ayak neredeyse hep **sol**: eskrim duruşu.
- **Önden duranlar:** Agony, Antitheus, Herrscher, Napoleon, Ender
  Tabancası, Solar, Nova, Evil Tachi (göğüs 0–31°).
- **Gövde dik.** Öne eğim ±6° içinde. İstisnalar: Solar +18° (alçak,
  ağır duruş: dizler 44°/50°, ayak arası 13.6 px, kalça 10.3 px),
  asa +11°, Napoleon +10°.
- **Dizler hafif bükük** (10–57°). En alçak duruş Orbit (57°, kalça
  10.9 px) ve balyoz balta (44°, kalça 11.0 px).
- **İki el birlikte** yalnız üç sette: Ruine (kılıç yüz önünde dik),
  Blackstar ve balyoz balta (omuzda, uç arkaya-yukarı). Diğerlerinde
  eller 11–17 px ayrı: silah bir elde, öteki serbest.
- **Bekleme hareketi küçük.** Göğüs salınımı çoğunda 0–5°. Antitheus
  11°, Napoleon 6.5°.

**Vuruşlar** (98 animasyon, 17 WoM seti + 2 Epic Fight seti):

| ölçü | WoM | Epic Fight (balta, uzun kılıç) |
|---|---|---|
| dosya süresi | 0.5–5.5 s, ortanca 2.4 s | 0.7–1.7 s, ortanca 1.35 s |
| en hızlı an (vuruş) | sürenin ortanca %19'u | %20 |
| oyuncunun ilerlemesi | ortanca 38 px (2.4 blok), en çok 253 px | ortanca 16 px, en çok 33 px |
| en yüksek sıçrama | ortanca 3.6 px, en çok 47.6 px (3 blok) | en çok 3.2 px |
| tüm beden dönüşü | ortanca 198°; 48 vuruşta ≥ 180° | ortanca 46° |
| takla (gövde baş aşağı) | 19 vuruş | 0 |
| kaybolma (ışınlanma karesi) | 2 (Moonless) | 0 |
| gövdenin en çok öne eğilmesi | ortanca 60°; 45 vuruşta ≥ 60° | ≤ 47° |

Yani:

- **Vuruş erken, toparlanma uzun.** Bıçak sürenin ilk beşte birinde en
  hızlı; kalanı savuruşun devamı ve duruşa dönüş.
- **WoM hareketli.** Epic Fight'ın kendi silahları yerinde vuruyor;
  WoM vuruşlarının yarısı oyuncuyu 2 bloktan fazla taşıyor, yarısı
  bedeni tam tur döndürüyor, beşte biri takla attırıyor. Uçlar:
  `agony_auto_3` 168 px ileri + 38 px sıçrama + takla,
  `blackstar_attack_4` 253 px.
- **Balyoz balta ve Kof Uzun Kılıç sade.** Onlar Epic Fight'ın kendi
  büyük/uzun kılıç setini kullanıyor: dönüşsüz, taklasız, 1–2 blok.

## Bedrock için anlamı

1. **İlerleme animasyonla verilmez.** Bedrock'ta animasyon yalnız
   modeli oynatır, isabet kutusu yerinde kalır. Epic Fight'ın yaptığı
   gibi mesafe betikten oyuncuya itme olarak verilmeli; animasyonda
   `root` yatayda kaymamalı.
2. **Yan duruş `waist` dönüşüyle** (düşey eksen). Düşey eksende dönüş
   kalçayı ayırmaz. Ayırma öne/yana eğilmede oluyor
   (`REFERANS_WOM.md`, "gerçek Java istemcisinde gözlem").
3. **Takla ve tam tur `root` ile** döndürülür: bütün beden birlikte
   döner, eklem ayrılmaz.
4. **Vuruş karesi ~%20'de.** Hasar zamanlaması buna göre.

## Duruş tablosu

Açılar derece, uzunluklar piksel (1 blok = 16 px). "Göğüs": göğsün
oyuncunun baktığı yöne göre sağa dönüşü. "Kafa": aynısı, kafa için.
"Bıçak ucu": vuruş kutusunun merkezi yönü, göğse göre.

| hareket seti | bizim eşya | göğüs | kafa | öne eğim | eller arası | bıçak ucu (göğse göre) | diz (sağ/sol) | önde ayak | kalça |
|---|---|---|---|---|---|---|---|---|---|
| staff | 6 asa (wooden…netherite) | +62° | +26° | +11° | 8.4 px | sağ yukarı | 30°/17° | sol (6.7 px) | 11.9 px |
| agony | agony | +21° | +0° | +1° | 11.0 px | ön aşağı | 0°/16° | sağ (3.0 px) | 11.9 px |
| torment | tormented_mind | +81° | +10° | +1° | 11.3 px | sağ aşağı | 30°/31° | sol (7.7 px) | 11.5 px |
| ruine | ruine | +78° | +31° | -4° | 3.9 px (iki el) | yukarı | 36°/17° | sol (1.9 px) | 12.4 px |
| satsujin | satsujin | +56° | -1° | -1° | 17.1 px | ön aşağı | 22°/0° | sol (1.7 px) | 12.4 px |
| ender_blaster | ender_blaster | +31° | -3° | +2° | 12.6 px | ön yatay | 0°/13° | sol (5.1 px) | 12.4 px |
| clawed_gauntle | jabberwocky | +31° | -3° | +2° | 12.6 px | ön yatay | 0°/13° | sol (5.1 px) | 12.4 px |
| antitheus | antitheus | +21° | +0° | +1° | 11.7 px | sağ-ön aşağı | 0°/16° | sağ (3.0 px) | 11.9 px |
| herrscher | herrscher | +26° | +6° | +1° | 15.7 px | ön aşağı | 10°/13° | sol (4.9 px) | 11.8 px |
| gesetz | gesetz | — | — | — | — | kendi duruşu/vuruşu yok (Herrscher'in kalkanı) | — | — | — |
| moonless | moonless | +57° | +13° | -1° | 13.3 px | yukarı | 13°/11° | sağ (1.2 px) | 12.4 px |
| solar | solar | +18° | +18° | +18° | 9.0 px | arka aşağı | 44°/50° | sol (13.0 px) | 10.3 px |
| napoleon | napoleon | +29° | +24° | +10° | 14.8 px | sol-arka yukarı | 51°/0° | sol (3.1 px) | 12.1 px |
| evil_tachi | evil_tachi | +0° | +0° | +0° | 14.5 px | sağ yatay | 23°/23° | sol (2.5 px) | 11.9 px |
| orbit | orbit | +62° | +30° | +8° | 13.0 px | sağ-ön yatay | 37°/57° | sol (7.6 px) | 10.9 px |
| nova | nova | +7° | +7° | -0° | 13.8 px | sağ-ön aşağı | 21°/10° | sol (1.1 px) | 12.2 px |
| blackstar | blackstar | +55° | +30° | -6° | 3.4 px (iki el) | sağ yatay | 9°/12° | sol (5.8 px) | 11.8 px |
| greatsword | 4 balyoz balta | +74° | -0° | +6° | 2.0 px (iki el) | arka yukarı | 34°/44° | sol (9.8 px) | 11.0 px |
| longsword | hollow_longsword | +39° | +0° | +2° | 15.7 px | ön aşağı | 21°/24° | sol (5.5 px) | 11.9 px |

## Vuruş tablosu

"İlerleme": oyuncunun vuruş boyunca ileri gittiği en uzak nokta.
"En yüksek": kalçanın başlangıca göre en çok yükselmesi. "Dönüş":
göğsün toplam düşey eksen dönüşü (göğüs dik değilken sayılır).
"Savuruş yönü": bıçak ucunun en hızlı anda gittiği yön, oyuncunun
baktığı yöne göre.

| set | tür | animasyon | süre | en hızlı an | ilerleme | en yüksek | dönüş | takla | savuruş yönü |
|---|---|---|---|---|---|---|---|---|---|
| staff | oto | `staff_auto_1` | 2.35 s | %10 | 7.7 px | +0.0 px | -10° |  | ön aşağı |
| staff | oto | `staff_auto_2` | 2.00 s | %10 | 11.6 px | +1.5 px | +180° |  | sağ-arka yatay |
| staff | oto | `staff_auto_3` | 2.85 s | %15 | 16.0 px | +1.2 px | -33° |  | sol-arka yatay |
| staff | kosu | `staff_squall` | 3.50 s | %18 | 19.1 px | +0.0 px | +342° |  | sağ-ön yatay |
| staff | hava | `staff_kinkong` | 1.72 s | %29 | 40.2 px | +3.3 px | -27° |  | arka yatay |
| agony | oto | `agony_auto_1` | 2.02 s | %10 | 40.4 px | +2.9 px | -70° |  | ön yatay |
| agony | oto | `agony_auto_2` | 2.50 s | %21 | 19.1 px | +4.3 px | +654° |  | sağ-ön aşağı |
| agony | oto | `agony_auto_3` | 1.93 s | %43 | 168.4 px | +37.9 px | -51° | evet | sağ aşağı |
| agony | oto | `agony_auto_4` | 2.38 s | %24 | 12.3 px | +1.4 px | +297° |  | sağ-arka yatay |
| agony | kosu | `agony_clawstrike` | 1.83 s | %23 | 53.4 px | +11.4 px | -384° | evet | ön yukarı |
| agony | hava | `agony_ripping_fangs` | 2.00 s | %25 | 51.2 px | +18.0 px | -741° | evet | ön aşağı |
| torment | oto | `torment_auto_1` | 1.32 s | %31 | 27.7 px | +4.4 px | +349° |  | sağ yatay |
| torment | oto | `torment_auto_2` | 1.65 s | %20 | 37.5 px | +1.7 px | -59° |  | sol-ön yatay |
| torment | oto | `torment_auto_3` | 1.50 s | %10 | 5.0 px | +6.5 px | +211° |  | sağ yukarı |
| torment | oto | `torment_auto_4` | 1.80 s | %25 | 22.1 px | +1.1 px | -212° |  | ön yatay |
| torment | kosu | `torment_dash` | 2.40 s | %11 | 16.7 px | +4.2 px | -78° | evet | ön aşağı |
| torment | hava | `torment_airslam` | 2.25 s | %19 | 29.2 px | +0.0 px | -30° | evet | ön aşağı |
| ruine | oto | `ruine_auto_1` | 2.50 s | %14 | 37.5 px | +4.2 px | -29° |  | sol-ön yukarı |
| ruine | oto | `ruine_auto_2` | 3.50 s | %23 | 16.6 px | +2.5 px | +556° |  | sağ-arka aşağı |
| ruine | oto | `ruine_auto_3` | 3.33 s | %11 | 93.3 px | +6.1 px | +203° |  | sol yatay |
| ruine | oto | `ruine_auto_4` | 2.10 s | %19 | 71.8 px | +1.5 px | +6° |  | ön yatay |
| ruine | kosu | `ruine_chatiment` | 2.00 s | %21 | 51.2 px | +2.5 px | +330° |  | sağ aşağı |
| ruine | hava | `ruine_comet` | 2.53 s | %40 | 99.8 px | +12.3 px | -50° |  | arka yukarı |
| satsujin | oto | `satsujin_auto_1` | 3.50 s | %54 | 33.7 px | +0.4 px | +171° |  | sağ-arka aşağı |
| satsujin | oto | `satsujin_auto_2` | 4.12 s | %15 | 54.6 px | +3.6 px | -56° |  | arka aşağı |
| satsujin | oto | `satsujin_auto_3` | 3.68 s | %56 | 26.8 px | +1.5 px | +289° |  | sağ-arka aşağı |
| satsujin | kosu | `satsujin_harusaki` | 4.67 s | %65 | 74.0 px | +23.0 px | +360° | evet | sağ-arka aşağı |
| satsujin | hava | `satsujin_tsukuyomi` | 4.33 s | %62 | 8.3 px | +38.3 px | +64° |  | sağ-arka aşağı |
| ender_blaster | oto | `enderblaster_onehand_auto_1` | 1.00 s | %2 | 29.2 px | +0.6 px | -57° | evet | sol-ön yukarı |
| ender_blaster | oto | `enderblaster_onehand_auto_2` | 2.00 s | %12 | 38.1 px | +0.7 px | -314° |  | sol yatay |
| ender_blaster | oto | `enderblaster_onehand_auto_3` | 1.45 s | %9 | 22.8 px | +0.6 px | +279° |  | sağ-arka aşağı |
| ender_blaster | oto | `enderblaster_onehand_auto_4` | 0.95 s | %47 | 52.1 px | +12.8 px | -581° |  | sol-ön yatay |
| ender_blaster | kosu | `enderblaster_onehand_dash` | 2.00 s | %20 | 79.3 px | +28.6 px | -359° | evet | sağ-arka yukarı |
| ender_blaster | hava | `enderblaster_onehand_jumpkick` | 1.67 s | %36 | 30.7 px | +43.0 px | +1474° |  | sağ-arka yukarı |
| clawed_gauntle | oto | `enderblaster_onehand_auto_2` | 2.00 s | %12 | 38.1 px | +0.7 px | -314° |  | sol-ön yatay |
| clawed_gauntle | oto | `enderblaster_onehand_auto_3` | 1.45 s | %7 | 22.8 px | +0.6 px | +279° |  | sağ-arka aşağı |
| clawed_gauntle | oto | `fist_auto2` | 0.50 s | %5 | 6.8 px | +0.0 px | -13° |  | ön yatay |
| clawed_gauntle | kosu | `enderblaster_onehand_dash` | 2.00 s | %39 | 79.3 px | +28.6 px | -359° | evet | arka aşağı |
| clawed_gauntle | hava | `enderblaster_twohand_tishnaw` | 1.15 s | %30 | 106.9 px | +15.9 px | +58° |  | sağ aşağı |
| antitheus | oto | `antitheus_auto_1` | 2.50 s | %29 | 80.3 px | +4.0 px | -411° |  | sol-ön yatay |
| antitheus | oto | `antitheus_auto_2` | 2.00 s | %16 | 55.7 px | +6.4 px | +107° |  | arka yatay |
| antitheus | oto | `antitheus_auto_3` | 1.90 s | %12 | 70.4 px | +15.9 px | +230° |  | sağ-ön yatay |
| antitheus | oto | `antitheus_auto_4` | 1.90 s | %33 | 24.1 px | +3.6 px | +250° |  | sağ-arka yatay |
| antitheus | kosu | `antitheus_agression` | 2.00 s | %11 | 98.6 px | +8.3 px | -32° |  | ön yatay |
| antitheus | hava | `antitheus_guillotine` | 2.00 s | %42 | 37.7 px | +23.9 px | +752° | evet | sol-arka yatay |
| herrscher | oto | `herrscher_auto_1` | 2.37 s | %20 | 78.1 px | +2.1 px | -40° |  | arka aşağı |
| herrscher | oto | `herrscher_auto_2` | 1.75 s | %16 | 67.2 px | +3.0 px | -74° |  | ön yatay |
| herrscher | oto | `herrscher_auto_3` | 1.75 s | %27 | 24.8 px | +3.5 px | +385° |  | sağ yatay |
| herrscher | kosu | `herrscher_verdammnis` | 2.50 s | %16 | 78.2 px | +7.6 px | +386° |  | sol-arka yukarı |
| herrscher | hava | `herrscher_ausrottung` | 1.50 s | %18 | 12.2 px | +21.0 px | +377° |  | sağ-arka yukarı |
| moonless | oto | `moonless_auto_1` | 1.50 s | %20 | 85.5 px | +0.4 px | -263° |  | ön yatay |
| moonless | oto | `moonless_auto_2` | 2.50 s | %36 | 54.7 px | +10.7 px | -1259° |  | sol aşağı |
| moonless | oto | `moonless_auto_3` | 2.50 s | %21 | 57.9 px | +47.6 px | -128° | evet · kaybolur | aşağı |
| moonless | kosu | `moonless_reversed_bypass` | 2.50 s | %16 | 65.3 px | +3.8 px | +349° |  · kaybolur | sağ-arka yatay |
| moonless | hava | `moonless_crescent` | 1.90 s | %21 | 28.4 px | +10.9 px | -139° | evet | ön aşağı |
| solar | oto | `solar_auto_1` | 1.80 s | %21 | 1.9 px | +0.0 px | +8° | evet | sağ-arka aşağı |
| solar | oto | `solar_auto_2` | 2.50 s | %28 | 32.3 px | +6.3 px | +189° | evet | ön aşağı |
| solar | oto | `solar_auto_3` | 2.50 s | %24 | 31.9 px | +2.4 px | +5° |  | sağ-arka yatay |
| solar | oto | `solar_auto_4` | 2.00 s | %19 | 25.7 px | +3.5 px | -94° |  | arka yukarı |
| solar | kosu | `solar_quemadura` | 1.45 s | %38 | 42.4 px | +0.4 px | -324° |  | ön yatay |
| solar | hava | `solar_horno` | 3.00 s | %8 | 27.7 px | +28.1 px | +18° |  | aşağı |
| napoleon | oto | `napoleon_auto_1` | 3.47 s | %25 | 38.3 px | +1.7 px | -84° |  | sağ-arka yatay |
| napoleon | oto | `napoleon_auto_2` | 4.07 s | %10 | 11.4 px | +3.5 px | -132° |  | sağ aşağı |
| napoleon | oto | `napoleon_auto_3` | 4.32 s | %32 | 44.6 px | +24.5 px | +530° | evet | arka yukarı |
| napoleon | oto | `napoleon_auto_4` | 5.02 s | %17 | 61.7 px | +12.2 px | +280° | evet | sağ-arka aşağı |
| napoleon | kosu | `napoleon_austerlitz` | 2.88 s | %23 | 37.6 px | +2.8 px | -55° |  | arka yatay |
| napoleon | hava | `napoleon_waterlow` | 4.00 s | %21 | 58.9 px | +6.4 px | +280° |  | arka yukarı |
| evil_tachi | oto | `tachi_auto1` | 1.23 s | %29 | 19.9 px | +1.0 px | -31° |  | sol-ön aşağı |
| evil_tachi | oto | `tachi_auto2` | 1.23 s | %18 | 17.6 px | +2.8 px | +101° |  | sağ-ön yukarı |
| evil_tachi | oto | `tachi_auto3` | 1.18 s | %17 | 16.1 px | +1.7 px | -25° |  | ön yukarı |
| evil_tachi | kosu | `tachi_dash` | 1.42 s | %21 | 31.0 px | +0.7 px | -18° |  | ön yatay |
| evil_tachi | hava | `spear_twohand_air_slash` | 0.70 s | %32 | 0.0 px | +0.1 px | -187° |  | ön aşağı |
| orbit | oto | `orbit_attack_1` | 2.85 s | %11 | 48.3 px | +2.6 px | +658° |  | sağ-ön yukarı |
| orbit | oto | `orbit_attack_2` | 2.85 s | %29 | 29.7 px | +3.5 px | +155° |  | arka aşağı |
| orbit | oto | `orbit_attack_3` | 3.73 s | %13 | 56.3 px | +6.3 px | -500° |  | sol-arka aşağı |
| orbit | oto | `orbit_attack_4` | 3.00 s | %18 | 56.7 px | +14.2 px | +224° |  | ön aşağı |
| orbit | kosu | `orbit_satelite` | 3.67 s | %16 | 56.3 px | +4.4 px | -67° |  | sol yukarı |
| orbit | hava | `orbit_mad_reach` | 3.33 s | %10 | 119.9 px | +0.0 px | +160° |  | sağ aşağı |
| nova | oto | `nova_attack_1` | 2.50 s | %22 | 36.0 px | +0.8 px | -343° |  | ön yukarı |
| nova | oto | `nova_attack_2` | 4.35 s | %3 | 40.2 px | +2.7 px | +95° |  | sağ yatay |
| nova | oto | `nova_attack_3` | 4.33 s | %10 | 93.1 px | +9.1 px | +542° |  | sağ yukarı |
| nova | kosu | `nova_attack_4` | 4.37 s | %13 | 71.9 px | +13.0 px | +576° |  | sağ-ön yukarı |
| nova | hava | `nova_attack_dash` | 4.50 s | %13 | 78.0 px | +4.4 px | -97° |  | ön yatay |
| blackstar | oto | `blackstar_attack_1` | 3.00 s | %12 | 29.5 px | +4.2 px | -198° |  | sağ-arka yatay |
| blackstar | oto | `blackstar_attack_2` | 3.87 s | %5 | 28.3 px | +2.4 px | -22° |  | sol-ön yatay |
| blackstar | oto | `blackstar_attack_3` | 5.28 s | %13 | 37.2 px | +1.8 px | +277° |  | sağ aşağı |
| blackstar | oto | `blackstar_attack_4` | 5.50 s | %15 | 253.1 px | +31.5 px | -32° | evet | sol-ön yukarı |
| blackstar | kosu | `blackstar_chocknwave` | 3.90 s | %25 | 97.7 px | +16.3 px | -406° | evet | ön aşağı |
| blackstar | hava | `blackstar_gravity` | 4.00 s | %15 | 55.8 px | +26.4 px | +342° | evet | aşağı |
| greatsword | oto | `greatsword_auto1` | 1.25 s | %18 | 21.5 px | +1.7 px | -39° |  | sol-ön aşağı |
| greatsword | oto | `greatsword_auto2` | 1.72 s | %35 | 22.3 px | +2.7 px | +188° |  | arka yatay |
| greatsword | kosu | `greatsword_dash` | 1.65 s | %24 | 13.4 px | +3.2 px | -57° |  | ön aşağı |
| greatsword | hava | `greatsword_air_slash` | 1.00 s | %55 | 0.0 px | +1.4 px | -163° |  | ön aşağı |
| longsword | oto | `longsword_auto1` | 1.35 s | %20 | 13.5 px | +1.3 px | -5° |  | sol-ön aşağı |
| longsword | oto | `longsword_auto2` | 1.35 s | %13 | 16.4 px | +2.7 px | +129° |  | sağ-ön yukarı |
| longsword | oto | `longsword_auto3` | 1.25 s | %18 | 16.4 px | +2.0 px | -12° |  | ön yatay |
| longsword | kosu | `longsword_dash` | 1.35 s | %11 | 33.2 px | +3.0 px | -46° |  | ön yatay |
| longsword | hava | `longsword_air_slash` | 0.70 s | %46 | 0.0 px | +2.3 px | -4° |  | ön aşağı |
