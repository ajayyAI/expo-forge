import type { SvgProps } from "react-native-svg";
import Svg, { ClipPath, Defs, G, Path } from "react-native-svg";

import colors from "../colors";

export function Website({ color = colors.neutral[500], ...props }: SvgProps) {
  return (
    <Svg fill="none" height={24} viewBox="0 0 24 24" width={24} {...props}>
      <G
        clipPath="url(#a)"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.219}
      >
        <Path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18" />
        <Path d="M12 20.756c2.07 0 3.75-3.92 3.75-8.756S14.07 3.244 12 3.244c-2.071 0-3.75 3.92-3.75 8.756s1.679 8.756 3.75 8.756Z" />
      </G>
      <Defs>
        <ClipPath id="a">
          <Path d="M0 0h24v24H0z" fill="#fff" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}
