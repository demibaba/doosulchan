// app/index.tsx
import { Redirect } from "expo-router";

export default function Index() {
  return (
    // "as any" 또는 "as ExternalPathString"로 TS 오류 해결
    <Redirect href={"/AuthScreen" as any} />
  );
}
