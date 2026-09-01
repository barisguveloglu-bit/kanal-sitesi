"""Bedrock geometrisini KEMIK DONUSLERIYLE cizer.

ciz_geo.py kemik hiyerarsisini yok sayiyordu: butun kupler
ham koordinatlariyla ciziliyordu. Segmentli bir kolda bu,
zincirin duz sarkmasi demek -- gercekte kavis ciziyor.
Burada her kemigin pivot+rotation zinciri uygulaniyor.
"""
import json, math
from PIL import Image, ImageDraw

def don(p, aci, pivot):
    """XYZ Euler (derece), Bedrock sirasi.

    ---- ISARET OLCULEREK BULUNDU ----
    Once acilari NEGATIF uyguluyordum. Kullanici "iki kol
    birbirine gecmis gibi" dedi; sebebi modelde degil BURADA
    cikti. chris_kanli'nin iki kolunun donus SONRASI x
    araliklari olculdu:
        negatif isaret -> sag -3.6..7.5 · sol -7.5..3.6
                          ORTAK 7.2 birim (kollar ic ice)
        pozitif isaret -> sag -13.1..-1.9 · sol 1.9..13.1
                          ORTAK 0.0 (tam ayri, anatomik dogru)
    Modelin kendisi dogruymus.                              """
    x,y,z = p[0]-pivot[0], p[1]-pivot[1], p[2]-pivot[2]
    rx,ry,rz = [math.radians(a) for a in aci]
    # X
    c,s = math.cos(rx), math.sin(rx); y,z = y*c - z*s, y*s + z*c
    # Y
    c,s = math.cos(ry), math.sin(ry); x,z = x*c + z*s, -x*s + z*c
    # Z
    c,s = math.cos(rz), math.sin(rz); x,y = x*c - y*s, x*s + y*c
    return (x+pivot[0], y+pivot[1], z+pivot[2])

def yukle(geoYol, dokuYol=None, kimlik=None):
    """Bedrock .geo.json, eski 1.10.0 bicimi VE Blockbench
    .bbmodel -- ucu de ayni cizicinin agzina giriyor.

    .bbmodel'de doku dosyanin ICINDE (data: URI) durabiliyor;
    o zaman `dokuYol` gerekmiyor. Kullanici Blockbench'te
    ne cizdiyse, kaydettigi tek dosyayi buraya verip
    goruntuleyebiliyor.                                     """
    if geoYol.endswith(".bbmodel"):
        import bbmodel
        kemikler,TW,TH,gomulu=bbmodel.oku(geoYol)
        if dokuYol:
            tex=Image.open(dokuYol).convert("RGBA")
        elif gomulu:
            import io as _io
            tex=Image.open(_io.BytesIO(gomulu)).convert("RGBA")
        else:
            raise ValueError("%s icinde doku yok, dokuYol ver" % geoYol)
        return kemikler,TW,TH,tex
    d=json.load(open(geoYol))
    if "minecraft:geometry" in d:
        g=[x for x in d["minecraft:geometry"] if kimlik is None or
           x["description"]["identifier"]==kimlik][0]
        desc=g["description"]; bones=g["bones"]
        TW,TH=desc.get("texture_width",64),desc.get("texture_height",64)
    else:
        g=[v for k,v in d.items() if k!="format_version"][0]
        bones=g["bones"]; TW,TH=g.get("texturewidth",64),g.get("textureheight",64)
    return bones,TW,TH,Image.open(dokuYol).convert("RGBA")

YUZ_AD={"on":"north","arka":"south","sag":"west","sol":"east","ust":"up","alt":"down"}
ISIK={"ust":1.18,"alt":0.5,"on":1.0,"arka":0.74,"sag":0.86,"sol":0.95}

def ciz(bones,TW,TH,tex,dosya,ac,SC=10,zemin=(52,54,64),dokular=None):
    """dokular: {kemik_adi: (goruntu, TW, TH)} -- o kemik ve
    ALTINDAKILER kendi dokusundan orneklenir.

    Neden var: Bedrock'ta bir geometrinin tek dokusu olur, ama
    biz TEK sahnede iki ayri seyi birlestiriyoruz (Blockbuster
    modeli + bizim attachable'imiz) ve ikisinin dokusu ayri.
    Ikisini ayri ayri cizip ust uste bindirmek YANLIS olurdu --
    derinlik siralamasi bozulur, arkadaki on gorunur."""
    kemik={b["name"]:b for b in bones}
    def zincir(b):
        z=[]
        while b:
            z.append(b); b=kemik.get(b.get("parent"))
        return z[::-1]                      # kokten yaprağa
    dokular=dokular or {}
    def doku_bul(b):
        """Kemikten koke dogru ilk tanimli doku."""
        k=b
        while k:
            if k["name"] in dokular: return dokular[k["name"]]
            k=kemik.get(k.get("parent"))
        return (tex,TW,TH)
    def renk(uv,size,yon,tex=tex,TW=TW,TH=TH):
        olX=tex.width/float(TW); olY=tex.height/float(TH)
        if isinstance(uv,dict):
            y2=uv.get(YUZ_AD[yon])
            if not y2: return None
            x,y=y2["uv"]; w,h=y2.get("uv_size",[1,1]); w=abs(w); h=abs(h)
        else:
            u,v=uv; W,H,D=[max(1,int(round(t))) for t in size]
            k={"ust":(u+D,v,W,D),"alt":(u+D+W,v,W,D),"on":(u+D,v+D,W,H),
               "arka":(u+D+W+D,v+D,W,H),"sag":(u,v+D,D,H),"sol":(u+D+W,v+D,D,H)}
            x,y,w,h=k[yon]
        x*=olX; y*=olY; w=max(1,w*olX); h=max(1,h*olY)
        px=[]
        for j in range(int(h)):
            for i in range(int(w)):
                p=tex.getpixel((int(x+i)%tex.width,int(y+j)%tex.height))
                if p[3]>40: px.append(p)
        if not px: return None
        n=len(px)
        return (sum(p[0] for p in px)//n,sum(p[1] for p in px)//n,sum(p[2] for p in px)//n)
    ca,sa=math.cos(ac),math.sin(ac); yuzler=[]
    for b in bones:
        zin=zincir(b)
        for c in b.get("cubes",[]):
            ox,oy,oz=c["origin"]; sx,sy,sz=c["size"]; inf=c.get("inflate",0)
            ox-=inf; oy-=inf; oz-=inf; sx+=2*inf; sy+=2*inf; sz+=2*inf
            for yon,kose in [("on",[(0,0,0),(sx,0,0),(sx,sy,0),(0,sy,0)]),
                ("arka",[(0,0,sz),(sx,0,sz),(sx,sy,sz),(0,sy,sz)]),
                ("sag",[(0,0,0),(0,0,sz),(0,sy,sz),(0,sy,0)]),
                ("sol",[(sx,0,0),(sx,0,sz),(sx,sy,sz),(sx,sy,0)]),
                ("ust",[(0,sy,0),(sx,sy,0),(sx,sy,sz),(0,sy,sz)]),
                ("alt",[(0,0,0),(sx,0,0),(sx,0,sz),(0,0,sz)])]:
                pts=[]; d0=0
                for kx,ky,kz in kose:
                    p=(ox+kx,oy+ky,oz+kz)
                    if c.get("rotation"):
                        p=don(p,c["rotation"],c.get("pivot",[ox+sx/2,oy+sy/2,oz+sz/2]))
                    for kb in reversed(zin):          # yapraktan koke
                        if kb.get("rotation"):
                            p=don(p,kb["rotation"],kb.get("pivot",[0,0,0]))
                    X,Y,Z=p
                    px=X*ca-Z*sa; pz=X*sa+Z*ca
                    pts.append((px*SC,-Y*SC-pz*SC*0.30)); d0+=pz-Y*0.4
                _t,_tw,_th=doku_bul(b)
                r=renk(c.get("uv",[0,0]),c["size"],yon,_t,_tw,_th)
                if r is None: continue
                yuzler.append((d0/4,pts,tuple(min(255,int(v*ISIK[yon])) for v in r)))
    if not yuzler: return None
    yuzler.sort(key=lambda t:t[0])
    xs=[p[0] for _,pts,_ in yuzler for p in pts]; ys=[p[1] for _,pts,_ in yuzler for p in pts]
    W=int(max(xs)-min(xs))+30; H=int(max(ys)-min(ys))+30
    im=Image.new("RGB",(W,H),zemin); dr=ImageDraw.Draw(im)
    for _,pts,r in yuzler:
        dr.polygon([(p[0]-min(xs)+15,p[1]-min(ys)+15) for p in pts], fill=r)
    if dosya: im.save(dosya)
    return im
