import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SearchInput } from "@/components/search-input";
import { SearchResults } from "@/components/search-results";
import { globalSearch, type Product, type Seller } from "@/api/search";
import { toast } from "sonner";

interface SearchContainerProps {
  className?: string;
}

export const SearchContainer: React.FC<SearchContainerProps> = ({
  className = "h-10",
}) => {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle search
  const handleSearch = React.useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);

    if (!searchQuery.trim()) {
      setProducts([]);
      setSellers([]);
      setHasSearched(false);
      setShowResults(false);
      return;
    }

    setHasSearched(true);
    setShowResults(true);
    setIsLoading(true);

    try {
      const results = await globalSearch(searchQuery, {
        productLimit: 10,
        sellerLimit: 5,
      });
      setProducts(results.data.products);
      setSellers(results.data.sellers);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle product click
  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
    setShowResults(false);
    setQuery("");
  };

  // Handle seller click
  const handleSellerClick = (sellerId: string) => {
    navigate(`/seller/${sellerId}`);
    setShowResults(false);
    setQuery("");
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
      setShowResults(false);
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-2xl">
      <SearchInput
        ref={inputRef}
        onSearch={handleSearch}
        placeholder="Search for anything"
        className={className}
        debounceMs={300}
        onKeyDown={handleKeyDown}
      />

      {showResults && (
        <SearchResults
          products={products}
          sellers={sellers}
          isLoading={isLoading}
          onProductClick={handleProductClick}
          onSellerClick={handleSellerClick}
          hasSearched={hasSearched}
        />
      )}
    </div>
  );
};
