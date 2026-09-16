"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight, Download, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";

function ContractPage({
  pdf,
  number,
  viewport,
}: {
  pdf: PDFDocumentProxy;
  number: number;
  viewport: RefObject<HTMLDivElement | null>;
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
      { root: viewport.current, rootMargin: "600px 0px" },
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
  }, [viewport]);
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
    <div ref={frame} data-contract-page={number} className="mx-auto w-full max-w-[816px]">
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

function ContractViewer({
  url,
  pdf,
  error,
  initialPage = 1,
  expanded = false,
  onExpand,
}: {
  url: string;
  pdf: PDFDocumentProxy | null;
  error: boolean;
  initialPage?: number;
  expanded?: boolean;
  onExpand?: (page: number) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const scrollFrame = useRef<number | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const goToPage = useCallback((number: number) => {
    const container = viewport.current;
    const page = pages.current?.querySelector<HTMLElement>(
      `[data-contract-page="${number}"]`,
    );
    if (!container || !page) return;
    // Desplazar solo el visor; scrollIntoView también movería la página de firma.
    container.scrollTo({
      top: page.getBoundingClientRect().top -
        container.getBoundingClientRect().top + container.scrollTop - 16,
      behavior: "instant",
    });
    setCurrentPage(number);
  }, []);

  const updateCurrentPage = useCallback(() => {
    if (scrollFrame.current !== null) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      const container = viewport.current;
      if (!container) return;
      const readingLine = container.getBoundingClientRect().top +
        Math.min(container.clientHeight / 3, 160);
      const visiblePage = Array.from(
        pages.current?.querySelectorAll<HTMLElement>("[data-contract-page]") ?? [],
      ).find((page) => page.getBoundingClientRect().bottom > readingLine);
      if (visiblePage) setCurrentPage(Number(visiblePage.dataset.contractPage));
    });
  }, []);

  useEffect(() => {
    if (!pdf) return;
    goToPage(Math.min(initialPage, pdf.numPages));
    const resize = new ResizeObserver(updateCurrentPage);
    if (viewport.current) resize.observe(viewport.current);
    if (pages.current) resize.observe(pages.current);
    return () => {
      resize.disconnect();
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    };
  }, [pdf, initialPage, goToPage, updateCurrentPage]);

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-lg border bg-white ${expanded ? "flex-1" : "h-[65dvh] max-h-[680px]"}`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Previous contract page" disabled={!pdf || currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-1 text-sm tabular-nums" aria-live="polite" aria-atomic="true">
            {pdf ? `Page ${currentPage} of ${pdf.numPages}` : "Contract PDF"}
          </span>
          <Button type="button" variant="ghost" size="icon" aria-label="Next contract page" disabled={!pdf || currentPage >= pdf.numPages} onClick={() => goToPage(currentPage + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </Button>
          {onExpand && (
            <Button type="button" variant="ghost" size="sm" disabled={!pdf} onClick={() => onExpand(currentPage)}>
              <Maximize2 className="h-4 w-4" /> Expand
            </Button>
          )}
        </div>
      </div>
      <div
        ref={viewport}
        role="region"
        aria-label="Scrollable contract document"
        tabIndex={0}
        onScroll={updateCurrentPage}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-slate-100 p-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      >
        {error ? (
          <p role="status" className="py-8 text-center text-sm text-muted-foreground">
            Could not display the contract. Use Download PDF to open it.
          </p>
        ) : !pdf ? (
          <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading contract…</p>
        ) : (
          <div ref={pages} className="space-y-4" aria-label="Contract pages">
            {Array.from({ length: pdf.numPages }, (_, index) => (
              <ContractPage key={index} pdf={pdf} number={index + 1} viewport={viewport} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ContractPages({ url }: { url: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [expandedPage, setExpandedPage] = useState(1);
  useEffect(() => {
    let canceled = false;
    let task: PDFDocumentLoadingTask | undefined;
    setPdf(null);
    setError(false);
    setExpanded(false);
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
  return (
    <>
      <ContractViewer url={url} pdf={pdf} error={error} onExpand={(page) => { setExpandedPage(page); setExpanded(true); }} />
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="flex h-[94dvh] w-[calc(100%-1rem)] max-w-[1200px] flex-col gap-3 p-3 sm:max-w-[1200px] sm:p-5">
          <DialogHeader className="shrink-0 pr-8 text-left">
            <DialogTitle>Contract</DialogTitle>
            <DialogDescription className="sr-only">Read the contract. Close this viewer to return to the signature form.</DialogDescription>
          </DialogHeader>
          <ContractViewer url={url} pdf={pdf} error={error} initialPage={expandedPage} expanded />
        </DialogContent>
      </Dialog>
    </>
  );
}
