import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as z from "zod";

import { Button, Input, Text, View } from "@/components/ui";
import { getFieldError, zodValidator } from "@/components/ui/form-utils";
import { translate } from "@/lib/i18n";

/** Matches the backend `validateBio` limit in convex/validators.ts. */
const BIO_MAX_LENGTH = 500;

const schema = z.object({
  name: z.string().min(1, translate("auth.errors.name_required")),
  bio: z.string().max(BIO_MAX_LENGTH, translate("profile.errors.bio_too_long")),
});

export type ProfileValues = z.infer<typeof schema>;

/** An inline error message to display, or nothing on success. */
type SubmitResult = string | undefined | Promise<string | undefined>;

export interface ProfileFormProps {
  /** Current persisted values; also the baseline for change detection. */
  initialValues: ProfileValues;
  /** Read-only, shown but not editable in this task. */
  email: string;
  /** Persist the changed fields. Return an error message to show it inline. */
  onSubmit: (values: ProfileValues) => SubmitResult;
}

export function ProfileForm({
  initialValues,
  email,
  onSubmit,
}: ProfileFormProps) {
  const [formError, setFormError] = useState<string | undefined>();
  const [savedAt, setSavedAt] = useState<number | undefined>();

  const form = useForm({
    defaultValues: initialValues,
    validators: { onChange: zodValidator(schema) },
    onSubmit: async ({ value }) => {
      setFormError(undefined);
      setSavedAt(undefined);
      const message = await onSubmit({
        name: value.name.trim(),
        bio: value.bio.trim(),
      });
      if (message) {
        setFormError(message);
        return;
      }
      setSavedAt(Date.now());
    },
  });

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={10}
      style={{ flex: 1 }}
    >
      <View className="p-4">
        {formError ? (
          <Text
            className="mb-2 text-center text-danger-600"
            testID="form-error"
          >
            {formError}
          </Text>
        ) : null}

        <form.Field
          children={(field) => (
            <Input
              autoCapitalize="words"
              autoComplete="name"
              error={getFieldError(field)}
              label={translate("auth.name_label")}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              testID="name-input"
              value={field.state.value}
            />
          )}
          name="name"
        />

        <Input
          editable={false}
          label={translate("auth.email_label")}
          testID="email-input"
          value={email}
        />

        <form.Field
          children={(field) => (
            <Input
              error={getFieldError(field)}
              label={translate("profile.bio_label")}
              multiline={true}
              numberOfLines={4}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              testID="bio-input"
              value={field.state.value}
            />
          )}
          name="bio"
        />

        <form.Subscribe
          selector={(state) => [state.isSubmitting, state.values]}
        >
          {([isSubmitting, values]) => {
            const typedValues = values as ProfileValues;
            const hasChanges =
              typedValues.name.trim() !== initialValues.name ||
              typedValues.bio.trim() !== initialValues.bio;
            return (
              <Button
                disabled={!hasChanges}
                label={translate("profile.save")}
                loading={Boolean(isSubmitting)}
                onPress={form.handleSubmit}
                testID="save-button"
              />
            );
          }}
        </form.Subscribe>

        {savedAt ? (
          <Text
            className="mt-2 text-center text-success-600"
            testID="save-success"
          >
            {translate("profile.saved")}
          </Text>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
