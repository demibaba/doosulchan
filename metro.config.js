// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // 1) svg-transformer 설정
  config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");

  // 2) 기본 assetExts에서 "svg" 제거
  config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");

  // 3) sourceExts에 "svg" 추가
  config.resolver.sourceExts.push("svg");

  return config;
})();
