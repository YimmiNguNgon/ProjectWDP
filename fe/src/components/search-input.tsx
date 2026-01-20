import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      onSearch,
      placeholder = "Search for anything",
      className = "h-10",
      debounceMs = 500,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useState("");
    const debouncedValue = useDebounce(value, debounceMs);

    // Trigger search when debounced value changes
    React.useEffect(() => {
      onSearch(debouncedValue);
    }, [debouncedValue, onSearch]);

    const handleClear = useCallback(() => {
      setValue("");
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
    };

    return (
      <InputGroup className={className}>
        <InputGroupAddon>
          <SearchIcon className="w-4 h-4" />
        </InputGroupAddon>
        <InputGroupInput
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {value && (
          <InputGroupAddon align={"inline-end"}>
            <Button
              variant={"ghost"}
              size={"icon-sm"}
              onClick={handleClear}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </InputGroupAddon>
        )}
      </InputGroup>
    );
  },
);

SearchInput.displayName = "SearchInput";
