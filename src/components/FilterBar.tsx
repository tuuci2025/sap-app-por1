import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalRows: number;
  filteredRows: number;
}

const FilterBar = ({ searchTerm, onSearchChange, totalRows, filteredRows }: FilterBarProps) => {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filter</span>
      </div>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by PO#, item code, vendor, description..."
          className="pl-9 h-9 text-sm bg-background"
        />
      </div>
      <span className="text-xs text-muted-foreground font-mono">
        {filteredRows} / {totalRows} rows
      </span>
    </div>
  );
};

export default FilterBar;
