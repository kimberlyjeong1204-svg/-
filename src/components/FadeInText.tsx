import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type TextStyle } from 'react-native';

/** 나타날 때 천천히 밝아지는 글자. 내용이 바뀔 때마다 key를 바꿔 다시 나타나게 합니다. */
export function FadeInText({ children, style, duration = 900 }: { children: string; style?: StyleProp<TextStyle>; duration?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }).start();
  }, [opacity, duration]);
  return (
    <Animated.Text accessibilityLiveRegion="polite" style={[style, { opacity }]}>
      {children}
    </Animated.Text>
  );
}
