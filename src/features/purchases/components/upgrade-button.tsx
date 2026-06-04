import { Button } from "@/components/ui";
import { translate } from "@/lib/i18n";

interface Props {
  loading?: boolean;
  onPress: () => void;
}

export function UpgradeButton({ loading, onPress }: Props) {
  return (
    <Button
      label={translate("purchases.upgrade")}
      loading={loading}
      onPress={onPress}
      size="lg"
      testID="paywall-upgrade"
    />
  );
}
