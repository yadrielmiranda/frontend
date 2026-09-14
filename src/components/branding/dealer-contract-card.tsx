"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  dealerContractPdfUrl,
  removeDealerContract,
  uploadDealerContract,
  type ContractInfo,
} from "@/app/api/contracts.api";

export function DealerContractCard({
  initialContract,
}: {
  initialContract: ContractInfo | null;
}) {
  const [contract, setContract] = useState(initialContract);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file) return;
    if (
      file.size > 10 * 1024 * 1024 ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Choose a PDF up to 10 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setContract(await uploadDealerContract(file));
      toast.success("Contract saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await removeDealerContract();
      setContract(null);
      toast.success("Contract removed. Signed documents are preserved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Contract</CardTitle>
        <CardDescription>
          Choose whether to include this contract when sharing each estimate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {contract ? (
          <div className="flex items-start gap-3 rounded-lg border bg-slate-50 p-4">
            <FileText className="mt-1 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="break-words font-medium">{contract.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {(contract.sizeBytes / 1024 / 1024).toFixed(2)} MB
              </p>
              <a
                className="mt-2 inline-block text-sm underline"
                href={dealerContractPdfUrl(contract.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View contract
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No contract uploaded.</p>
        )}
        <p className="text-sm text-muted-foreground">
          Upload a finished PDF, up to 10 MB and 100 pages. Signed documents
          stay available when you replace this contract.
        </p>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {contract ? "Replace contract" : "Upload contract"}
          </Button>
          {contract && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void remove()}
            >
              Remove contract
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
