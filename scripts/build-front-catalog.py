"""Read-only raster analysis; writes registration metadata, never edits PNGs."""
import json,runpy
from pathlib import Path
from PIL import Image
r=Path(__file__).resolve().parents[1];a=r/'public/art'
helpers=runpy.run_path(str(r/'scripts/build-art-catalog.py'));scan=helpers['scan']
c=json.loads((a/'catalog.json').read_text(encoding='utf-8'))
def face(rec,fraction=.43):
 im=Image.open(r/'public'/rec['src'].lstrip('/'));p=im.load();x,y,w,h=rec['rect'];pts=set()
 for yy in range(y,y+round(h*fraction)):
  for xx in range(x,x+w):
   rr,g,b,aa=p[xx,yy]
   if aa>230 and rr>175 and rr-g>28 and g-b>8:pts.add((xx,yy))
 cs=[]
 while pts:
  st=[pts.pop()];cc=[]
  while st:
   q=st.pop();cc.append(q);xx,yy=q
   for n in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
    if n in pts:pts.remove(n);st.append(n)
  if len(cc)>50:cs.append(cc)
 cc=max(cs,key=len)
 return [min(x for x,y in cc),min(y for x,y in cc),max(x for x,y in cc)+1,max(y for x,y in cc)+1]
def place(rec,gender):
 f=face(rec);x,y,w,h=rec['rect'];fx,fy,fr,fb=f;scale=(48 if gender=='male' else 54)/(fb-fy)
 rec.update(dest=[200-((fx+fr)/2-x)*scale,43-(fy-y)*scale,w*scale,h*scale],face=f,includesHead=True)
 # Preserve original head and exposed skin on recolored frames using existing analyzer.
 helpers['upper_placement'](rec)
 rec['dest']=[200-((fx+fr)/2-x)*scale,43-(fy-y)*scale,w*scale,h*scale]
 rec['face']=f
 cut=fb+round((fb-fy)*.4);rec['thumbnail']={'src':rec['src'],'size':rec['size'],'rect':[x,cut,w,y+h-cut]}
 return rec
keys=['tee','long','knit','hoodie','shirt','raglan','sweatshirt','thermal-top','cardigan','jacket','leather','coat','puffer','sleeveless','stripe-tee','linen-shirt']
for gender in ['male','female']:
 name='front-'+gender+'-upper-v6.png';im=Image.open(a/name);cells=scan(name,[0,374,737,1102,im.height])
 for key,rec in zip(keys,cells):c['garments'][gender][key]=place(rec,gender)
 c['garments'][gender]['quilted']=c['garments'][gender]['jacket']
 pose=c['poses'][gender];pose.update(bottom=[141,264,122,266],shorts=[141,264,122,124],bodyClip=[[153,100 if gender=='male' else 114],[252,100 if gender=='male' else 114],[254,280],[145,280]],shoeLeft=[138,508,62,47],shoeRight=[203,508,62,47],hat=[145,0,110,65],scarf=[175,100,67,125])
base=Image.open(a/'front-base-v6.png');c['base']={'src':'/art/front-base-v6.png','size':list(base.size)}
for gender,box in [('male',[320,20,290,985]),('female',[925,40,280,965])]:
 rec={'src':c['base']['src'],'size':c['base']['size'],'rect':box};f=face(rec);fx,fy,fr,fb=f;scale=(48 if gender=='male' else 54)/(fb-fy);x,y,w,h=box
 pose=c['poses'][gender];pose['rect']=box;pose['dest']=[200-((fx+fr)/2-x)*scale,43-(fy-y)*scale,w*scale,h*scale];pose['head']=[x,y,w,max(1,fb-y+20)]
lower=scan('front-lower-v6.png',[0,270,541,832,1024])
for gender,offset in [('male',0),('female',4)]:
 for i,key in enumerate(['regular-denim','straight-denim','tapered-chino','regular-slacks']):c['garments'][gender][key]=lower[offset+i]
 for key,i in [('slacks',8 if gender=='male' else 10),('fleece',9 if gender=='male' else 11),('shorts',15)]:c['garments'][gender][key]=lower[i]
 c['garments'][gender]['cargo']=c['garments'][gender]['slacks'];c['garments'][gender]['denim']=c['garments'][gender]['slacks'];c['garments'][gender]['chino']=c['garments'][gender]['tapered-chino'];c['garments'][gender]['thermal-bottom']=c['garments'][gender]['regular-slacks']
 for key,i in [('sneakers',12),('loafers',13),('wallabee',14)]:
  rec=lower[i];x,y,w,h=rec['rect'];half=w//2
  c['footwear'][gender][key]=[{**rec,'rect':[x,y,half,h]},{**rec,'rect':[x+half,y,w-half,h]}];c['garments'][gender][key]=rec
faces=scan('front-faces-v6.png',[0,512,1024],3);c['expressions']={}
for gender,offset in [('male',0),('female',3)]:
 c['expressions'][gender]={}
 for mood,i in [('good',0),('hot',1),('cold',2)]:
  rec=faces[offset+i];fx,fy,fr,fb=face(rec,1);x,y,w,h=rec['rect'];scale=(48 if gender=='male' else 54)/(fb-fy);rec['dest']=[(208 if gender=='male' else 213)-((fx+fr)/2-x)*scale,43-(fy-y)*scale,w*scale,h*scale]
  c['expressions'][gender][mood]=rec
hood_image=Image.open(a/'front-hoods-v6.png')
hoods=scan('front-hoods-v6.png',[0,hood_image.height],2)
c['hoods']={'male':hoods[0],'female':hoods[1]}
for gender in ['male','female']:
 for rec in c['garments'][gender].values():
  if not rec.get('includesHead'):continue
  im=Image.open(r/'public'/rec['src'].lstrip('/'));px=im.load();x,y,w,h=rec['rect'];bottom=y
  for yy in range(y+round(h*.4),y+h):
   for xx in range(x+round(w*.28),x+round(w*.72)):
    rr,g,b,aa=px[xx,yy]
    if aa>230 and not (rr>175 and rr-g>28 and g-b>8):bottom=max(bottom,yy)
  rec['hem']=rec['dest'][1]+(bottom-y)/h*rec['dest'][3]
tail_image=Image.open(a/'coat-lower-v7.png')
tails=scan('coat-lower-v7.png',[0,tail_image.height],2)
c['coatTails']={'male':tails[0],'female':tails[1]}
c['version']=7
(a/'catalog-front.json').write_text(json.dumps(c,ensure_ascii=False,indent=2),encoding='utf-8')
print('Wrote front pose catalog')
