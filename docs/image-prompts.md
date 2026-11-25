# AI 이미지 에셋 제작 기록

내장 `image_gen.imagegen` 사용. API/CLI 폴백 및 사용자 API 키는 사용하지 않았습니다. 모두 실제 알파 채널이 있는 PNG이며 원본 알파를 유지했습니다. 이미지 편집 스크립트로 옷을 그리거나 수정하지 않았습니다. 웹앱은 스프라이트의 영역을 잘라 그리는 일반적인 게임 렌더링으로 이를 조합합니다.

## 1. 기본 파츠 아틀라스

저장: `public/art/wardrobe-atlas-v1.png` (1254 × 1254).

생성 프롬프트 브리프:

> Production transparent sprite atlas for a mobile fashion paper-doll dress-up app. Exactly 4 columns by 4 rows, sixteen equal cells, no borders, labels, text or logos. Sophisticated hand-painted gouache and colored-pencil editorial fashion illustration, charming young Korean adults, seven-head-tall proportions, natural textured fabrics, contemporary Korean/Japanese streetwear, relaxed oversize silhouettes and wide-leg pants. Not SVG, vector, chibi or photorealistic. All parts use a front-facing standing pose. Row 1: male base in fitted offwhite tee and gray shorts; female base with dark bob in the same outfit; ivory long-sleeve tee; burgundy oversized hoodie. Row 2: oatmeal wool sweater; checked oxford shirt; open sage work jacket; open charcoal leather blouson. Row 3: open cobalt puffer; open ochre quilted jacket; wide indigo jeans; charcoal wide pleated slacks. Row 4: khaki wide cargo trousers; ivory low-top sneakers; black loafers; rust ribbed beanie. No skin or mannequin in clothing cells. Genuine alpha transparency.

생성 결과가 요청한 기준 좌표와 완전히 일치하지 않아, 실제 파츠 영역을 확인하고 앱의 파츠별 배치 좌표에서 보정했습니다.

## 2. 表情・追加パーツ

저장: `public/art/wardrobe-extras-v1.png` (1254 × 1254). 첫 번째 아틀라스를 스타일·인물 참고로 사용했습니다.

생성 프롬프트 브리프:

> Additional matching transparent 4 × 4 game asset sheet, preserve textured gouache and colored-pencil editorial style and the same young Korean identities. Replace content with supplementary parts. Row 1: ivory short-sleeve tee; gray/burgundy raglan longsleeve; open camel wool overcoat; indigo loose denim shorts. Row 2: burgundy baseball cap; rust long wool scarf; brown suede wallabee shoes; white pinstriped layering shirt hem. Row 3: male head smiling; same head cold/worried with pink nose; same head hot with sweat bead; olive beanie. Row 4: female bob head smiling; same head cold/worried; same head hot; charcoal/purple lowtop sneakers. Head and neck only, no torso. Front-facing, same silhouette for each expression, separated cells, no text/logos, real alpha transparency.

## 3. 소재와 실루엣 구분 보강

저장: `public/art/wardrobe-details-v1.png` (1254 × 1254). 첫 번째 아틀라스를 스타일 참고로 사용했습니다.

사용한 프롬프트:

> Use case: compositing. Additional transparent sprite sheet matching exactly the textured gouache colored pencil fashion illustration style of the reference. Exactly 2x2 equal square grid on 1024x1024 transparent canvas. Four separate garments, no mannequin no skin no body no head no feet no text no labels no grid. Row1 left: warm taupe V-neck buttoned knit cardigan, worn OPEN so center is fully transparent, slightly oversize with LONG relaxed sleeves hanging almost straight down at10degree angle, not arms spread, detailed wool rib texture. Row1 right: charcoal gray oversized crewneck cotton sweatshirt, relaxed long sleeves hanging nearly straight down at10degree angle, rib cuffs neck hem, shorter cropped boxy body. Row2 left: olive gray wide leg fleece-lined sweatpants, straight symmetrical front facing pose, fitted elastic waistband, wide open hems NOT ankle cuffs, soft brushed cotton fabric, two distinct legs. Row2 right: sand beige wide leg chino trousers, front pleats, straight two separate wide legs front facing, fitted waistband beltloops, cotton twill texture, no shoes. All fully inside their own cell separated by transparent margin. Preserve the handpainted realistically textured editorial fashion illustration look. NOT vector, not SVG. no logos no scenery. Actual alpha transparency.

## 화면 보정

생성 결과는 완벽한 1:1 인체 규격을 따르지 않아, `src/paper-doll.js`에서 각 파츠의 목·허리·소매·발 위치를 조절했습니다. 코트와 짧은 재킷의 손 위치도 별도로 조정했습니다. 보이지 않는 발열 이너는 강제로 그림에 겹치지 않고 겹수 안내에서 표시합니다. 이미지 품질 개선은 프롬프트로 추가 파츠를 생성하는 방식으로 수행했습니다.

## 2026-11-25: 정면 구도와 표정 교체

내장 imagegen 사용. 새 참고 구도는 `public/art/front-pose-study-v5.png`. 실제 사용 에셋은 `front-base-v6.png`, `front-male-upper-v6.png`, `front-female-upper-v6.png`, `front-lower-v6.png`, `front-faces-v6.png`입니다. 배치 메타데이터는 `catalog-front.json`, 재현 가능한 분석은 `scripts/build-front-catalog.py`입니다. 분석 스크립트는 PNG를 수정하지 않습니다.

프롬프트 세트: reference의 짧게 삐친 남성 머리와 여성 단발, 편안한 거의 정면 자세, 거친 펜 낙서와 차분한 색을 유지. 상체는 성별 4×4 아틀라스로 머리·목·팔·의류를 같은 구도에 등록. 반소매·긴소매·니트·후디·셔츠·래글런·스웨트·발열 이너·열린 카디건·워크 재킷·레더·코트·패딩·민소매·스트라이프·리넨 반소매. 열린 외투 앞은 투명. 하체는 성별 레귤러/스트레이트 데님·테이퍼드 치노·슬랙스, 와이드/기모, 전면을 보는 서로 다른 양쪽 신발, 버뮤다 쇼츠. 표정은 3×2 머리 전체(편안함/더움/추움), 같은 머리 윤곽과 크기, 표정만 변경. 실제 알파 채널, 여백, 잘림/텍스트/배경 없음 요청.

얼굴 조각을 덮는 시안은 제외했고, 머리 전체를 교체합니다. 목 아래에는 의류 프레임을 유지합니다. 입김·떨림선·땀방울은 HTML/CSS 효과이며 동작 줄이기 설정을 존중합니다.
