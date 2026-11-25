"""Read generated PNG alpha bounds and write placement metadata; never edits images."""
import json
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
art=root/'public'/'art'
keys=['tee','long','knit','hoodie','shirt','raglan','sweatshirt','cardigan','jacket','leather','coat','puffer','regular-denim','straight-denim','tapered-chino','regular-slacks']

def scan(name,rows,cols=4):
    image=Image.open(art/name)
    width,height=image.size
    cells=[]
    for i in range((len(rows)-1)*cols):
        x0=round((i%cols)*width/cols);x1=round((i%cols+1)*width/cols)
        y0=rows[i//cols];y1=rows[i//cols+1]
        alpha=image.crop((x0,y0,x1,y1)).getchannel('A')
        bounds=alpha.point(lambda p:255 if p>238 else 0).getbbox()
        if not bounds:raise ValueError(f'Empty sprite {name}:{i}')
        left,top,right,bottom=bounds
        left=max(x0,x0+left-4);top=max(y0,y0+top-4)
        right=min(x1,x0+right+4);bottom=min(y1,y0+bottom+4)
        cells.append({'src':f'/art/{name}','size':[width,height],'rect':[left,top,right-left,bottom-top]})
    return cells

def face_bounds(record):
    """Find the face landmark without modifying any generated pixels."""
    im=Image.open(root/'public'/record['src'].lstrip('/'));p=im.load()
    x,y,w,h=record['rect'];skin=set()
    for yy in range(y,y+round(h*.32)):
        for xx in range(x,x+w):
            r,g,b,a=p[xx,yy]
            if a>230 and r>175 and g>100 and r-g>17 and g-b>6:skin.add((xx,yy))
    best=[]
    while skin:
        todo=[skin.pop()];component=[]
        while todo:
            xx,yy=todo.pop();component.append((xx,yy))
            for q in ((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)):
                if q in skin:skin.remove(q);todo.append(q)
        if len(component)>len(best):best=component
    if not best:raise ValueError('No face landmark in '+str(record))
    return [min(p[0] for p in best),min(p[1] for p in best),max(p[0] for p in best)+1,max(p[1] for p in best)+1]

def upper_placement(record):
    face=face_bounds(record)
    # Same face size/position for every frame. Head, neck and garment stay one piece.
    target=[213.3,39.6,257.2,90.7]
    fx0,fy0,fx1,fy1=face;s=(target[3]-target[1])/(fy1-fy0)
    x,y,w,h=record['rect']
    dx=(target[0]+target[2])/2-((fx0+fx1)/2-x)*s
    dy=target[1]-(fy0-y)*s
    record['dest']=[round(v,3) for v in [dx,dy,w*s,h*s]]
    record['includesHead']=True
    record['face']=face
    # Tint only the clothing: keep the original head and all exposed skin above it.
    # Polygons are metadata used by both the DOM and canvas renderers.
    im=Image.open(root/'public'/record['src'].lstrip('/'));pixels=im.load()
    head_end=min(h,(fy1-y)+(fy1-fy0)*.4)
    preserve=[[[0,0],[1,0],[1,head_end/h],[0,head_end/h]]]
    skin=set()
    for yy in range(round(head_end),h):
        for xx in range(w):
            r,g,b,a=pixels[x+xx,y+yy]
            if a>230 and r>175 and g>100 and r-g>28 and g-b>8:skin.add((xx,yy))
    while skin:
        todo=[skin.pop()];component=[]
        while todo:
            xx,yy=todo.pop();component.append((xx,yy))
            for q in ((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)):
                if q in skin:skin.remove(q);todo.append(q)
        if len(component)<25:continue
        lo=max(0,min(p[1] for p in component)-3);hi=min(h,max(p[1] for p in component)+4)
        left=[];right=[]
        for yy in range(lo,hi+1,2):
            band=[p[0] for p in component if abs(p[1]-yy)<=4]
            if band:
                left.append([max(0,min(band)-3)/w,yy/h]);right.append([min(w,max(band)+4)/w,yy/h])
        if len(left)>2:preserve.append(left+list(reversed(right)))
    record['preserveColor']=preserve
    return record

def opening_polygon(record):
    """Describe the baked-in light inner placeholder as runtime occlusion geometry."""
    im=Image.open(root/'public'/record['src'].lstrip('/'))
    x,y,w,h=record['rect'];pixels=im.load()
    white=set()
    for yy in range(h):
        for xx in range(round(w*.12),round(w*.9)):
            r,g,b,a=pixels[x+xx,y+yy]
            if a>235 and r>185 and g>175 and b>150 and max(r,g,b)-min(r,g,b)<75:white.add((xx,yy))
    best=[];components=[]
    while white:
        todo=[white.pop()];component=[]
        while todo:
            point=todo.pop();component.append(point);xx,yy=point
            for q in ((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)):
                if q in white:white.remove(q);todo.append(q)
        if len(component)>len(best):best=component
        if len(component)>25:components.append(component)
    if len(best)<90:return None
    bx0=min(p[0] for p in best)-w*.16;bx1=max(p[0] for p in best)+w*.16
    combined=[]
    for component in components:
        cx=sum(p[0] for p in component)/len(component);cy=sum(p[1] for p in component)/len(component)
        if component is best or bx0<cx<bx1:combined.extend(component)
    best=combined or best
    lo=min(p[1] for p in best);hi=max(p[1] for p in best)
    if hi-lo<25:return None
    left=[];right=[]
    for yy in range(lo,hi+1,max(3,round(h/30))):
        band=[p[0] for p in best if abs(p[1]-yy)<=3]
        if band:
            left.append([max(0,min(band)-1)/w,yy/h]);right.append([min(w,max(band)+1)/w,yy/h])
    return left+list(reversed(right)) if len(left)>3 else None

male=scan('doodle-male-parts-v3.png',[0,319,616,976,1312])
female=scan('doodle-female-parts-v3.png',[0,278,544,901,1247])
extra_image=Image.open(art/'doodle-extras-v3.png')
extra=scan('doodle-extras-v3.png',[0,350,690,900,extra_image.height])
catalog={'version':3,'base':{'src':'/art/doodle-base-v4.png','size':[1466,1073]},'poses':{
    'male':{'rect':[297,54,254,988],'dest':[125,10,147,574],'head':[345,58,172,174],'bodyClip':[[198,112],[249,121],[241,191],[229,274],[176,277],[187,201]],'top':[146,103,132,190],'sleeved':[145,101,133,207],'outer':[139,99,145,226],'coat':[137,100,152,337],'bottom':[139,278,112,284],'shorts':[139,278,112,145],'hat':[157,8,95,66],'scarf':[162,94,61,116],'shoeLeft':[128,546,106,38]},
    'female':{'rect':[722,52,460,1010],'dest':[72,10,259,574],'head':[916,56,222,174],'bodyClip':[[228,111],[303,120],[289,225],[245,282],[159,285],[184,210],[187,138]],'top':[154,96,176,182],'sleeved':[148,105,184,219],'outer':[143,97,194,232],'coat':[134,99,209,343],'bottom':[98,278,208,276],'shorts':[140,278,171,145],'hat':[191,-4,113,61],'scarf':[225,109,69,128],'shoeLeft':[75,531,101,51],'shoeRight':[207,538,65,51]}
},'garments':{}}
for gender,cells in [('male',male),('female',female)]:
    records=dict(zip(keys,cells))
    offset=0 if gender=='male' else 4
    for i,key in enumerate(['slacks','cargo','fleece','shorts']):records[key]=extra[offset+i]
    records['denim']=records['slacks']
    records['chino']=records['cargo']
    records['quilted']=records['jacket']
    records['thermal-top']=extra[14] if gender=='female' else records['long']
    records['thermal-bottom']=extra[15] if gender=='female' else records['regular-slacks']
    for i,key in enumerate(['sneakers','loafers','wallabee','cap','beanie','scarf']):records[key]=extra[8+i]
    for key in ('cardigan','jacket','leather','coat','puffer'):
        hole=opening_polygon(records[key])
        if hole:records[key]['opening']=hole
    catalog['garments'][gender]=records

# Female upper frames contain their own head, neck, shoulders and arms. No neck seam.
frames_image=Image.open(art/'doodle-female-upper-v4.png')
frames=scan('doodle-female-upper-v4.png',[0,316,636,951,frames_image.height])
frame_keys=['tee','long','knit','hoodie','shirt','raglan','sweatshirt','thermal-top','cardigan','jacket','leather','coat','puffer','quilted','denim-jacket','cropped-hoodie']
for key,record in zip(frame_keys,frames):
    if key=='coat':continue # Standalone coat has room for the complete hem.
    upper_placement(record)
    x,y,w,h=record['rect'];head_end=record['face'][3]+20
    record['thumbnail']={k:record[k] for k in ('src','size')}
    record['thumbnail']['rect']=[x,head_end,w,y+h-head_end]
    catalog['garments']['female'][key]=record

coat_path=art/'doodle-female-coat-v4.png'
if coat_path.exists():
    im=Image.open(coat_path);bounds=im.getchannel('A').point(lambda a:255 if a>238 else 0).getbbox()
    x,y,r,b=bounds
    record={'src':'/art/doodle-female-coat-v4.png','size':list(im.size),'rect':[max(0,x-4),max(0,y-4),min(im.width,r+4)-max(0,x-4),min(im.height,b+4)-max(0,y-4)]}
    upper_placement(record)
    catalog['garments']['female']['coat']=record

# Each foot is a complete, separately drawn sprite: never crop or duplicate a pair.
shoe_image=Image.open(art/'doodle-pose-shoes-v4.png')
shoes=scan('doodle-pose-shoes-v4.png',[0,413,826,shoe_image.height],3)
catalog['footwear']={'female':{},'male':{}}
for i,key in enumerate(['sneakers','loafers','wallabee']):
    catalog['footwear']['female'][key]=[shoes[i],shoes[i+3]]
    catalog['footwear']['male'][key]=[shoes[i+6]]
    catalog['garments']['female'][key]=shoes[i]
    catalog['garments']['male'][key]=shoes[i+6]
catalog['version']=4
(art/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Wrote art/catalog.json with',sum(len(v) for v in catalog['garments'].values()),'pose-specific sprite records')

