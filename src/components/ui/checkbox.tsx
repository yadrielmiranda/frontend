"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded-[5px] border-2 border-slate-500 bg-white text-primary-foreground shadow-sm transition-[background-color,border-color,box-shadow] outline-none hover:border-primary hover:bg-slate-50 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px] data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:opacity-100 disabled:hover:border-slate-300 disabled:hover:bg-slate-100 disabled:data-[state=checked]:border-primary disabled:data-[state=checked]:bg-primary dark:border-slate-400 dark:bg-slate-950 dark:hover:border-slate-200 dark:hover:bg-slate-900 dark:data-[state=checked]:border-primary dark:data-[state=checked]:bg-primary dark:disabled:border-slate-700 dark:disabled:bg-slate-900 dark:disabled:data-[state=checked]:border-primary dark:disabled:data-[state=checked]:bg-primary aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-4 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
