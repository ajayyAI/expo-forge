import * as React from "react";
import type { OptionType } from "@/components/ui";
import { Options, useModal } from "@/components/ui";
import type { ColorSchemeType } from "@/lib/hooks/use-selected-theme";
import { useSelectedTheme } from "@/lib/hooks/use-selected-theme";
import { translate } from "@/lib/i18n";

import { SettingsItem } from "./settings-item";

export function ThemeItem() {
  const { selectedTheme, setSelectedTheme } = useSelectedTheme();
  const modal = useModal();

  const onSelect = React.useCallback(
    (option: OptionType) => {
      setSelectedTheme(option.value as ColorSchemeType);
      modal.dismiss();
    },
    [setSelectedTheme, modal]
  );

  const themes = React.useMemo(
    () => [
      { label: `${translate("settings.theme.dark")} 🌙`, value: "dark" },
      { label: `${translate("settings.theme.light")} 🌞`, value: "light" },
      { label: `${translate("settings.theme.system")} ⚙️`, value: "system" },
    ],
    []
  );

  const theme = React.useMemo(
    () => themes.find((t) => t.value === selectedTheme),
    [selectedTheme, themes]
  );

  return (
    <>
      <SettingsItem
        onPress={modal.present}
        text="settings.theme.title"
        value={theme?.label}
      />
      <Options
        onSelect={onSelect}
        options={themes}
        ref={modal.ref}
        value={theme?.value}
      />
    </>
  );
}
