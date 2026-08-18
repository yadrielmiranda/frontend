import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-slate-500 selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-1 text-base text-slate-950 shadow-sm transition-[background-color,border-color,box-shadow] outline-none hover:border-slate-400 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium md:text-sm",
        "focus-visible:border-primary focus-visible:ring-primary/15 focus-visible:ring-[3px]",
        "read-only:cursor-default read-only:border-slate-200 read-only:bg-slate-100 read-only:text-slate-700 read-only:shadow-none read-only:hover:border-slate-200",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 disabled:shadow-none",
        "dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 dark:hover:border-slate-500 dark:read-only:border-slate-700 dark:read-only:bg-slate-900 dark:read-only:text-slate-400 dark:disabled:border-slate-700 dark:disabled:bg-slate-900 dark:disabled:text-slate-500",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
