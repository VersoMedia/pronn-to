import type { HorizontalTabItemProps } from "./HorizontalTabItem";
import HorizontalTabItem from "./HorizontalTabItem";

export interface NavTabProps {
  tabs: HorizontalTabItemProps[];
  linkShallow?: boolean;
  linkScroll?: boolean;
  actions?: JSX.Element;
  isButton?: boolean;
  views?: string;
}

const HorizontalTabs = function ({
  tabs,
  linkShallow,
  linkScroll,
  isButton = false,
  views = "week",
  actions,
  ...props
}: NavTabProps) {
  return (
    <div className="mb-4 h-9 max-w-full lg:mb-5">
      <nav
        className="no-scrollbar flex max-h-9 space-x-1 overflow-scroll rounded-md"
        aria-label="Tabs"
        {...props}>
        {tabs.map((tab, idx) => (
          <HorizontalTabItem
            className="px-4 py-2.5"
            {...tab}
            key={idx}
            views={views}
            isButton={isButton}
            linkShallow={linkShallow}
            linkScroll={linkScroll}
          />
        ))}
      </nav>
      {actions && actions}
    </div>
  );
};

export default HorizontalTabs;
