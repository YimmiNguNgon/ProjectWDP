import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface BannerProps {
  id: string;
  title: string;
  description: string;
  badge?: string;
  badgeIcon?: React.ReactNode;
  bgColor: string;
  textColor: string;
  buttonText?: string;
  buttonAction?: () => void;
  icon?: React.ReactNode;
}

export function Banner({
  title,
  description,
  badge,
  badgeIcon,
  bgColor,
  textColor,
  buttonText,
  buttonAction,
  icon,
}: BannerProps) {
  return (
    <div
      className={`relative ${bgColor} rounded-lg p-8 overflow-hidden flex items-center justify-between`}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1">
        {badge && (
          <Badge className="mb-3 bg-white bg-opacity-30 text-white border-0 hover:bg-opacity-40">
            {badgeIcon && <span className="mr-2">{badgeIcon}</span>}
            {badge}
          </Badge>
        )}
        <h3 className={`text-3xl font-bold ${textColor} mb-2`}>{title}</h3>
        <p className={`${textColor} opacity-90 text-lg mb-4`}>{description}</p>
        {buttonText && (
          <Button
            onClick={buttonAction}
            className={`bg-white text-gray-900 hover:bg-gray-100 font-semibold`}
          >
            {buttonText}
          </Button>
        )}
      </div>

      {/* Icon */}
      {icon && (
        <div className="relative z-10 ml-8 text-6xl opacity-80">{icon}</div>
      )}
    </div>
  );
}
