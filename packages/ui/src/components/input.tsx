import * as React from "react"

import { cn } from "../lib/utils.js"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-9 w-full rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1 text-sm text-[var(--text)] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...(type !== undefined ? { type } : {})}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
