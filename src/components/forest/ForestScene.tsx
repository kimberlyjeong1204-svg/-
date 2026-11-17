import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { FOREST_IMAGE, coverView, forestImages } from './forestConfig';

/**
 * 숲속 휴식 공간 (iOS 앱)
 * 지금은 같은 숲 그림을 같은 구도로 보여 주기만 합니다.
 * 움직임(잎·별·반딧불이)은 웹앱(ForestScene.web.tsx)에 먼저 넣었고, iOS 앱에는 이후 단계에서 연결합니다.
 */
export function ForestScene(_props: { reduceMotion: boolean }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const v = coverView(size.w, size.h);
  // 보여 줄 영역(v)이 화면을 꽉 채우도록 그림 크기와 위치를 계산
  const imgW = size.w / v.sx;
  const imgH = imgW * (FOREST_IMAGE.height / FOREST_IMAGE.width);
  return (
    <View
      style={styles.box}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.w > 0 && (
        <Image
          source={forestImages.background}
          style={{ position: 'absolute', width: imgW, height: imgH, left: -v.ox * imgW, top: -v.oy * imgH }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { ...StyleSheet.absoluteFill, backgroundColor: '#0B1A1E', overflow: 'hidden' },
});
