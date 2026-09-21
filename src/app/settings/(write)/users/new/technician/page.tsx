import { BackLink } from "@/components/navigation/back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnicianAccountForm } from "../../technician-account-form";

export default function NewTechnicianPage() {
  return <div className="mx-auto max-w-3xl space-y-5 py-6">
    <BackLink href="/settings/users" label="Back to Users" />
    <Card><CardHeader><CardTitle>New Technician</CardTitle></CardHeader><CardContent><TechnicianAccountForm /></CardContent></Card>
  </div>;
}
