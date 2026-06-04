import * as React from "react";
import type { OptionType } from "@/components/ui";
import { Checkbox, Input, Radio, Select, Switch, View } from "@/components/ui";

import { Title } from "./title";

const options: OptionType[] = [
  { value: "chocolate", label: "Chocolate" },
  { value: "strawberry", label: "Strawberry" },
  { value: "vanilla", label: "Vanilla" },
];

export function Inputs() {
  const [value, setValue] = React.useState<string | number | undefined>();
  return (
    <>
      <Title text="Form" />
      <View>
        <Input label="Default" placeholder="Lorem ipsum dolor sit amet" />
        <Input error="This is a message error" label="Error" />
        <Input label="Focused" />
        <Select
          label="Select"
          onSelect={(option) => setValue(option)}
          options={options}
          value={value}
        />
        <CheckboxExample />
        <RadioExample />
        <SwitchExample />
      </View>
    </>
  );
}

function CheckboxExample() {
  const [checked, setChecked] = React.useState(false);
  return (
    <Checkbox.Root
      accessibilityLabel="accept terms of condition"
      checked={checked}
      className="pb-2"
      onChange={setChecked}
    >
      <Checkbox.Icon checked={checked} />
      <Checkbox.Label text="checkbox" />
    </Checkbox.Root>
  );
}

function RadioExample() {
  const [selected, setSelected] = React.useState(false);
  return (
    <Radio.Root
      accessibilityLabel="radio button"
      checked={selected}
      className="pb-2"
      onChange={setSelected}
    >
      <Radio.Icon checked={selected} />
      <Radio.Label text="radio button" />
    </Radio.Root>
  );
}

function SwitchExample() {
  const [active, setActive] = React.useState(false);
  return (
    <Switch
      accessibilityLabel="switch"
      className="pb-2"
      label="switch"
      onValueChange={setActive}
      value={active}
    />
  );
}
