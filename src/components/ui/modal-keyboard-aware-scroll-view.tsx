import type { BottomSheetScrollViewMethods } from "@gorhom/bottom-sheet";
// source https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-aware-scroll-view
/**
 * Keyboard-aware ScrollView for use inside a `Modal`, wiring
 * `react-native-keyboard-controller`'s `KeyboardAwareScrollView` into
 * `@gorhom/bottom-sheet`'s scrollable contract.
 *
 *     <Modal>
 *       <BottomSheetKeyboardAwareScrollView>...</BottomSheetKeyboardAwareScrollView>
 *     </Modal>
 */
import {
  createBottomSheetScrollableComponent,
  SCROLLABLE_TYPE,
} from "@gorhom/bottom-sheet";
import type { BottomSheetScrollViewProps } from "@gorhom/bottom-sheet/src/components/bottomSheetScrollable/types";
import { memo } from "react";
import type { KeyboardAwareScrollViewProps } from "react-native-keyboard-controller";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Reanimated from "react-native-reanimated";

// Reanimated 4 changed `createAnimatedComponent`'s overloads: passing an
// explicit type argument selects the FlatList overload, which no longer matches
// a ForwardRefExoticComponent. Let TS infer the instance type from the
// component so the general overload applies.
const AnimatedScrollView = Reanimated.createAnimatedComponent(
  KeyboardAwareScrollView
);
const BottomSheetScrollViewComponent = createBottomSheetScrollableComponent<
  BottomSheetScrollViewMethods,
  BottomSheetScrollViewProps
>(SCROLLABLE_TYPE.SCROLLVIEW, AnimatedScrollView);
const BottomSheetKeyboardAwareScrollView = memo(BottomSheetScrollViewComponent);

BottomSheetKeyboardAwareScrollView.displayName =
  "BottomSheetKeyboardAwareScrollView";

export default BottomSheetKeyboardAwareScrollView as (
  props: BottomSheetScrollViewProps & KeyboardAwareScrollViewProps
) => ReturnType<typeof BottomSheetKeyboardAwareScrollView>;
