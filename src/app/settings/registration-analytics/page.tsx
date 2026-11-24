import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { apiFetch } from "@/app/api/_base";

type Row = {
  campaign: string; ad: string; opened: number; started: number; submitted: number; completed: number;
  abandonedBeforeStart: number; abandonedBeforeSubmit: number; abandonedAfterSubmit: number; pending: number;
  invalidForm: number; rejected: number; termsChanged: number; conflict: number; serverError: number;
};
const columns = [
  ["opened", "Opened"], ["started", "Started"], ["submitted", "Submitted"], ["completed", "Created"],
  ["abandonedBeforeStart", "Left before starting"], ["abandonedBeforeSubmit", "Left before submitting"],
  ["abandonedAfterSubmit", "Left after submitting"], ["pending", "Pending"],
] as const;
const errors = [
  ["invalidForm", "Form validation"], ["rejected", "Request rejected"], ["termsChanged", "Terms or consent changed"],
  ["conflict", "Account or registration conflict"], ["serverError", "Server error"],
] as const;

export default async function RegistrationAnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role?.name)) notFound();
  const { days: requested } = await searchParams;
  const days = requested === "7" || requested === "90" ? requested : "30";
  const data = await apiFetch<{ days: number; truncated: boolean; rows: Row[] }>("/api/registration-analytics/report", {
    query: { days }, cache: "no-store", suppressAuthEvent: true,
  }).catch(() => null);
  return (
    <main className="space-y-5 p-5">
      <Link href="/settings" className="text-sm underline">Back to Settings</Link>
      <h1 className="text-2xl font-bold">Registration Analytics</h1>
      <p className="text-sm">Public client registration attempts, grouped by tagged campaign or No campaign. Attempts without progress for 24 hours appear as abandoned. No account details or form values are stored in this report.</p>
      <nav aria-label="Date range" className="flex gap-3">
        {["7", "30", "90"].map(value => <Link key={value} href={"?days=" + value} aria-current={days === value ? "page" : undefined} className={days === value ? "font-bold underline" : "underline"}>{value} days</Link>)}
      </nav>
      {!data ? <p role="alert">Registration analytics is not available. Please try again.</p> :
       data.rows.length === 0 ? <p>No registration attempts in this period.</p> :
       <>
         {data.truncated && <p>Showing up to 500 rows. Campaigns with the most attempts appear first after No campaign.</p>}
         <div className="overflow-x-auto">
           <table className="w-full text-sm">
             <thead><tr><th scope="col" className="p-2 text-left">Campaign</th><th scope="col" className="p-2 text-left">Ad</th>
               {columns.map(([key, name]) => <th scope="col" className="p-2 text-right" key={key}>{name}</th>)}
               <th scope="col" className="p-2 text-left">Attempts with errors</th>
             </tr></thead>
             <tbody>{data.rows.map(row => <tr key={JSON.stringify([row.campaign, row.ad])} className="border-t">
               <th scope="row" className="p-2 text-left">{row.campaign || "No campaign"}</th><td className="p-2">{row.campaign ? row.ad || "Unspecified" : "Not applicable"}</td>
               {columns.map(([key]) => <td className="p-2 text-right tabular-nums" key={key}>{row[key]}</td>)}
               <td className="p-2">{errors.filter(([key]) => row[key] > 0).map(([key, name]) =>
                 <div key={key}>{name}: {row[key]}</div>)}{errors.every(([key]) => row[key] === 0) && "None"}</td>
             </tr>)}</tbody>
           </table>
         </div>
         <p className="text-sm">An attempt can run into an error and still create an account. Error categories are not added together as unique people.</p>
       </>}
    </main>
  );
}
