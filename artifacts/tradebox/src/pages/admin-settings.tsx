import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { useAdminGetSettings, useAdminUpdateSettings } from "@workspace/api-client-react/src/extra-hooks";
import { Settings, Globe, DollarSign, Shield, Users } from "lucide-react";

const schema = z.object({
  siteName: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  supportEmail: z.string().optional(),
  telegramLink: z.string().optional(),
  whatsappLink: z.string().optional(),
  registrationEnabled: z.boolean().optional(),
  requireKyc: z.boolean().optional(),
  referralsEnabled: z.boolean().optional(),
  minDeposit: z.coerce.number().nonnegative().optional(),
  minWithdrawal: z.coerce.number().nonnegative().optional(),
  withdrawalFeePercent: z.coerce.number().min(0).max(100).optional(),
  tier1Rate: z.coerce.number().min(0).max(100).optional(),
  tier2Rate: z.coerce.number().min(0).max(100).optional(),
  tier3Rate: z.coerce.number().min(0).max(100).optional(),
  maintenanceMode: z.boolean().optional(),
  sessionTimeoutDays: z.coerce.number().int().min(1).max(365).optional(),
  maxLoginAttempts: z.coerce.number().int().min(1).max(100).optional(),
});

type FormValues = z.infer<typeof schema>;

export function AdminSettings() {
  const { data: settings } = useAdminGetSettings();
  const update = useAdminUpdateSettings();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {},
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        siteName: settings.siteName,
        logoUrl: settings.logoUrl ?? "",
        faviconUrl: settings.faviconUrl ?? "",
        supportEmail: settings.supportEmail ?? "",
        telegramLink: settings.telegramLink ?? "",
        whatsappLink: settings.whatsappLink ?? "",
        registrationEnabled: settings.registrationEnabled,
        requireKyc: settings.requireKyc,
        referralsEnabled: settings.referralsEnabled,
        minDeposit: settings.minDeposit,
        minWithdrawal: settings.minWithdrawal,
        withdrawalFeePercent: settings.withdrawalFeePercent,
        tier1Rate: settings.tier1Rate,
        tier2Rate: settings.tier2Rate,
        tier3Rate: settings.tier3Rate,
        maintenanceMode: settings.maintenanceMode,
        sessionTimeoutDays: settings.sessionTimeoutDays,
        maxLoginAttempts: settings.maxLoginAttempts,
      });
    }
  }, [settings]);

  const onSubmit = (values: FormValues) => {
    update.mutate(values as any, {
      onSuccess: () => toast({ title: "Settings saved" }),
      onError: (err: any) => toast({ title: "Error", description: err?.message ?? "Failed", variant: "destructive" }),
    });
  };

  return (
    <div className="mt-6 space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* General */}
          <Section icon={<Globe className="h-4 w-4" />} title="General">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field form={form} name="siteName" label="Site Name" />
              <Field form={form} name="supportEmail" label="Support Email" />
              <Field form={form} name="logoUrl" label="Logo URL" />
              <Field form={form} name="faviconUrl" label="Favicon URL" />
              <Field form={form} name="telegramLink" label="Telegram Link" />
              <Field form={form} name="whatsappLink" label="WhatsApp Link" />
            </div>
          </Section>

          {/* Registration */}
          <Section icon={<Users className="h-4 w-4" />} title="Registration">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Toggle form={form} name="registrationEnabled" label="Registration Enabled" description="Allow new users to register" />
              <Toggle form={form} name="requireKyc" label="Require KYC" description="KYC mandatory before investing" />
              <Toggle form={form} name="referralsEnabled" label="Referrals Enabled" description="Allow guild referral codes" />
            </div>
          </Section>

          {/* Financial */}
          <Section icon={<DollarSign className="h-4 w-4" />} title="Financial">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field form={form} name="minDeposit" label="Min Deposit (USDT)" type="number" />
              <Field form={form} name="minWithdrawal" label="Min Withdrawal (USDT)" type="number" />
              <Field form={form} name="withdrawalFeePercent" label="Withdrawal Fee (%)" type="number" />
              <Field form={form} name="tier1Rate" label="Tier 1 Commission (%)" type="number" description="Direct referral" />
              <Field form={form} name="tier2Rate" label="Tier 2 Commission (%)" type="number" description="2nd level" />
              <Field form={form} name="tier3Rate" label="Tier 3 Commission (%)" type="number" description="3rd level" />
            </div>
          </Section>

          {/* Security */}
          <Section icon={<Shield className="h-4 w-4" />} title="Security">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Toggle form={form} name="maintenanceMode" label="Maintenance Mode" description="Block all user access" />
              <Field form={form} name="sessionTimeoutDays" label="Session Timeout (days)" type="number" />
              <Field form={form} name="maxLoginAttempts" label="Max Login Attempts" type="number" />
            </div>
          </Section>

          <Button type="submit" disabled={update.isPending} className="bg-[#0066FF] hover:bg-[#0052CC] text-white px-8">
            {update.isPending ? "Saving…" : "Save Settings"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#EEF2F8] p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 font-bold text-[#0F1923]">
        <span className="text-[#0066FF]">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ form, name, label, type = "text", description }: {
  form: any; name: string; label: string; type?: string; description?: string;
}) {
  return (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel className="text-xs font-mono uppercase text-[#6A82A0]">{label}</FormLabel>
        <FormControl>
          <Input type={type} {...field} value={field.value ?? ""} className="bg-[#F8FAFD] border-[#EEF2F8] text-sm" />
        </FormControl>
        {description && <FormDescription className="text-xs text-[#6A82A0]">{description}</FormDescription>}
      </FormItem>
    )} />
  );
}

function Toggle({ form, name, label, description }: { form: any; name: string; label: string; description?: string }) {
  return (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className="flex items-start gap-3 p-3 bg-[#F8FAFD] rounded-lg border border-[#EEF2F8]">
        <FormControl>
          <button
            type="button"
            onClick={() => field.onChange(!field.value)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors mt-0.5 ${field.value ? "bg-[#22C55E]" : "bg-[#CBD5E1]"}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${field.value ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </FormControl>
        <div>
          <FormLabel className="text-sm font-semibold text-[#0F1923] cursor-pointer">{label}</FormLabel>
          {description && <FormDescription className="text-xs text-[#6A82A0]">{description}</FormDescription>}
        </div>
      </FormItem>
    )} />
  );
}
