// app/components/DefaultText.tsx
import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";

/**
 * DefaultText: 기본 폰트를 적용한 커스텀 Text 컴포넌트
 * - TextProps를 그대로 받아서, style을 합쳐주는 방식
 */
export default function DefaultText(props: TextProps) {
  return (
    <Text {...props} style={[styles.defaultStyle, props.style]}>
      {props.children}
    </Text>
  );
}

const styles = StyleSheet.create({
  defaultStyle: {
    // 원하는 기본 폰트 지정
    fontFamily: "GmarketSansTTFLight",
    // 필요하다면 여기서 기본 색상, 크기 등을 지정할 수도 있음
    // color: "#333",
    // fontSize: 16,
  },
});
