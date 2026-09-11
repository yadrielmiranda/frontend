'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { getSmsPreferences, updateSmsPreferences, type SmsPreferences } from '@/app/api/sms.api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SmsDisclosure } from './sms-disclosure';

export function SmsConsentCard() {
  const [preferences, setPreferences] = useState<SmsPreferences | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [promotionsEnabled, setPromotionsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSmsPreferences().then((data) => {
      if (cancelled) return;
      setPreferences(data);
      setEnabled(data.enabled);
      setPromotionsEnabled(data.promotionsEnabled ?? false);
    }).catch(() => {
      if (!cancelled) setError('Could not load SMS preferences. Please try again.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  async function save() {
    if (!preferences || saving) return;
    setSaving(true);
    try {
      const data = await updateSmsPreferences({ enabled, promotionsEnabled, phone: preferences.phone, version: preferences.program.version });
      if (!mounted.current) return;
      setPreferences(data);
      setEnabled(data.enabled);
      setPromotionsEnabled(data.promotionsEnabled ?? false);
      toast.success('SMS preferences saved.');
    } catch (cause) {
      if (!mounted.current) return;
      toast.error(cause instanceof Error ? cause.message : 'Could not save SMS preferences.');
      // Recarga el teléfono y el bloqueo si cambiaron mientras se editaba.
      setReload((value) => value + 1);
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <Card id="sms-notifications" className="scroll-mt-28 rounded-3xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <MessageSquare className="h-5 w-5 text-red-600" />
          SMS notifications
        </CardTitle>
        <CardDescription>Choose service SMS, promotional SMS, both, or neither. Account and project updates in the portal and by email are unaffected.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading preferences...</p>
        ) : error ? (
          <div className="space-y-3"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => setReload((value) => value + 1)}>Try again</Button></div>
        ) : preferences && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3">
              <div><p className="text-xs font-medium text-muted-foreground">Phone number</p><p className="mt-1 font-medium tabular-nums">{preferences.phone}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${(preferences.enabled || preferences.promotionsEnabled) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{(preferences.enabled || preferences.promotionsEnabled) ? 'Subscribed' : 'Not subscribed'}</span>
            </div>
            {preferences.blockedBySms && (
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">SMS was stopped by text. Reply START to the same sending number, then refresh this page to subscribe again.</p>
            )}
            <div className="flex items-start gap-3">
              <Checkbox id="sms-consent" checked={enabled} onCheckedChange={(checked) => setEnabled(checked === true)} disabled={saving || preferences.blockedBySms} aria-describedby="sms-disclosure" className="mt-0.5" />
              <label htmlFor="sms-consent" className="cursor-pointer text-sm leading-relaxed">{preferences.program.consentText}</label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="sms-promotions-consent" checked={promotionsEnabled} onCheckedChange={(checked) => setPromotionsEnabled(checked === true)} disabled={saving || preferences.blockedBySms} aria-describedby="sms-disclosure" className="mt-0.5" />
              <label htmlFor="sms-promotions-consent" className="cursor-pointer text-sm leading-relaxed">{preferences.program.registration.promotionsConsentText}</label>
            </div>
            <SmsDisclosure program={preferences.program} />
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving || (enabled === preferences.enabled && promotionsEnabled === (preferences.promotionsEnabled ?? false)) || preferences.blockedBySms}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save preferences'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
