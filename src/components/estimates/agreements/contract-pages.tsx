"use client";

import { useEffect, useRef, useState } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";

function ContractPage({
  pdf,
  number,
}: {
  pdf: PDFDocumentProxy;
  number: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [ratio, setRatio] = useState(612 / 792);
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    const node = frame.current!;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "600px" },
    );
    const resize = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(node);
    resize.observe(node);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!visible || !width) return;
    let canceled = false;
    let task: RenderTask | undefined;
    const host = surface.current!;
    const canvas = document.createElement("canvas");
    canvas.className = "block h-auto w-full";
    canvas.setAttribute("aria-hidden", "true");
    host.replaceChildren(canvas);
    setError(false);
    void (async () => {
      const page = await pdf.getPage(number);
      if (canceled) return;
      const natural = page.getViewport({ scale: 1 });
      setRatio(natural.width / natural.height);
      const viewport = page.getViewport({ scale: width / natural.width });
      const density = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(viewport.width * density);
      canvas.height = Math.ceil(viewport.height * density);
      task = page.render({
        canvas,
        viewport,
        transform: [density, 0, 0, density, 0, 0],
      });
      await task.promise;
      if (canceled) return;
      canvas.dataset.rendered = "true";
      const content = await page.getTextContent();
      if (!canceled)
        setText(
          content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" "),
        );
    })().catch(() => {
      if (!canceled) setError(true);
    });
    // Solo se mantienen los lienzos cercanos: un contrato largo no ocupa memoria por todas sus páginas.
    return () => {
      canceled = true;
      task?.cancel();
      canvas.remove();
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [pdf, number, visible, width]);
  return (
    <div ref={frame} className="mx-auto w-full max-w-[816px]">
      <div
        className="relative overflow-hidden border bg-white shadow-sm"
        style={{ aspectRatio: ratio }}
        aria-label={`Contract page ${number} of ${pdf.numPages}`}
        role="article"
      >
        <div ref={surface} />
        <p className="sr-only">{text}</p>
        {error && (
          <p className="absolute inset-x-4 top-4 text-sm text-muted-foreground">
            Could not display this page. Use Download PDF to read the contract.
          </p>
        )}
      </div>
      {pdf.numPages > 1 && (
        <p className="py-2 text-center text-xs text-muted-foreground">
          {number} / {pdf.numPages}
        </p>
      )}
    </div>
  );
}

export function ContractPages({ url }: { url: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let canceled = false;
    let task: PDFDocumentLoadingTask | undefined;
    setPdf(null);
    setError(false);
    void (async () => {
      const pdfjs = await import("pdfjs-dist");
      if (canceled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      task = pdfjs.getDocument({ url, isEvalSupported: false });
      const loaded = await task.promise;
      if (!canceled) setPdf(loaded);
    })().catch(() => {
      if (!canceled) setError(true);
    });
    return () => {
      canceled = true;
      void task?.destroy().catch(() => undefined);
    };
  }, [url]);
  if (error)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Could not display the contract. Use Download PDF to open it.
      </p>
    );
  if (!pdf)
    return (
      <p
        role="status"
        className="py-8 text-center text-sm text-muted-foreground"
      >
        Loading contract…
      </p>
    );
  return (
    <div className="space-y-4" aria-label="Contract pages">
      {Array.from({ length: pdf.numPages }, (_, index) => (
        <ContractPage key={index} pdf={pdf} number={index + 1} />
      ))}
    </div>
  );
}
