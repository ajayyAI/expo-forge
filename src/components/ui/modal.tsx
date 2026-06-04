/**
 * Modal
 * Dependencies:
 * - @gorhom/bottom-sheet.
 *
 * Props:
 * - All `BottomSheetModalProps` props.
 * - `title` (string | undefined): Optional title for the modal header.
 *
 * Usage Example:
 * import { Modal, useModal } from '@gorhom/bottom-sheet';
 *
 * function DisplayModal() {
 *   const { ref, present, dismiss } = useModal();
 *
 *   return (
 *     <View>
 *       <Modal
 *         snapPoints={['60%']} // optional
 *         title="Modal Title"
 *         ref={ref}
 *       >
 *         Modal Content
 *       </Modal>
 *     </View>
 *   );
 * }
 *
 */

import type {
  BottomSheetBackdropProps,
  BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import { BottomSheetModal, useBottomSheet } from "@gorhom/bottom-sheet";
import * as React from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Path, Svg } from "react-native-svg";
import { useUniwind } from "uniwind";

import colors from "@/components/ui/colors";
import { Text } from "./text";

/** Rounded top corners + themed background, merged under any caller override. */
const SHEET_CORNER_RADIUS = 24;

type ModalProps = BottomSheetModalProps & {
  title?: string;
};

type ModalRef = React.ForwardedRef<BottomSheetModal>;

interface ModalHeaderProps {
  title?: string;
  dismiss: () => void;
}

export function useModal() {
  const ref = React.useRef<BottomSheetModal>(null);
  // biome-ignore lint/suspicious/noExplicitAny: BottomSheetModal.present accepts arbitrary per-call payload data; `any` keeps useModal generic across every modal's data shape.
  const present = React.useCallback((data?: any) => {
    ref.current?.present(data);
  }, []);
  const dismiss = React.useCallback(() => {
    ref.current?.dismiss();
  }, []);
  return { ref, present, dismiss };
}

export function Modal({
  ref,
  snapPoints: _snapPoints = ["60%"] as (string | number)[],
  title,
  detached = false,
  ...props
}: ModalProps & { ref?: ModalRef }) {
  const detachedProps = React.useMemo(
    () => getDetachedProps(detached),
    [detached]
  );
  const modal = useModal();
  const snapPoints = React.useMemo(() => _snapPoints, [_snapPoints]);
  const { theme } = useUniwind();
  const isDark = theme === "dark";

  // gorhom's default sheet background has square corners; round the top and
  // theme it. A caller's `backgroundStyle` is layered on top, so an explicit
  // background color still wins while keeping the rounded corners.
  const backgroundStyle = React.useMemo(
    () => [
      {
        backgroundColor: isDark ? colors.charcoal[850] : colors.white,
        borderTopLeftRadius: SHEET_CORNER_RADIUS,
        borderTopRightRadius: SHEET_CORNER_RADIUS,
      },
      props.backgroundStyle,
    ],
    [isDark, props.backgroundStyle]
  );

  React.useImperativeHandle(
    ref,
    () => (modal.ref.current as BottomSheetModal) || null
  );

  const renderHandleComponent = React.useCallback(
    () => (
      <>
        <View className="mt-3 mb-5 h-1.5 w-10 self-center rounded-full bg-neutral-300 dark:bg-neutral-600" />
        <ModalHeader dismiss={modal.dismiss} title={title} />
      </>
    ),
    [title, modal.dismiss]
  );

  return (
    <BottomSheetModal
      {...props}
      {...detachedProps}
      backdropComponent={props.backdropComponent || renderBackdrop}
      backgroundStyle={backgroundStyle}
      enableDynamicSizing={false}
      handleComponent={renderHandleComponent}
      index={0}
      ref={modal.ref}
      snapPoints={snapPoints}
    />
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CustomBackdrop({ style }: BottomSheetBackdropProps) {
  const { close } = useBottomSheet();
  return (
    <AnimatedPressable
      entering={FadeIn.duration(50)}
      exiting={FadeOut.duration(20)}
      onPress={() => close()}
      style={[style, { backgroundColor: "rgba(0, 0, 0, 0.5)" }]}
    />
  );
}

export function renderBackdrop(props: BottomSheetBackdropProps) {
  return <CustomBackdrop {...props} />;
}

/**
 * A detached modal floats with horizontal margins and a bottom inset rather
 * than anchoring to the screen edge; these are the extra props that achieve it.
 */
function getDetachedProps(detached: boolean) {
  if (detached) {
    return {
      detached: true,
      bottomInset: 46,
      style: { marginHorizontal: 16, overflow: "hidden" },
    } as Partial<BottomSheetModalProps>;
  }
  return {} as Partial<BottomSheetModalProps>;
}

const ModalHeader = React.memo(({ title, dismiss }: ModalHeaderProps) => {
  return (
    <>
      {title && (
        <View className="flex-row px-2 py-4">
          <View className="size-6" />
          <View className="flex-1">
            <Text className="text-center font-bold text-[16px] text-neutral-800 dark:text-white">
              {title}
            </Text>
          </View>
        </View>
      )}
      <CloseButton close={dismiss} />
    </>
  );
});

function CloseButton({ close }: { close: () => void }) {
  return (
    <Pressable
      accessibilityHint="closes the modal"
      accessibilityLabel="close modal"
      accessibilityRole="button"
      className="absolute top-3 right-3 size-6 items-center justify-center"
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      onPress={close}
    >
      <Svg
        className="fill-neutral-300 dark:fill-white"
        fill="none"
        height={24}
        viewBox="0 0 24 24"
        width={24}
      >
        <Path d="M18.707 6.707a1 1 0 0 0-1.414-1.414L12 10.586 6.707 5.293a1 1 0 0 0-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 1 0 1.414 1.414L12 13.414l5.293 5.293a1 1 0 0 0 1.414-1.414L13.414 12l5.293-5.293Z" />
      </Svg>
    </Pressable>
  );
}
