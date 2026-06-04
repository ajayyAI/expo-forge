import { translate } from "@/lib/i18n";
import { LegalScreen } from "./legal-screen";

export function TermsScreen() {
  return (
    <LegalScreen
      body={[
        translate("legal.terms.intro"),
        translate("legal.terms.use"),
        translate("legal.terms.liability"),
        translate("legal.terms.contact"),
      ]}
      testID="terms-screen"
      title="legal.terms.title"
    />
  );
}
