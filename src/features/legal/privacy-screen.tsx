import { translate } from "@/lib/i18n";
import { LegalScreen } from "./legal-screen";

export function PrivacyScreen() {
  return (
    <LegalScreen
      body={[
        translate("legal.privacy.intro"),
        translate("legal.privacy.collect"),
        translate("legal.privacy.use"),
        translate("legal.privacy.contact"),
      ]}
      testID="privacy-screen"
      title="legal.privacy.title"
    />
  );
}
