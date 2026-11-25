from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src'/'main.js'
s=p.read_text(encoding='utf-8')
for start,end in [('function renderLegacy()','function render()'),('function homePage()','function hourlySection('),('function calibrationFormLegacy(','function calibrationForm(')]:
    if start in s:
        a=s.index(start);b=s.index(end,a+len(start));s=s[:a]+s[b:]
s=s.replace("character(worn,draft.gender,'good','calibration')","character({...worn,peekTop,peekBottom},draft.gender,'good','calibration')")
p.write_text(s,encoding='utf-8')
print('Removed obsolete renderers and single-garment calibration form')
