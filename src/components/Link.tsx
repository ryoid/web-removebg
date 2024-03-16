import { A } from "@solidjs/router"
import { mergeProps, splitProps, type Component, type ComponentProps } from "solid-js"
import { cn } from "~/lib/cn"

type LinkProps = ComponentProps<typeof A> & {
  variant?: "default" | "subtle"
}

export const Link: Component<LinkProps> = (_props) => {
  const props = mergeProps({ variant: "default" }, _props)
  const [local, others] = splitProps(props, ["variant", "class", "classList"])
  return (
    <A
      class={cn(
        "underline-offset-[3px] transition underline",
        {
          "text-blue-600 hover:text-blue-700":
            local.variant === "default",
          "text-zinc-800 decoration-zinc-500 hover:decoration-zinc-900 hover:text-zinc-900": local.variant === "subtle",
        },
        local.class,
        local.classList
      )}
      {...others}
    />
  )
}
