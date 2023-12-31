import classNames from "@calcom/lib/classNames";

export default function Logo({
  small,
  icon,
  inline = true,
  className,
}: {
  small?: boolean;
  icon?: boolean;
  inline?: boolean;
  className?: string;
}) {
  return (
    <h3 className={classNames("logo", inline && "inline", className)}>
      <strong>
        {icon ? (
          <img className="darked:invert mx-auto w-9" alt="Verso" title="Verso" src="/api/logo?type=icon" />
        ) : (
          <img
            className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "darked:invert")}
            alt="Verso"
            title="Verso"
            src="/api/logo"
          />
        )}
      </strong>
    </h3>
  );
}
