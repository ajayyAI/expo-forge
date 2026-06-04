import { Button as HeroButton } from "heroui-native";
import { Button, View } from "@/components/ui";

import { Title } from "./title";

export function Buttons() {
  return (
    <>
      <Title text="Buttons" />
      {/* HeroUI Native buttons — the default component layer, on Uniwind. */}
      <View className="gap-3 pb-2">
        <HeroButton onPress={() => undefined} variant="primary">
          <HeroButton.Label>HeroUI Primary</HeroButton.Label>
        </HeroButton>
        <View className="flex-row gap-3">
          <HeroButton size="sm" variant="secondary">
            <HeroButton.Label>Secondary</HeroButton.Label>
          </HeroButton>
          <HeroButton size="sm" variant="danger">
            <HeroButton.Label>Danger</HeroButton.Label>
          </HeroButton>
        </View>
      </View>
      {/* The base UI primitives still coexist below. */}
      <View>
        <View className="flex-row flex-wrap">
          <Button className="mr-2" label="small" size="sm" />
          <Button
            className="mr-2 min-w-[60px]"
            label="small"
            loading
            size="sm"
          />
          <Button
            className="mr-2"
            label="small"
            size="sm"
            variant="secondary"
          />
          <Button className="mr-2" label="small" size="sm" variant="outline" />
          <Button
            className="mr-2"
            label="small"
            size="sm"
            variant="destructive"
          />
          <Button className="mr-2" label="small" size="sm" variant="ghost" />
          <Button className="mr-2" disabled label="small" size="sm" />
        </View>
        <Button label="Default Button" />
        <Button label="Secondary Button" variant="secondary" />
        <Button label="Outline Button" variant="outline" />
        <Button label="Destructive Button" variant="destructive" />
        <Button label="Ghost Button" variant="ghost" />
        <Button label="Button" loading={true} />
        <Button label="Button" loading={true} variant="outline" />
        <Button disabled label="Default Button Disabled" />
        <Button
          disabled
          label="Secondary Button Disabled"
          variant="secondary"
        />
      </View>
    </>
  );
}
