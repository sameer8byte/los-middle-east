import { Children } from "react";

interface BoxContainerProps {
  children: React.ReactNode;
  title?: string;
  dropdown?: React.ReactNode;
  button?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  childrenClassName?: string;
  titleBgColor?: string;
  autoWidth?: boolean;
  isIcon?: boolean;
  icon?: React.ReactNode;
}

const BoxContainer = ({
  children,
  title,
  dropdown,
  button,
  className = "",
  titleClassName = "",
  childrenClassName = "",
  titleBgColor = "bg-[#f5f5f5]",
  autoWidth = false,
  isIcon = false,
  icon,

}: BoxContainerProps) => {
  const childCount = Children.count(children);
  const widthClass = autoWidth && childCount > 0 ? `w-fit` : "";

  return (
    <div
      className={`flex flex-col ${widthClass} ${className} border-2 border-[#fafafa] rounded-xl mb-4`}
    >
      {(title || dropdown || button) && (
        <div
          className={`flex justify-between items-center py-3 px-4 ${titleBgColor} rounded-t-xl border-b border-gray-100 ${titleClassName}`}
        >
          <div className="flex items-center gap-2">
            {isIcon && icon && (
              <div className="text-gray-700">
                {icon}
              </div>
            )}
            {title && (
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            )}
          </div>
          <div className="flex items-center gap-3">
            {dropdown}
            {button}
          </div>
        </div>
      )}
      <div className={`flex flex-wrap gap-4 p-4 flex-1 ${childrenClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default BoxContainer;
