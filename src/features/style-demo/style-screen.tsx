import {
  FocusAwareStatusBar,
  SafeAreaView,
  ScreenContainer,
  ScrollView,
} from "@/components/ui";
import { ANDROID_TAB_BAR_INSET } from "@/lib/tab-bar";
import { Buttons } from "./components/buttons-demo";
import { Colors } from "./components/colors-demo";
import { Inputs } from "./components/inputs-demo";
import { NativePolish } from "./components/native-polish-demo";
import { Typography } from "./components/typography-demo";

export function StyleScreen() {
  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        className="px-4"
        contentContainerStyle={{ paddingBottom: ANDROID_TAB_BAR_INSET }}
      >
        <SafeAreaView className="flex-1">
          <ScreenContainer>
            <Typography />
            <Colors />
            <Buttons />
            <NativePolish />
            <Inputs />
          </ScreenContainer>
        </SafeAreaView>
      </ScrollView>
    </>
  );
}
