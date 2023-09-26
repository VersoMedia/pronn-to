import { classNames } from "@calcom/lib";

export function BlockedTimeCell() {
  return (
    <div
      className={classNames(
        "group absolute inset-0 flex h-full flex-col  hover:cursor-not-allowed",
        "darked:[--disabled-gradient-background:#262626] darked:[--disabled-gradient-foreground:#393939] [--disabled-gradient-background:#E5E7EB] [--disabled-gradient-foreground:#D1D5DB]"
      )}
      style={{
        backgroundColor: "#D1D5DB",
        background:
          "repeating-linear-gradient( -45deg, var(--disabled-gradient-background), var(--disabled-gradient-background) 2.5px, var(--disabled-gradient-foreground) 2.5px, var(--disabled-gradient-foreground) 6.5px )",
      }}
    />
  );
}
