"""
Döngü mimarisinin testleri — dış bağımlılık yok, ağ yok.

Sahte motor sayesinde beş halkanın da gerçek yolları (yeniden planlama,
iyileştirme turu, uzman değişimi, insan kapısı, birleştirme görevi) API
anahtarı olmadan sınanabiliyor. Motor arayüzünü ayırmanın asıl kazancı bu.
"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from cekirdek.araclar import AracHatasi, dosya_araclari
from cekirdek.durum import Adim, AdimDurumu, Plan
from cekirdek.insan import Esikler, Kapi, Karar, OtomatikKapi
from cekirdek.motor import SahteMotor
from cekirdek.olaylar import OlayGunlugu
from cekirdek.uzmanlar import Uzman, UzmanKaydi, Yonetici, ornek_kadro, ozet_dosyasi_oragi
from cekirdek.yansitma import (
    KuralOragi,
    Yansitici,
    bos_olmasin,
    dosya_bolumleri,
    yasakli_ifadeler,
)
from cekirdek.yurutucu import Yurutucu

HEDEF = "Ölçüm verisinden rapor üret ve temizle."


def dongu_kur(
    calisma: Path,
    kapi_yanitlari: dict[str, Karar] | None = None,
    varsayilan: Karar = Karar.ONAY,
    esikler: Esikler | None = None,
    ek_oraklar: list[tuple[object, str | None]] | None = None,
):
    gunluk = OlayGunlugu(sessiz=True)
    araclar = dosya_araclari(calisma)

    yansitici = Yansitici(gunluk)
    yansitici.ekle(bos_olmasin())
    yansitici.ekle(yasakli_ifadeler(("yakında", "todo")))
    yansitici.ekle(
        dosya_bolumleri(calisma / "rapor.md", ("## Bulgular", "## Yöntem")),
        adim_kimligi="rapor-yaz",
    )
    for orak, kimlik in ek_oraklar or []:
        yansitici.ekle(orak, adim_kimligi=kimlik)

    kapi_secimi = OtomatikKapi(varsayilan, kapi_yanitlari)
    kapi = Kapi(esikler or Esikler(), kapi_secimi, gunluk)
    yonetici = Yonetici(
        ornek_kadro(), gunluk, birlestirme_oraklari=[ozet_dosyasi_oragi(calisma)]
    )
    yurutucu = Yurutucu(SahteMotor(), araclar, yansitici, kapi, yonetici, gunluk)
    return yurutucu, gunluk, kapi_secimi


class TamKosuTesti(unittest.TestCase):
    """Beş halkanın hepsinin tetiklendiği uçtan uca koşu."""

    def setUp(self) -> None:
        self._gecici = tempfile.TemporaryDirectory()
        self.calisma = Path(self._gecici.name)
        self.addCleanup(self._gecici.cleanup)

    def test_kosu_basarili_biter(self):
        yurutucu, gunluk, _ = dongu_kur(self.calisma)
        sonuc = yurutucu.calistir(HEDEF)

        self.assertTrue(sonuc.basarili, sonuc.plan.ozet())
        self.assertFalse(sonuc.durduruldu)
        self.assertTrue(sonuc.plan.bitti_mi())

    def test_react_gozlemi_plani_yeniden_yazdirir(self):
        """★ ReAct → Plan geri kenarı."""
        yurutucu, gunluk, _ = dongu_kur(self.calisma)
        sonuc = yurutucu.calistir(HEDEF)

        self.assertEqual(sonuc.plan.yeniden_planlama_sayisi, 1)
        self.assertEqual(sonuc.plan.surum, 2)
        self.assertEqual(gunluk.sayi("yeniden-planla-istegi"), 1)
        self.assertIsNotNone(sonuc.plan.bul("veri-uret"))

    def test_yansitma_reddedince_iyilestirme_turu_donuyor(self):
        """★ Yansıtma kapısı → yönetici yeniden görev verir."""
        yurutucu, gunluk, _ = dongu_kur(self.calisma)
        sonuc = yurutucu.calistir(HEDEF)

        rapor = sonuc.plan.bul("rapor-yaz")
        self.assertIsNotNone(rapor)
        self.assertEqual(rapor.yansitma_turu, 1, "bir iyileştirme turu beklenir")
        self.assertEqual(rapor.durum, AdimDurumu.TAMAM)
        self.assertEqual(gunluk.sayi("reddedildi"), 1)
        self.assertEqual(gunluk.sayi("yeniden-gorev"), 1)
        # Harici orak diske baktı: nihai dosya iki bölümü de içermeli.
        metin = (self.calisma / "rapor.md").read_text(encoding="utf-8")
        self.assertIn("## Bulgular", metin)
        self.assertIn("## Yöntem", metin)

    def test_birlestirme_eksigi_yeni_gorev_uretir(self):
        """★ Yönetici döngüsü: tek seferlik dağıtım değil, eksik → yeni görev."""
        yurutucu, gunluk, _ = dongu_kur(self.calisma)
        sonuc = yurutucu.calistir(HEDEF)

        self.assertEqual(gunluk.sayi("birlestirme-eksik"), 1)
        self.assertEqual(gunluk.sayi("yeni-gorev"), 1)
        self.assertEqual(gunluk.sayi("birlestirme-tamam"), 1)
        kapanis = [a for a in sonuc.plan.adimlar if a.kimlik.startswith("kapanis-")]
        self.assertEqual(len(kapanis), 1)
        self.assertEqual(kapanis[0].durum, AdimDurumu.TAMAM)
        self.assertTrue((self.calisma / "ozet.txt").exists())

    def test_adimlar_uzmanlara_dagitilir(self):
        yurutucu, _, _ = dongu_kur(self.calisma)
        sonuc = yurutucu.calistir(HEDEF)

        atamalar = {a.kimlik: a.uzman for a in sonuc.plan.adimlar}
        self.assertEqual(atamalar["veri-topla"], "arastirmaci")
        self.assertEqual(atamalar["rapor-yaz"], "yazar")
        self.assertEqual(atamalar["temizlik"], "bakimci")


class InsanKapisiTesti(unittest.TestCase):
    def setUp(self) -> None:
        self._gecici = tempfile.TemporaryDirectory()
        self.calisma = Path(self._gecici.name)
        self.addCleanup(self._gecici.cleanup)

    def test_geri_alinamaz_arac_once_sorar(self):
        yurutucu, gunluk, kapi = dongu_kur(self.calisma)
        yurutucu.calistir(HEDEF)

        sebepler = [i.sebep for i in kapi.gecmis]
        self.assertIn("geri_alinamaz_arac", sebepler)

    def test_ret_dosyayi_korur_ve_gozleme_donusur(self):
        yurutucu, gunluk, _ = dongu_kur(
            self.calisma, kapi_yanitlari={"geri_alinamaz_arac": Karar.RET}
        )
        sonuc = yurutucu.calistir(HEDEF)

        # Silme reddedildi → dosya duruyor.
        self.assertTrue((self.calisma / "olcumler.json").exists())
        temizlik = sonuc.plan.bul("temizlik")
        gozlemler = [k.gozlem for k in temizlik.kanitlar]
        self.assertTrue(any("reddetti" in g for g in gozlemler))

    def test_plan_reddedilirse_hicbir_sey_yurutulmez(self):
        yurutucu, gunluk, _ = dongu_kur(
            self.calisma, kapi_yanitlari={"plan_onayi": Karar.DURDUR}
        )
        sonuc = yurutucu.calistir(HEDEF)

        self.assertTrue(sonuc.durduruldu)
        self.assertFalse(sonuc.basarili)
        self.assertEqual(gunluk.sayi("adim-basladi"), 0)
        self.assertFalse((self.calisma / "rapor.md").exists())

    def test_yansitma_tavani_insana_cikar_ve_uzman_degistirir(self):
        """Tavan olmadan sonsuz iyileştirme olur; tavan insana çıkar."""
        asla_gecmeyen = KuralOragi(
            ad="imkansiz",
            denetci=lambda adim: ["'## Kaynaklar' bölümü hiçbir zaman yazılmıyor"],
        )
        esikler = Esikler(azami_yansitma_turu=3)
        yurutucu, gunluk, kapi = dongu_kur(
            self.calisma,
            kapi_yanitlari={"yansitma_tavani": Karar.ATLA},
            esikler=esikler,
            ek_oraklar=[(asla_gecmeyen, "rapor-yaz")],
        )
        sonuc = yurutucu.calistir(HEDEF)

        rapor = sonuc.plan.bul("rapor-yaz")
        self.assertEqual(rapor.durum, AdimDurumu.ATLANDI)
        self.assertEqual(rapor.yansitma_turu, 3)
        self.assertIn("yansitma_tavani", [i.sebep for i in kapi.gecmis])
        # İkinci turdan sonra yönetici uzmanı değiştirmiş olmalı.
        self.assertGreaterEqual(gunluk.sayi("uzman-degisimi"), 1)
        self.assertGreater(len(rapor.denenen_uzmanlar), 1)


class UzmanTesti(unittest.TestCase):
    def test_uzman_yalniz_izinli_araclari_gorur(self):
        with tempfile.TemporaryDirectory() as gecici:
            tum = dosya_araclari(gecici)
            yazar = Uzman(ad="yazar", tanim="", yonerge="", izinli_araclar=("dosya_yaz",))
            alt = yazar.araclari(tum)

            self.assertIsNotNone(alt.bul("dosya_yaz"))
            self.assertIsNone(alt.bul("dosya_sil"), "yazarın silme yetkisi olmamalı")

    def test_izin_listesi_bossa_hepsi_gorunur(self):
        with tempfile.TemporaryDirectory() as gecici:
            tum = dosya_araclari(gecici)
            serbest = Uzman(ad="x", tanim="", yonerge="")
            self.assertEqual(len(serbest.araclari(tum).hepsi()), len(tum.hepsi()))

    def test_yeniden_ata_once_ayni_uzmani_dener(self):
        gunluk = OlayGunlugu(sessiz=True)
        kayit = UzmanKaydi(
            [Uzman("a", "birinci", ""), Uzman("b", "ikinci", "")]
        )
        yonetici = Yonetici(kayit, gunluk)
        adim = Adim(kimlik="x", baslik="X", uzman="a")
        yonetici.ata(adim)

        adim.yansitma_turu = 1
        self.assertEqual(yonetici.yeniden_ata(adim, ["eksik"]).ad, "a")

        adim.yansitma_turu = 2
        self.assertEqual(yonetici.yeniden_ata(adim, ["eksik"]).ad, "b")


class DurumTesti(unittest.TestCase):
    def test_yerine_koy_bitmis_adimlari_korur(self):
        plan = Plan(
            hedef="h",
            adimlar=[
                Adim(kimlik="a", baslik="A", durum=AdimDurumu.TAMAM),
                Adim(kimlik="b", baslik="B"),
            ],
        )
        plan.yerine_koy([Adim(kimlik="c", baslik="C"), Adim(kimlik="b", baslik="B2")])

        kimlikler = [a.kimlik for a in plan.adimlar]
        self.assertEqual(kimlikler, ["a", "c", "b"])
        self.assertEqual(plan.bul("a").durum, AdimDurumu.TAMAM)
        self.assertEqual(plan.surum, 2)

    def test_plan_diske_yazilip_geri_okunur(self):
        with tempfile.TemporaryDirectory() as gecici:
            yurutucu, _, _ = dongu_kur(Path(gecici))
            sonuc = yurutucu.calistir(HEDEF)
            yol = Path(gecici) / "plan.json"
            sonuc.plan.kaydet(yol)

            geri = Plan.yukle(yol)
            self.assertEqual(geri.hedef, sonuc.plan.hedef)
            self.assertEqual(geri.surum, sonuc.plan.surum)
            self.assertEqual(len(geri.adimlar), len(sonuc.plan.adimlar))
            self.assertEqual(geri.adimlar[0].uzman, sonuc.plan.adimlar[0].uzman)
            self.assertEqual(geri.adimlar[0].durum, sonuc.plan.adimlar[0].durum)


class AracTesti(unittest.TestCase):
    def test_calisma_dizini_disina_yazilamaz(self):
        with tempfile.TemporaryDirectory() as gecici:
            araclar = dosya_araclari(gecici)
            yaz = araclar.bul("dosya_yaz")
            with self.assertRaises(AracHatasi):
                yaz.calistir({"yol": "../kacak.txt", "icerik": "x"})

    def test_hesap_araci_kod_calistirmaz(self):
        with tempfile.TemporaryDirectory() as gecici:
            hesapla = dosya_araclari(gecici).bul("hesapla")
            self.assertEqual(hesapla.calistir({"ifade": "(3+5)/2"}), "4.0")
            with self.assertRaises(AracHatasi):
                hesapla.calistir({"ifade": "__import__('os').getcwd()"})

    def test_geri_alinamaz_bayragi_yalniz_silmede(self):
        with tempfile.TemporaryDirectory() as gecici:
            araclar = dosya_araclari(gecici)
            geri_alinamazlar = {a.ad for a in araclar.hepsi() if a.geri_alinamaz}
            self.assertEqual(geri_alinamazlar, {"dosya_sil"})


if __name__ == "__main__":
    unittest.main()
