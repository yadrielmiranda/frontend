"use client";

import { useEffect, useState } from "react";

type EditEstimateErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function EditEstimateError({
  error,
  reset,
}: EditEstimateErrorProps) {
  const [browserDetails, setBrowserDetails] = useState(
    "URL: loading...\nUser agent: loading...",
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBrowserDetails(
      `URL: ${window.location.href}\nUser agent: ${window.navigator.userAgent}`,
    );
    console.error("Estimate edit route error", error);
  }, [error]);

  const report = [
    "Estimate edit route error",
    `Name: ${error.name || "UnknownError"}`,
    `Message: ${error.message || "No message available"}`,
    `Digest: ${error.digest || "Not available"}`,
    browserDetails,
    "",
    "Stack:",
    error.stack || "No stack available",
  ].join("\n");

  const copyReport = async () => {
    try {
      await window.navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <section className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-red-700">
          Estimate edit error
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          Copy the diagnostic information below and send it to support.
        </p>

        <pre className="mt-5 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
          {report}
        </pre>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyReport}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            {copied ? "Copied" : "Copy error details"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900"
          >
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
