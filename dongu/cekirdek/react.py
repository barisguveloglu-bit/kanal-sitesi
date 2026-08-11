"""
Katman 2 — ReAct (Reason + Act).

Bir plan adımının içindeki motor. Üç çıkışı var ve üçüncüsü mimarinin en
kritik parçası:

  - `cevap`          → adım bitti, çıktı yansıtmaya gider
  - `butce_doldu`    → adım bütçesi tükendi, yansıtma yine de çalışır
  - `yeniden_planla` → ★ gözlem planı geçersiz kıldı; karar Katman 0'a döner

Üçüncü çıkış olmadan elinde birbirini görmezden gelen iki döngü olur: saf
ReAct hedefi unutur, saf Plan-Execute hiçbir şey bilmeden yapılmış bir plana
sadık kalmaya çalışır.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .araclar import AracHatasi, AracKaydi, girdiyi_coz
from .durum import Adim, Kanit
from .insan import Kapi, Karar
from .olaylar import Katman, OlayGunlugu
from .uzmanlar import Uzman


@dataclass
class ReactSonucu:
    tip: str  # "cevap" | "yeniden_planla" | "butce_doldu" | "durduruldu"
    cikti: str = ""
    gerekce: str = ""
    tur_sayisi: int = 0
    notlar: list[str] = field(default_factory=list)


class ReactDongusu:
    def __init__(
        self,
        motor,
        kapi: Kapi,
        gunluk: OlayGunlugu,
    ) -> None:
        self.motor = motor
        self.kapi = kapi
        self.gunluk = gunluk

    def yurut(
        self,
        hedef: str,
        adim: Adim,
        tum_araclar: AracKaydi,
        uzman: Uzman | None = None,
    ) -> ReactSonucu:
        # Uzman ajan kendi araç alt kümesini görür — bir uzmanın elinin
        # değemeyeceği araç, o adımda hiç var olmamış gibidir.
        araclar = uzman.araclari(tum_araclar) if uzman else tum_araclar
        etiket = f"{adim.kimlik}" + (f"@{uzman.ad}" if uzman else "")
        azami = self.kapi.esikler.azami_react_adimi

        for tur in range(1, azami + 1):
            karar = self.motor.dusun(hedef, adim, araclar, uzman)
            self.gunluk.yaz(
                Katman.REACT,
                "dusunce",
                f"{etiket} [{tur}/{azami}] {karar.dusunce}",
            )

            if karar.tip == "yeniden_planla":
                self.gunluk.yaz(
                    Katman.REACT,
                    "yeniden-planla-istegi",
                    f"{etiket}: {karar.icerik}",
                )
                return ReactSonucu(tip="yeniden_planla", gerekce=karar.icerik, tur_sayisi=tur)

            if karar.tip == "cevap":
                self.gunluk.yaz(Katman.REACT, "cevap", f"{etiket}: adım tamamlandı")
                return ReactSonucu(tip="cevap", cikti=karar.icerik, tur_sayisi=tur)

            # --- eylem ---
            sonuc = self._eylemi_calistir(adim, karar, araclar, etiket)
            if sonuc is not None:
                return sonuc

        self.gunluk.yaz(
            Katman.REACT, "butce-doldu", f"{etiket}: {azami} turda bitmedi"
        )
        son = adim.kanitlar[-1].gozlem if adim.kanitlar else ""
        return ReactSonucu(
            tip="butce_doldu",
            cikti=son,
            gerekce=f"adım {azami} ReAct turunda tamamlanamadı",
            tur_sayisi=azami,
        )

    # -- eylem yürütme ------------------------------------------------------

    def _eylemi_calistir(
        self, adim: Adim, karar, araclar: AracKaydi, etiket: str
    ) -> ReactSonucu | None:
        """Aracı çalıştırır ve gözlemi kanıt olarak kaydeder.

        Dönüş `None` ise döngü devam eder; bir `ReactSonucu` ise durur.
        """
        arac = araclar.bul(karar.arac)
        if arac is None:
            # Uzmanın yetkisi yoksa bunu da bir gözlem olarak geri veriyoruz;
            # model başka bir yol denesin diye. Sessizce çökmüyoruz.
            gozlem = (
                f"'{karar.arac}' adında bir araca erişimin yok. "
                f"Erişebildiklerin: {', '.join(a.ad for a in araclar.hepsi())}"
            )
            adim.kanitlar.append(Kanit(kaynak=karar.arac, girdi={}, gozlem=gozlem, hata=True))
            self.gunluk.yaz(Katman.REACT, "arac-yok", f"{etiket}: {karar.arac}")
            return None

        try:
            girdi = girdiyi_coz(karar.girdi)
        except AracHatasi as hata:
            adim.kanitlar.append(
                Kanit(kaynak=arac.ad, girdi={}, gozlem=str(hata), hata=True)
            )
            return None

        # ★ İnsan kapısı: geri alınamaz eylem.
        if arac.geri_alinamaz and self.kapi.esikler.geri_alinamaz_araclar:
            karar_insan = self.kapi.sor(
                sebep="geri_alinamaz_arac",
                baslik=f"{arac.ad} çağrılmak üzere",
                ayrinti=(
                    f"Adım : {adim.baslik}\n"
                    f"Uzman: {adim.uzman or '-'}\n"
                    f"Araç : {arac.ad} — {arac.aciklama}\n"
                    f"Girdi: {girdi}\n"
                    f"Gerekçe: {karar.dusunce}"
                ),
                secenekler=(Karar.ONAY, Karar.RET, Karar.ATLA, Karar.DURDUR),
            )
            if karar_insan is Karar.DURDUR:
                return ReactSonucu(tip="durduruldu", gerekce="insan koşuyu durdurdu")
            if karar_insan is Karar.ATLA:
                return ReactSonucu(
                    tip="cevap", cikti="(insan bu adımı atladı)", notlar=["insan atladı"]
                )
            if karar_insan is Karar.RET:
                # Ret de bir gözlemdir: model bunu görüp başka yol denemeli.
                adim.kanitlar.append(
                    Kanit(
                        kaynak=arac.ad,
                        girdi=girdi,
                        gozlem="İnsan bu eylemi reddetti. Bu aracı tekrar deneme; "
                        "başka bir yol bul ya da adımı bitir.",
                        hata=True,
                    )
                )
                return None

        try:
            gozlem = arac.calistir(girdi)
            hata_var = False
        except AracHatasi as hata:
            gozlem, hata_var = str(hata), True
        except Exception as hata:  # noqa: BLE001 - araç çökmesi döngüyü çökertmez
            gozlem, hata_var = f"beklenmeyen araç hatası: {hata}", True

        adim.kanitlar.append(
            Kanit(kaynak=arac.ad, girdi=girdi, gozlem=gozlem, hata=hata_var)
        )
        self.gunluk.yaz(
            Katman.REACT,
            "gozlem-hata" if hata_var else "gozlem",
            f"{etiket}: {arac.ad} → {gozlem.strip()[:100]}",
        )
        return None
