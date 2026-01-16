import { Star } from "lucide-react";

type RatingStarsProps = {
  value: number; // 0 - 5
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
};

export function RatingStars({
  value,
  onChange,
  readOnly,
  size = 12,
}: RatingStarsProps) {
  const handleClick = (star: number) => {
    if (readOnly || !onChange) return;
    onChange(star);
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const active = starValue <= value;

        return (
          <button
            key={starValue}
            type="button"
            onClick={() => handleClick(starValue)}
            className={`p-0 border-none bg-transparent ${
              readOnly ? "cursor-default" : "cursor-pointer"
            }`}
          >
            <Star
              size={size}
              className={
                active ? "fill-black text-black" : "text-muted-foreground"
              }
            />
          </button>
        );
      })}
    </div>
  );
}
