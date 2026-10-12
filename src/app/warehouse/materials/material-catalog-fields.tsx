"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Tags, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialProductImage } from "@/components/material-product-image";
import { createMaterialCategory, updateMaterialCategory, uploadMaterialImage, type MaterialCategory } from "@/app/api/materials.api";
import { MaterialField, MaterialNotice, MaterialSubmit, errorText, materialInputClass, useMaterialAction } from "./materials-shared";

export function MaterialPhotoField({ imageUrl, name, disabled, onChange, onUploadingChange }: {
  imageUrl: string | null;
  name: string;
  disabled?: boolean;
  onChange: (url: string | null) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function upload(file?: File) {
    if (!file || disabled || lock.current) return;
    setError(""); setSuccess("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose a photo smaller than 5 MB.");
      return;
    }
    lock.current = true; setUploading(true); onUploadingChange(true);
    try {
      setPreview(URL.createObjectURL(file));
      const uploaded = await uploadMaterialImage(file);
      onChange(uploaded.imageUrl);
      setSuccess("Photo ready. Save the product to apply it.");
    } catch (cause) {
      setError(`${errorText(cause)} The product photo has not changed.`);
    } finally {
      setPreview(null); setUploading(false); onUploadingChange(false); lock.current = false;
    }
  }

  return <div className="space-y-3">
    <p className="text-sm font-medium">Product photo (optional)</p>
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border bg-slate-50">
        {preview ? (
          // A browser object URL provides an immediate preview while the selected file uploads.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected product photo" className="h-full w-full object-contain p-2" />
        ) : <MaterialProductImage imageUrl={imageUrl} name={name || "Material"} className="h-full w-full" sizes="112px" />}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload product photo" className="sr-only" disabled={disabled || uploading} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file); }} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={disabled || uploading} onClick={() => input.current?.click()}>{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}{uploading ? "Uploading…" : imageUrl ? "Replace photo" : "Upload photo"}</Button>
          {imageUrl && <Button type="button" variant="ghost" disabled={disabled || uploading} onClick={() => { onChange(null); setError(""); setSuccess("Photo removed. Save the product to apply it."); }}><X className="mr-1 h-4 w-4" />Remove</Button>}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB. Use a clear photo of the product.</p>
      </div>
    </div>
    <MaterialNotice error={error} success={success} />
  </div>;
}

export function MaterialCategorySelect({ categories, categoryId, onChange, disabled }: {
  categories: MaterialCategory[];
  categoryId: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return <MaterialField label="Category (optional)"><select className={materialInputClass} value={categoryId} disabled={disabled} onChange={event => onChange(event.target.value)}><option value="">Uncategorized</option>{categories.filter(category => category.isActive || String(category.id) === categoryId).map(category => <option key={category.id} value={category.id}>{category.name}{category.isActive ? "" : " (inactive)"}</option>)}</select></MaterialField>;
}

export function MaterialCategoryManager({ categories, onChange, disabled, compact = false }: {
  categories: MaterialCategory[];
  onChange: (categories: MaterialCategory[]) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const action = useMaterialAction();
  function saved(category: MaterialCategory) {
    onChange([...categories.filter(item => item.id !== category.id), category].sort((a, b) => a.name.localeCompare(b.name)));
  }
  return <>
    <Button type="button" variant={compact ? "ghost" : "outline"} size={compact ? "sm" : "default"} disabled={disabled} onClick={() => { action.clear(); setOpen(true); }}><Tags className="mr-2 h-4 w-4" />{compact ? "Manage categories" : "Categories"}</Button>
    <Dialog open={open} onOpenChange={value => { if (!action.busy) setOpen(value); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Material categories</DialogTitle><DialogDescription>Organize your catalog with categories such as Caulking and sealants or Screws and fasteners.</DialogDescription></DialogHeader>
      <form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); event.stopPropagation(); void action.run({ name: name.trim() }, async requestKey => { saved(await createMaterialCategory({ requestKey, name: name.trim() })); setName(""); }, "Category created."); }}><div className="flex-1"><MaterialField label="Category name"><Input required maxLength={80} value={name} disabled={action.busy} onChange={event => setName(event.target.value)} /></MaterialField></div><MaterialSubmit busy={action.busy} disabled={!name.trim()}>Add</MaterialSubmit></form>
      <MaterialNotice error={action.error} success={action.success} />
      <ul className="divide-y">{categories.map(category => <li key={category.id} className="py-3">
        {editingId === category.id ? <form className="space-y-2" onSubmit={event => { event.preventDefault(); event.stopPropagation(); void action.run({ id: category.id, name: editingName.trim() }, async requestKey => { saved(await updateMaterialCategory(category.id, { requestKey, name: editingName.trim() })); setEditingId(null); }, "Category renamed."); }}><MaterialField label="New category name"><Input autoFocus required maxLength={80} value={editingName} disabled={action.busy} onChange={event => setEditingName(event.target.value)} /></MaterialField><div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={action.busy} onClick={() => setEditingId(null)}>Cancel</Button><MaterialSubmit busy={action.busy} disabled={!editingName.trim()}>Save name</MaterialSubmit></div></form> : <div className="flex flex-wrap items-center justify-between gap-2"><span className="min-w-0 break-words text-sm">{category.name}{!category.isActive && <span className="text-muted-foreground"> · Inactive</span>}</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={action.busy} onClick={() => { action.clear(); setEditingId(category.id); setEditingName(category.name); }}>Rename</Button><Button type="button" variant="outline" size="sm" disabled={action.busy} onClick={() => action.run({ id: category.id, isActive: !category.isActive }, async requestKey => { saved(await updateMaterialCategory(category.id, { requestKey, isActive: !category.isActive })); }, "Category updated.")}>{category.isActive ? "Deactivate" : "Activate"}</Button></div></div>}
      </li>)}</ul>
      {!categories.length && <p className="text-sm text-muted-foreground">No categories yet. Products can remain uncategorized.</p>}
      <p className="text-xs text-muted-foreground">Inactive categories are unavailable for new assignments. Products keep their existing category.</p>
    </DialogContent></Dialog>
  </>;
}
