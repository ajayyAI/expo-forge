import type { SvgProps } from "react-native-svg";
import Svg, { ClipPath, Defs, G, Path } from "react-native-svg";

export function Style({ color, ...props }: SvgProps) {
  return (
    <Svg fill="none" height={24} viewBox="0 0 25 24" width={25} {...props}>
      <G
        clipPath="url(#style)"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.438}
      >
        <Path d="M6.94 10.125a3.188 3.188 0 1 0 0-6.375 3.188 3.188 0 0 0 0 6.375ZM17.064 10.125a3.188 3.188 0 1 0 0-6.375 3.188 3.188 0 0 0 0 6.375ZM6.94 20.25a3.188 3.188 0 1 0 0-6.375 3.188 3.188 0 0 0 0 6.375ZM17.064 20.25a3.188 3.188 0 1 0 0-6.375 3.188 3.188 0 0 0 0 6.375Z" />
      </G>
      <Defs>
        <ClipPath id="style">
          <Path d="M0 0h24v24H0z" fill="#fff" transform="translate(.002)" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}
