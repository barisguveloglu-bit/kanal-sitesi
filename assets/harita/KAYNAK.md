# 3D Türkiye haritasının verisi

`mafya.html`'deki 3D haritanın (`assets/js/harita3d.js`) kullandığı iki dosya
burada. İkisi de **elle düzenlenmez**; `uret_harita.py` üretir.

| Dosya | İçerik |
|---|---|
| `renk.jpg` | 2048×1024 fiziki harita dokusu: yüksekliğe göre renk, kuzeybatıdan ışıklı gölgeli kabartma, deniz derinliği, göller, nehirler, il sınırları. Komşu ülkeler soluk. |
| `harita-veri.js` | `HARITA_VERI`: 512×219 yükseklik ızgarası, 1024×512 il kimlik haritası (plaka numarası), il etiket noktaları ve kapsamları. |

Hangi ilin hangi cepheye bağlı olduğu, derebeyi adları ve açıklamaları burada
**yok**: harita onları `assets/js/data.js`'ten (`IL_DEREBEYLERI`, `KOMUTANLAR`),
cephe renklerini `style.css`'teki `[data-bolge]` kurallarından okur. İçerik
değişince haritayı yeniden üretmek gerekmez.

## Kaynaklar ve lisans

| Veri | Kaynak | Lisans |
|---|---|---|
| Yükseklik ve deniz derinliği | NOAA NCEI, **ETOPO 2022** küresel kabartma modeli, 15 açısaniye, yüzey yüksekliği (`N45E015`, `N45E030` parçaları) — <https://www.ncei.noaa.gov/products/etopo-global-relief-model> | Kamu malı (ABD devlet verisi) |
| İl sınırları, kara, göller, nehirler | **Natural Earth** 1:10m (`admin_1_states_provinces`, `land`, `lakes`, `rivers_lake_centerlines`, `rivers_europe`) — <https://www.naturalearthdata.com/> | Kamu malı |

İkisi de kamu malı; kaynak adı yine de sayfada, haritanın altında yazıyor.

## Nasıl üretildi

- **Kapsam:** boylam 25,40–45,00, enlem 35,72–42,25. Türkiye'nin tamamı ve
  çevresinde ince bir pay; güney sınırı Hatay'ın ucunu içeride tutacak kadar.
- **İzdüşüm:** 39° enlemde ölçeklenmiş eşdikdörtgen; genişlik ≈1696 km,
  yükseklik ≈725 km. Ülke ölçeğinde bozulması gözle seçilmez.
- **Yükseklik:** ETOPO kutu filtresiyle 512×219'a küçültüldü, deniz 0'a
  çekildi. Bayt başına kök kodlama: `h = (b / 255)² × 5,2 km` (ovalarda daha
  ince adım). Sayfada dağlar görünsün diye yükseklik 12 kat abartılı çizilir;
  "Kabartma" düğmesi 24 ve 4 katı da gösterir.
- **İller:** Natural Earth'ün `iso_3166_2` alanı (`TR-01` … `TR-81`) plaka
  numarasıdır. 81 ilin 81'i de ızgarada görünüyor; üretici eksik il olursa
  durur. Etiket noktaları Natural Earth'ün kendi `latitude`/`longitude`
  alanlarından.

## Yeniden üretmek

Gereken: Python 3, `numpy`, `pillow`, `scipy`.

```bash
mkdir -p kaynak/etopo kaynak/ne
E=https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/15s/15s_surface_elev_gtif
for t in N45E015 N45E030; do
  curl -L -o kaynak/etopo/$t.tif $E/ETOPO_2022_v1_15s_${t}_surface.tif
done
N=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
for f in ne_10m_admin_1_states_provinces ne_10m_land ne_10m_lakes \
         ne_10m_rivers_lake_centerlines ne_10m_rivers_europe; do
  curl -L -o kaynak/ne/$f.geojson $N/$f.geojson
done
python3 assets/harita/uret_harita.py kaynak assets/harita
```

İndirilen kaynaklar (~120 MB) depoya girmez; yalnızca iki çıktı girer.

## Bilinen sınırlar

- Siteyi dosyaya çift tıklayarak (`file://`) açınca tarayıcı dokuyu güvenlik
  gereği WebGL'e vermez; harita yerine kısa bir not çıkar. Yerel sunucuyla
  (`python3 -m http.server`) ya da yayındaki sitede çalışır.
- WebGL olmayan cihazda da aynı not çıkar; il listesi ve bilgi kutusu yine
  çalışır, 81 il sayfanın aşağısında sıralı.
