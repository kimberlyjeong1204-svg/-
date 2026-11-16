#!/usr/bin/env bash
# 고운바탕(로고·슬로건 전용) 글꼴에서 실제로 쓰는 글자만 남깁니다.
# 로고나 슬로건 문구를 바꾸면 TEXT를 고친 뒤 다시 실행하세요.
#   준비: pip install fonttools
#   실행: bash scripts/subset-display-font.sh <원본 GowunBatang-Regular.ttf> <원본 GowunBatang-Bold.ttf>
#   원본 글꼴: Google Fonts의 Gowun Batang (또는 npm 패키지 @expo-google-fonts/gowun-batang)
set -euo pipefail
TEXT='쉼표. 몰입하는 일상에, 잠깐의 여유.'
OUT=assets/fonts
for pair in "$1:GowunBatang-Regular-subset.ttf" "$2:GowunBatang-Bold-subset.ttf"; do
  src="${pair%%:*}"; dst="${pair##*:}"
  pyftsubset "$src" --text="$TEXT" --layout-features='*' --name-IDs='*' --name-languages='*' \
    --notdef-outline --glyph-names --output-file="$OUT/$dst"
  echo "$dst: $(wc -c < "$OUT/$dst") bytes"
done
