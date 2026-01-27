import React from "react";
import { Star, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Product, Seller } from "@/api/search";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
    >
      {/* Product Image */}
      <div className="shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
        {product.image || product.images?.[0] ? (
          <img
            src={product.image || product.images?.[0]}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <span className="text-xs text-gray-400">No image</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-gray-900 truncate">
          {product.title}
        </h3>

        {/* Seller info */}
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
          <User className="w-3 h-3" />
          {product.sellerId?.username || "Unknown seller"}
        </p>

        {/* Rating and Price */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {product.averageRating > 0 ? (
              <>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < Math.round(product.averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-600">
                  {product.averageRating.toFixed(1)}
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-400">No ratings</span>
            )}
          </div>

          <span className="font-semibold text-sm text-gray-900">
            ${product.price.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

interface SellerCardProps {
  seller: Seller;
  onClick?: () => void;
}

export const SellerCard: React.FC<SellerCardProps> = ({ seller, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
    >
      {/* Seller Avatar */}
      <div className="shrink-0 w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
        {seller.avatarUrl ? (
          <img
            src={seller.avatarUrl}
            alt={seller.username}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-6 h-6 text-gray-400" />
        )}
      </div>

      {/* Seller Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-gray-900">{seller.username}</h3>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            Seller
          </Badge>
          <span className="text-xs text-gray-600">
            Score: {seller.reputationScore}
          </span>
        </div>
      </div>
    </div>
  );
};

interface SearchResultsProps {
  products: Product[];
  sellers: Seller[];
  isLoading: boolean;
  onProductClick?: (productId: string) => void;
  onSellerClick?: (sellerId: string) => void;
  hasSearched: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  products,
  sellers,
  isLoading,
  onProductClick,
  onSellerClick,
  hasSearched,
}) => {
  if (!hasSearched) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-2 max-h-96 overflow-y-auto z-50">
        <div className="p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0 && sellers.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-2 z-50 p-4">
        <p className="text-sm text-gray-500 text-center">No results found</p>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-2 max-h-96 overflow-y-auto z-50">
      {/* Products Section */}
      {products.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-gray-50 border-b">
            <p className="text-xs font-semibold text-gray-700 uppercase">
              Products ({products.length})
            </p>
          </div>
          <div className="divide-y space-y-2 mt-2">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onClick={() => onProductClick?.(product._id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sellers Section */}
      {sellers.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-gray-50 border-b border-t">
            <p className="text-xs font-semibold text-gray-700 uppercase">
              Sellers ({sellers.length})
            </p>
          </div>
          <div className="divide-y mt-2 space-y-2">
            {sellers.map((seller) => (
              <SellerCard
                key={seller._id}
                seller={seller}
                onClick={() => onSellerClick?.(seller._id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
