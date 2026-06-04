import { View } from "react-native";

import { Skeleton } from "./skeleton";

interface Props {
  count?: number;
  testID?: string;
}

export function SkeletonList({ count = 6, testID }: Props) {
  const rows = Array.from({ length: count }, (_, index) => `row-${index}`);
  return (
    <View>
      {rows.map((id, index) => (
        <View
          className="flex-row items-center gap-3 px-4 py-3"
          key={id}
          testID={testID ? `${testID}-row-${index}` : undefined}
        >
          <Skeleton className="rounded-full" height={40} width={40} />
          <View className="flex-1 gap-2">
            <Skeleton height={14} width="60%" />
            <Skeleton height={12} width="40%" />
          </View>
        </View>
      ))}
    </View>
  );
}
