import type { SvgProps } from "react-native-svg";
import Svg, { Path } from "react-native-svg";

export function CaretDown({ ...props }: SvgProps) {
  return (
    <Svg
      fill="none"
      height={13}
      width={12}
      {...props}
      className="stroke-black dark:stroke-white"
    >
      <Path
        d="M9.75 4.744 6 8.494l-3.75-3.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </Svg>
  );
}
