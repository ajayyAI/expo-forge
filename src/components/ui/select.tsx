import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import * as React from "react";
import type { PressableProps } from "react-native";
import { Platform, Pressable, View } from "react-native";
import type { SvgProps } from "react-native-svg";
import Svg, { Path } from "react-native-svg";
import { tv } from "tailwind-variants";

import { useUniwind } from "uniwind";
import colors from "@/components/ui/colors";

import { CaretDown } from "@/components/ui/icons";
import { Modal, useModal } from "./modal";
import { Text } from "./text";

const selectTv = tv({
  slots: {
    container: "mb-4",
    label: "mb-1 text-grey-100 text-lg dark:text-neutral-100",
    input:
      "mt-0 flex-row items-center justify-center rounded-xl border-[0.5px] border-grey-50 p-3 dark:border-neutral-500 dark:bg-neutral-800",
    inputValue: "dark:text-neutral-100",
  },

  variants: {
    focused: {
      true: {
        input: "border-neutral-600",
      },
    },
    error: {
      true: {
        input: "border-danger-600",
        label: "text-danger-600 dark:text-danger-600",
        inputValue: "text-danger-600",
      },
    },
    disabled: {
      true: {
        input: "bg-neutral-200",
      },
    },
  },
  defaultVariants: {
    error: false,
    disabled: false,
  },
});

const List = Platform.OS === "web" ? FlashList : BottomSheetFlatList;

export interface OptionType {
  label: string;
  value: string | number;
}

interface OptionsProps {
  options: OptionType[];
  onSelect: (option: OptionType) => void;
  value?: string | number;
  testID?: string;
}

function keyExtractor(item: OptionType) {
  return `select-item-${item.value}`;
}

export function Options({
  ref,
  options,
  onSelect,
  value,
  testID,
}: OptionsProps & { ref?: React.RefObject<BottomSheetModal | null> }) {
  const height = options.length * 70 + 100;
  const snapPoints = React.useMemo(() => [height], [height]);
  const { theme } = useUniwind();
  const isDark = theme === "dark";

  const renderSelectItem = React.useCallback(
    ({ item }: { item: OptionType }) => (
      <Option
        key={`select-item-${item.value}`}
        label={item.label}
        onPress={() => onSelect(item)}
        selected={value === item.value}
        testID={testID ? `${testID}-item-${item.value}` : undefined}
      />
    ),
    [onSelect, value, testID]
  );

  return (
    <Modal
      backgroundStyle={{
        backgroundColor: isDark ? colors.neutral[800] : colors.white,
      }}
      index={0}
      ref={ref}
      snapPoints={snapPoints}
    >
      <List
        data={options}
        keyExtractor={keyExtractor}
        renderItem={renderSelectItem}
        testID={testID ? `${testID}-modal` : undefined}
      />
    </Modal>
  );
}

const Option = React.memo(
  ({
    label,
    selected = false,
    ...props
  }: PressableProps & {
    selected?: boolean;
    label: string;
  }) => {
    return (
      <Pressable
        className="min-h-12 flex-row items-center border-neutral-300 border-b bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800"
        {...props}
      >
        <Text className="flex-1 dark:text-neutral-100">{label}</Text>
        {selected && <Check />}
      </Pressable>
    );
  }
);

export interface SelectProps {
  value?: string | number;
  label?: string;
  disabled?: boolean;
  error?: string;
  options?: OptionType[];
  onSelect?: (value: string | number) => void;
  placeholder?: string;
  testID?: string;
}

export function Select(props: SelectProps) {
  const {
    label,
    value,
    error,
    options = [],
    placeholder = "select...",
    disabled = false,
    onSelect,
    testID,
  } = props;
  const modal = useModal();

  const onSelectOption = React.useCallback(
    (option: OptionType) => {
      onSelect?.(option.value);
      modal.dismiss();
    },
    [modal, onSelect]
  );

  const styles = React.useMemo(
    () =>
      selectTv({
        error: Boolean(error),
        disabled,
      }),
    [error, disabled]
  );

  const textValue = React.useMemo(
    () =>
      value === undefined
        ? placeholder
        : (options?.filter((t) => t.value === value)?.[0]?.label ??
          placeholder),
    [value, options, placeholder]
  );

  return (
    <>
      <View className={styles.container()}>
        {label && (
          <Text
            className={styles.label()}
            testID={testID ? `${testID}-label` : undefined}
          >
            {label}
          </Text>
        )}
        <Pressable
          className={styles.input()}
          disabled={disabled}
          onPress={modal.present}
          testID={testID ? `${testID}-trigger` : undefined}
        >
          <View className="flex-1">
            <Text className={styles.inputValue()}>{textValue}</Text>
          </View>
          <CaretDown />
        </Pressable>
        {error && (
          <Text
            className="text-danger-300 text-sm dark:text-danger-600"
            testID={`${testID}-error`}
          >
            {error}
          </Text>
        )}
      </View>
      <Options
        onSelect={onSelectOption}
        options={options}
        ref={modal.ref}
        testID={testID}
      />
    </>
  );
}

function Check({ ...props }: SvgProps) {
  return (
    <Svg
      fill="none"
      height={24}
      viewBox="0 0 25 24"
      width={25}
      {...props}
      className="stroke-black dark:stroke-white"
    >
      <Path
        d="m20.256 6.75-10.5 10.5L4.506 12"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.438}
      />
    </Svg>
  );
}
