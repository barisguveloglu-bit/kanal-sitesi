"""
Katman 0 + 1 — Planlama ve Yürütme; ve beş halkanın birleştiği yer.

Akış:

    plan üret ──► [insan: plan onayı]
      │
      └─► her adım için:
            ├─ yönetici adımı bir uzmana atar          (Katman 1.5)
            ├─ ReAct halkası adımı yürütür             (Katman 2)
            │    └─ "yeniden_planla" derse ────────────► plana geri dön ★
            ├─ yansıtma harici oraklarla sınar         (Katman 3)
            │    └─ reddederse: yönetici yeniden görev verir ★
            │         └─ tavan aşılırsa ───────────────► insan kapısı (Katman 4)
            └─ tamam
      │
      └─► bütün adımlar bitince yönetici sonuçları birleştirir
            └─ eksik varsa yeni adım üret ─────────────► döngüye geri dön ★

★ işaretli üç kenar, bu beş şeyi tek bir sistem yapan şeydir. Kenarlar
olmadan elinde birbirini görmezden gelen beş ayrı mekanizma olur.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .araclar import AracKaydi
from .durum import Adim, AdimDurumu, Plan
from .insan import Kapi, Karar
from .olaylar import Katman, OlayGunlugu
from .react import ReactDongusu
from .uzmanlar import Yonetici
from .yansitma import Yansitici


@dataclass
class KosuSonucu:
    plan: Plan
    basarili: bool
    durduruldu: bool = False
    sebep: str = ""
    istatistik: dict = field(default_factory=dict)


class Yurutucu:
    """Beş döngüyü tek durum nesnesi üzerinde süren orkestratör."""

    def __init__(
        self,
        motor,
        araclar: AracKaydi,
        yansitici: Yansitici,
        kapi: Kapi,
        yonetici: Yonetici,
        gunluk: OlayGunlugu,
    ) -> None:
        self.motor = motor
        self.araclar = araclar
        self.yansitici = yansitici
        self.kapi = kapi
        self.yonetici = yonetici
        self.gunluk = gunluk
        self.react = ReactDongusu(motor, kapi, gunluk)

    # -- Katman 0 -----------------------------------------------------------

    def _plan_uret(self, hedef: str) -> Plan:
        ham = self.motor.planla(
            hedef, self.araclar.tarif(), self.yonetici.kayit.tarif()
        )
        plan = Plan(hedef=hedef, adimlar=[self._adima_cevir(h) for h in ham])
        self.gunluk.yaz(
            Katman.PLAN, "uretildi", f"{len(plan.adimlar)} adımlık plan üretildi"
        )
        return plan

    def _yeniden_planla(self, plan: Plan, gerekce: str) -> bool:
        """ReAct gözlemini plana geri besler. False dönerse koşu durur."""
        if plan.yeniden_planlama_sayisi >= self.kapi.esikler.azami_yeniden_planlama:
            karar = self.kapi.sor(
                sebep="yeniden_planlama_tavani",
                baslik="Plan tavana ulaştı",
                ayrinti=(
                    f"Plan {plan.yeniden_planlama_sayisi} kez yeniden yazıldı.\n"
                    f"Yeni gerekçe: {gerekce}\n\n{plan.ozet()}"
                ),
            )
            if karar is not Karar.ONAY:
                return False

        ham = self.motor.planla(
            plan.hedef,
            self.araclar.tarif(),
            self.yonetici.kayit.tarif(),
            mevcut_plan=plan,
            gerekce=gerekce,
        )
        plan.yerine_koy([self._adima_cevir(h) for h in ham])
        self.gunluk.yaz(
            Katman.PLAN,
            "yeniden-planlandi",
            f"sürüm {plan.surum}: {len(plan.adimlar)} adım — gerekçe: {gerekce}",
        )

        if len(plan.adimlar) > self.kapi.esikler.azami_adim_sayisi:
            karar = self.kapi.sor(
                sebep="kapsam_buyumesi",
                baslik="Plan beklenenden çok büyüdü",
                ayrinti=f"{len(plan.adimlar)} adım:\n{plan.ozet()}",
            )
            if karar is not Karar.ONAY:
                return False
        return True

    @staticmethod
    def _adima_cevir(ham: dict) -> Adim:
        return Adim(
            kimlik=ham["kimlik"],
            baslik=ham.get("baslik", ham["kimlik"]),
            aciklama=ham.get("aciklama", ""),
            uzman=ham.get("uzman", ""),
        )

    # -- Katman 1 -----------------------------------------------------------

    def calistir(self, hedef: str) -> KosuSonucu:
        plan = self._plan_uret(hedef)

        if self.kapi.esikler.plan_onayi:
            karar = self.kapi.sor(
                sebep="plan_onayi",
                baslik="Plan yürütülmeye hazır",
                ayrinti=plan.ozet(),
            )
            if karar is not Karar.ONAY:
                return KosuSonucu(plan, False, durduruldu=True, sebep="plan onaylanmadı")

        birlestirme_turu = 0

        while True:
            durdu = self._adimlari_sur(plan)
            if durdu:
                return KosuSonucu(plan, False, durduruldu=True, sebep=durdu)

            # ★ Yönetici döngüsünü kapatan kenar: sonuçları birleştir,
            #   eksik varsa yeni görev üret.
            sonuc = self.yonetici.birlestir(plan)
            if sonuc.tamam:
                break

            birlestirme_turu += 1
            if birlestirme_turu > self.kapi.esikler.azami_birlestirme_turu:
                karar = self.kapi.sor(
                    sebep="birlestirme_tavani",
                    baslik="Birleştirme eksikleri kapanmıyor",
                    ayrinti="Kalan eksikler:\n"
                    + "\n".join(f"- {e}" for e in sonuc.eksikler),
                    secenekler=(Karar.ONAY, Karar.DURDUR),
                )
                if karar is not Karar.ONAY:
                    return KosuSonucu(
                        plan, False, durduruldu=True, sebep="birleştirme eksik kaldı"
                    )
                break

            plan.adimlar.extend(sonuc.yeni_adimlar)
            self.gunluk.yaz(
                Katman.YONETICI,
                "yeni-gorev",
                f"{len(sonuc.yeni_adimlar)} kapanış adımı plana eklendi "
                f"(tur {birlestirme_turu})",
            )

        return KosuSonucu(
            plan=plan,
            basarili=plan.basarili_mi(),
            istatistik=self._istatistik(plan),
        )

    def _adimlari_sur(self, plan: Plan) -> str:
        """Bekleyen adımları bitirir. Boş string = sorunsuz; dolu = durma sebebi."""
        while (adim := plan.siradaki()) is not None:
            uzman = self.yonetici.ata(adim)
            adim.durum = AdimDurumu.YURUTULUYOR
            self.gunluk.yaz(
                Katman.YURUT,
                "adim-basladi",
                f"{adim.baslik} → {uzman.ad}"
                + (f" (iyileştirme turu {adim.yansitma_turu})" if adim.yansitma_turu else ""),
            )

            sonuc = self.react.yurut(plan.hedef, adim, self.araclar, uzman)

            if sonuc.tip == "durduruldu":
                adim.durum = AdimDurumu.BASARISIZ
                return sonuc.gerekce

            # ★ ReAct → Plan geri kenarı.
            if sonuc.tip == "yeniden_planla":
                adim.notlar.append(f"yeniden planlama tetikledi: {sonuc.gerekce}")
                if not self._yeniden_planla(plan, sonuc.gerekce):
                    return "yeniden planlama onaylanmadı"
                continue

            adim.cikti = sonuc.cikti
            adim.notlar.extend(sonuc.notlar)
            adim.durum = AdimDurumu.DOGRULANIYOR

            # ★ Yansıtma kapısı.
            yansima = self.yansitici.degerlendir(adim)
            if yansima.gecti:
                adim.durum = AdimDurumu.TAMAM
                adim.bulgular = []
                self.gunluk.yaz(Katman.YURUT, "adim-tamam", adim.baslik)
                continue

            adim.bulgular = yansima.bulgular
            adim.yansitma_turu += 1

            if adim.yansitma_turu < self.kapi.esikler.azami_yansitma_turu:
                # ★ Yönetici yeniden görev verir (aynı ya da başka uzmana).
                self.yonetici.yeniden_ata(adim, yansima.bulgular)
                adim.sifirla()
                continue

            # Tavan doldu → insan kapısı. Yansıtmanın çıkış vanası.
            durma = self._yansitma_tavani(adim)
            if durma:
                return durma
        return ""

    def _yansitma_tavani(self, adim: Adim) -> str:
        karar = self.kapi.sor(
            sebep="yansitma_tavani",
            baslik=f"'{adim.baslik}' doğrulamayı geçemiyor",
            ayrinti=(
                f"{adim.yansitma_turu} iyileştirme turu denendi.\n"
                f"Denenen uzmanlar: {', '.join(adim.denenen_uzmanlar) or '-'}\n\n"
                "Kalan bulgular:\n"
                + "\n".join(f"- {b}" for b in adim.bulgular)
                + f"\n\nSon çıktı:\n{adim.cikti[:500]}"
            ),
            secenekler=(Karar.ONAY, Karar.ATLA, Karar.DURDUR),
        )
        if karar is Karar.DURDUR:
            adim.durum = AdimDurumu.BASARISIZ
            return "insan doğrulama tavanında durdurdu"
        if karar is Karar.ATLA:
            adim.durum = AdimDurumu.ATLANDI
            adim.notlar.append("insan bulgulara rağmen atladı")
            return ""
        # ONAY = bulguları kabul et, adımı tamamlanmış say.
        adim.durum = AdimDurumu.TAMAM
        adim.notlar.append("insan bulgulara rağmen onayladı")
        return ""

    # -- ölçüm --------------------------------------------------------------

    def _istatistik(self, plan: Plan) -> dict:
        return {
            "adim_sayisi": len(plan.adimlar),
            "plan_surumu": plan.surum,
            "yeniden_planlama": plan.yeniden_planlama_sayisi,
            "toplam_react_turu": sum(len(a.kanitlar) for a in plan.adimlar),
            "toplam_yansitma_turu": sum(a.yansitma_turu for a in plan.adimlar),
            "insana_cikma": self.gunluk.sayi("soruldu"),
            "uzman_degisimi": self.gunluk.sayi("uzman-degisimi"),
            "yeni_gorev": self.gunluk.sayi("yeni-gorev"),
        }
