import { toast } from 'sonner';

export function networkInvitationUrl(token: string) {
  return new URL(`/login/dealer-registration/${encodeURIComponent(token)}`, window.location.origin).href;
}

export async function copyNetworkInvitation(input: HTMLInputElement | null) {
  if (!input?.value) return;
  let copied = false;
  try {
    await navigator.clipboard.writeText(input.value);
    copied = true;
  } catch {
    // Browsers may only allow the selection-based copy on a local HTTP network.
    input.focus();
    input.select();
    try {
      copied = document.execCommand('copy');
    } catch {
      // Leave the URL selected so it can be copied manually.
    }
  }
  if (copied) toast.success('Invitation link copied.');
  else toast.error('Select and copy the invitation link.');
}
