"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, Palette, Shapes, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDesignColor, createDesignPattern, deleteDesignPattern, updateDesignColor, updateDesignPattern } from "@/app/api/garage-designs.api";
import { safeDesignImageUrl, type DesignColor, type DesignPattern } from "@/lib/garage-designs";
import type { FrameColor } from "@/lib/types";
import { validateGarageDesignTemplate } from "@/lib/garage-design-templates";
import { GarageDesignPreview } from "@/components/estimates/garage-design-preview";
import { GarageDesignTemplateEditor, createTemplateDraft, normalizeTemplateDraft, type GarageDesignTemplateDraft } from "./garage-design-template-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Editor = {
  kind: "pattern" | "color";
  id?: number;
  name: string;
  imageUrl: string;
  templateDraft: GarageDesignTemplateDraft | null;
  hexCode: string;
  idFrameColor: string;
  isActive: boolean;
  sortOrder: string;
};

function newEditor(kind: Editor["kind"]): Editor {
  return { kind, name: "", imageUrl: "", templateDraft: kind === "pattern" ? createTemplateDraft() : null, hexCode: "#FFFFFF", idFrameColor: "", isActive: true, sortOrder: "0" };
}

function sortCatalog<T extends { name: string; sortOrder: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function GarageDesignCatalogsClient({ initialPatterns, initialColors, frameColors = [] }: { initialPatterns: DesignPattern[]; initialColors: DesignColor[]; frameColors?: FrameColor[] }) {
  const [patterns, setPatterns] = useState(initialPatterns);
  const [colors, setColors] = useState(initialColors);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DesignPattern | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [previewColorId, setPreviewColorId] = useState(() => String(sortCatalog(initialColors).find((color) => color.isActive)?.id ?? ""));
  const previewColors = sortCatalog(colors).filter((color) => color.isActive);
  const previewColor = previewColors.find((color) => String(color.id) === previewColorId) ?? previewColors[0];
  const availableFrameColors = [...frameColors].filter((color) => color.isActive).sort((a, b) => a.color.localeCompare(b.color));
  const selectedFrameColor = frameColors.find((color) => String(color.id) === editor?.idFrameColor);

  function openEditor(next: Editor) {
    setFormError(null);
    setEditor(next);
  }

  function changeEditor(patch: Partial<Editor>) {
    setEditor((current) => current ? { ...current, ...patch } : null);
    setFormError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const name = editor.name.trim();
    const sortOrder = Number(editor.sortOrder);
    const imageUrl = editor.imageUrl.trim();
    const template = editor.templateDraft ? normalizeTemplateDraft(editor.templateDraft) : null;
    const idFrameColor = Number(editor.idFrameColor);
    let error: string | null = null;
    if (!name) error = "Name is required.";
    else if (!Number.isInteger(sortOrder) || sortOrder < 0 || editor.sortOrder.trim() === "") error = "Order must be a whole number of zero or greater.";
    else if (editor.kind === "color" && !/^#[0-9a-f]{6}$/i.test(editor.hexCode)) error = "Enter a color in #RRGGBB format.";
    else if (editor.kind === "color" && !availableFrameColors.some((color) => color.id === idFrameColor)) error = "Choose an active Frame Color for this design color.";
    else if (editor.kind === "pattern" && editor.templateDraft && !template) error = "Enter a positive width for every column in the design layout.";
    else if (editor.kind === "pattern" && imageUrl && !safeDesignImageUrl(imageUrl)) error = "Use an http:// or https:// image address, or a local path starting with / .";
    if (error) { setFormError(error); return; }

    setBusy(true);
    try {
      if (editor.kind === "pattern") {
        const input = { name, sortOrder, isActive: editor.isActive, imageUrl: imageUrl || null, template };
        const result = editor.id ? await updateDesignPattern(editor.id, input) : await createDesignPattern(input);
        setPatterns((current) => [...current.filter((item) => item.id !== result.id), result]);
      } else {
        const input = { name, sortOrder, isActive: editor.isActive, hexCode: editor.hexCode.toUpperCase(), idFrameColor };
        const result = editor.id ? await updateDesignColor(editor.id, input) : await createDesignColor(input);
        setColors((current) => [...current.filter((item) => item.id !== result.id), result]);
      }
      toast.success(editor.kind === "pattern" ? "Design saved." : "Design color saved.");
      setEditor(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save this option.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(kind: Editor["kind"], item: DesignPattern | DesignColor) {
    setBusy(true);
    try {
      if (kind === "pattern") {
        const result = await updateDesignPattern(item.id, { isActive: !item.isActive });
        setPatterns((current) => current.map((entry) => entry.id === result.id ? result : entry));
      } else {
        const result = await updateDesignColor(item.id, { isActive: !item.isActive });
        setColors((current) => current.map((entry) => entry.id === result.id ? result : entry));
      }
      toast.success(item.isActive ? "Option deactivated. Saved pieces keep their selection." : "Option activated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update this option.");
    } finally {
      setBusy(false);
    }
  }

  async function removePattern() {
    if (!deleting || busy) return;
    const id = deleting.id;
    setBusy(true);
    setDeleteError(null);
    try {
      await deleteDesignPattern(id);
      setPatterns((current) => current.filter((pattern) => pattern.id !== id));
      setDeleting(null);
      toast.success("Design deleted.");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete this design.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 px-4 py-3">
        <p className="text-sm text-muted-foreground">Catalog entries become available in estimates only after you link them to a system.</p>
        <Button variant="outline" asChild><Link href="/settings/systems">Go to Systems</Link></Button>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Palette className="size-5" /> Design Colors</h2><p className="text-sm text-muted-foreground">{colors.filter((item) => item.isActive).length} active</p></div>
            <Button type="button" disabled={busy} onClick={() => openEditor(newEditor("color"))}><Plus /> Add Color</Button>
          </div>
          {colors.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No design colors yet. Add a name and color sample.</p> : <ul className="divide-y">
            {sortCatalog(colors).map((color) => {
              const frameColor = frameColors.find((frame) => frame.id === color.idFrameColor);
              return <li key={color.id} className="flex flex-wrap items-center gap-3 p-4">
                <div aria-hidden="true" className="h-14 w-16 shrink-0 rounded border" style={{ backgroundColor: color.hexCode }} />
                <div className="min-w-0 flex-1"><p className="break-words font-medium">{color.name}</p><p className="text-xs text-muted-foreground">{color.isActive ? "Active" : "Inactive"} · Order {color.sortOrder}</p><p className={`mt-1 text-xs ${frameColor?.isActive ? "text-muted-foreground" : "text-amber-700"}`}>{frameColor ? `Frame Color: ${frameColor.color}${frameColor.isActive ? "" : " (inactive — choose an active color)"}` : "Frame Color not linked — edit to choose one."}</p></div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => openEditor({ ...newEditor("color"), id: color.id, name: color.name, hexCode: color.hexCode, idFrameColor: color.idFrameColor ? String(color.idFrameColor) : "", isActive: color.isActive, sortOrder: String(color.sortOrder) })} aria-label={`Edit design color ${color.name}`}><Pencil /><span>Edit</span></Button>
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void toggleActive("color", color)} aria-label={`${color.isActive ? "Deactivate" : "Activate"} design color ${color.name}`}>{color.isActive ? "Deactivate" : "Activate"}</Button>
                </div>
              </li>;
            })}
          </ul>}
        </section>
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Shapes className="size-5" /> Designs</h2><p className="text-sm text-muted-foreground">{patterns.filter((item) => item.isActive).length} active</p></div>
            <Button type="button" disabled={busy} onClick={() => openEditor(newEditor("pattern"))}><Plus /> Add Design</Button>
          </div>
          <div className="space-y-1 border-b px-4 py-3"><Label htmlFor="catalog-preview-color">Preview color</Label><select id="catalog-preview-color" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={previewColor?.id ?? ""} disabled={!previewColors.length} onChange={(event) => setPreviewColorId(event.target.value)}>{!previewColors.length && <option value="">No active colors yet</option>}{previewColors.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}</select><p className="text-xs text-muted-foreground">For preview only. Defaults are set separately for each system.</p></div>
          {patterns.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No designs yet. Add a name and create its layout.</p> : <ul className="divide-y">
            {sortCatalog(patterns).map((pattern) => {
              return <li key={pattern.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded border bg-slate-50">
                  <GarageDesignPreview template={pattern.template} imageUrl={pattern.imageUrl} color={previewColor?.hexCode} name={pattern.name} className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1"><p className="break-words font-medium">{pattern.name}</p><p className="text-xs text-muted-foreground">{pattern.isActive ? "Active" : "Inactive"} · Order {pattern.sortOrder}</p></div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => openEditor({ ...newEditor("pattern"), id: pattern.id, name: pattern.name, imageUrl: pattern.imageUrl ?? "", templateDraft: validateGarageDesignTemplate(pattern.template) ? createTemplateDraft(pattern.template) : null, isActive: pattern.isActive, sortOrder: String(pattern.sortOrder) })} aria-label={`Edit design ${pattern.name}`}><Pencil /><span>Edit</span></Button>
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void toggleActive("pattern", pattern)} aria-label={`${pattern.isActive ? "Deactivate" : "Activate"} design ${pattern.name}`}>{pattern.isActive ? "Deactivate" : "Activate"}</Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => { setDeleteError(null); setDeleting(pattern); }} aria-label={`Delete design ${pattern.name}`}><Trash2 /><span>Delete</span></Button>
                </div>
              </li>;
            })}
          </ul>}
        </section>
      </div>
      <Dialog open={editor !== null} onOpenChange={(open) => { if (!open && !busy) setEditor(null); }}>
        <DialogContent className={`max-h-[90vh] overflow-y-auto ${editor?.kind === "pattern" ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
          <DialogHeader>
            <DialogTitle>{editor?.id ? "Edit" : "Add"} {editor?.kind === "pattern" ? "Design" : "Design Color"}</DialogTitle>
            <DialogDescription>{editor?.kind === "pattern" ? "Create a reusable design pattern for garage door systems." : "Create a color sample for garage door designs."}</DialogDescription>
          </DialogHeader>
          {editor && <form onSubmit={save} className="space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="catalog-name">Name</Label><Input id="catalog-name" value={editor.name} maxLength={100} required autoComplete="off" placeholder={editor.kind === "pattern" ? "e.g. SF or GT" : "e.g. Oak"} onChange={(event) => changeEditor({ name: event.target.value })} /></div>
              {editor.kind === "color" && <div className="space-y-2">
                <Label htmlFor="catalog-frame-color">Frame Color</Label>
                <select id="catalog-frame-color" required className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={editor.idFrameColor} onChange={(event) => changeEditor({ idFrameColor: event.target.value })} aria-describedby="catalog-frame-color-help">
                  <option value="">Choose a Frame Color</option>
                  {editor.idFrameColor && !selectedFrameColor?.isActive && <option value={editor.idFrameColor} disabled>{selectedFrameColor ? `${selectedFrameColor.color} (inactive)` : "Previously linked color is unavailable"}</option>}
                  {availableFrameColors.map((color) => <option key={color.id} value={color.id}>{color.color}</option>)}
                </select>
                <p id="catalog-frame-color-help" className="text-xs text-muted-foreground">Selecting this design color also selects this Frame Color for the piece. Make it available in each series that uses this design color.</p>
                <p className="text-xs text-muted-foreground">{availableFrameColors.length === 0 ? "Create a Frame Color first. " : "Missing a color? "}<Link href="/settings/framecolors" target="_blank" rel="noopener noreferrer" className="underline">Manage Frame Colors</Link></p>
              </div>}
              {editor.kind === "color" && <div className="space-y-2"><Label htmlFor="catalog-color">Color sample</Label><div className="flex gap-2"><input aria-label="Pick a design color" type="color" className="h-10 w-14 cursor-pointer rounded border p-1" value={/^#[0-9a-f]{6}$/i.test(editor.hexCode) ? editor.hexCode : "#FFFFFF"} onChange={(event) => changeEditor({ hexCode: event.target.value })} /><Input id="catalog-color" value={editor.hexCode} maxLength={7} required placeholder="#FFFFFF" onChange={(event) => changeEditor({ hexCode: event.target.value })} /></div></div>}
              {editor.kind === "pattern" && <>
                <div className="space-y-1"><Label htmlFor="template-preview-color">Preview color</Label><select id="template-preview-color" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={previewColor?.id ?? ""} disabled={!previewColors.length} onChange={(event) => setPreviewColorId(event.target.value)}>{!previewColors.length && <option value="">No active colors yet</option>}{previewColors.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}</select></div>
                {editor.templateDraft ? <GarageDesignTemplateEditor value={editor.templateDraft} onChange={(templateDraft) => changeEditor({ templateDraft })} color={previewColor?.hexCode} name={editor.name} /> : <div className="space-y-3 rounded-lg border p-4"><GarageDesignPreview imageUrl={editor.imageUrl} color={previewColor?.hexCode} name={editor.name || "Design preview"} className="mx-auto h-40 w-full max-w-sm" /><p className="text-sm text-muted-foreground">This design uses an image. Create a layout to preview it in different colors.</p><Button type="button" variant="outline" onClick={() => changeEditor({ templateDraft: createTemplateDraft() })}>Create editable layout</Button></div>}
                <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Fallback image (optional)</summary><div className="mt-3 space-y-2">
                  <Label htmlFor="catalog-image">Image address</Label>
                  <Input id="catalog-image" value={editor.imageUrl} maxLength={2048} placeholder="https://..." onChange={(event) => changeEditor({ imageUrl: event.target.value })} />
                  <p className="text-xs text-muted-foreground">Used when the design has no editable layout. Enter an image address or a local image path starting with /.</p>
                </div></details>
              </>}
              <div className="space-y-2"><Label htmlFor="catalog-order">Order</Label><Input id="catalog-order" type="number" min={0} step={1} required value={editor.sortOrder} onChange={(event) => changeEditor({ sortOrder: event.target.value })} /></div>
              <div className="flex items-center justify-between rounded-lg border p-3"><Label htmlFor="catalog-active">Active</Label><Switch id="catalog-active" checked={editor.isActive} onCheckedChange={(isActive) => changeEditor({ isActive })} /></div>
            </fieldset>
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditor(null)}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}{busy ? "Saving..." : "Save"}</Button></div>
          </form>}
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open && !busy) { setDeleting(null); setDeleteError(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete design?</AlertDialogTitle>
            <AlertDialogDescription>Permanently delete &ldquo;{deleting?.name}&rdquo; from the design catalog? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} className="bg-destructive text-white hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void removePattern(); }}>
              {busy && <Loader2 className="size-4 animate-spin" />}{busy ? "Deleting..." : "Delete design"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
