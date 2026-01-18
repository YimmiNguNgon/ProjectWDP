// feedback-list.tsx
import { RatingStars } from "./rating-stars";

export type FeedbackItem = {
  id: string;
  rating: number;
  comment: string;
  author: string;
  createdAt: string;
};

type FeedbackListProps = {
  items: FeedbackItem[];
};

export function FeedbackList({ items }: FeedbackListProps) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground mt-4">
        Chưa có đánh giá nào cho sản phẩm này.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {items.map((item) => (
        <div key={item.id} className="border-t pt-3">
          <RatingStars value={item.rating} readOnly />
          <p className="mt-2 text-sm">{item.comment}</p>
          <div className="mt-1 text-xs text-muted-foreground">
            Bởi <span className="font-medium">{item.author}</span> ·{" "}
            {item.createdAt}
          </div>
        </div>
      ))}
    </div>
  );
}
