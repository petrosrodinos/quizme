import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader } from "lucide-react";
import { cn } from "@/lib/utils";

// Mobile: long labels (e.g. Greek) may wrap to a second line instead of overflowing; sm+ keeps single-line buttons.
const buttonVariants = cva("inline-flex max-w-full items-center justify-center gap-2 whitespace-normal text-center sm:whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
      outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      default: "min-h-9 h-auto px-4 py-2 sm:h-9",
      sm: "min-h-8 h-auto rounded-md px-3 py-1 text-xs sm:h-8",
      lg: "min-h-10 h-auto rounded-md px-6 py-2 sm:h-10 sm:px-8",
      icon: "h-9 w-9 shrink-0",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, loading = false, asChild = false, ...props }, ref) => {
  if (asChild) {
    // Slot merges the button styles onto the single child (e.g. a <Link>) — never wrap it, or the styles land on the wrapper.
    return <Slot data-slot="button" data-variant={variant ?? "default"} data-size={size ?? "default"} className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }

  return (
    <button data-slot="button" data-variant={variant ?? "default"} data-size={size ?? "default"} className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} disabled={loading || props.disabled}>
      {loading && <Loader className="animate-spin w-5 h-5" />}
      {props.children}
    </button>
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
