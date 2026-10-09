import React from 'react';
import { ArrowUpRight, LoaderCircle, Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFocus?: () => void;
  loading: boolean;
  compact?: boolean;
}

/** Campo de busca em vidro líquido: é a primeira coisa que a pessoa toca, então carrega a identidade visual. */
export default function SearchBar({ value, onChange, onSubmit, onFocus, loading, compact = false }: SearchBarProps) {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`liquid-glass flex w-full items-center gap-3 !rounded-full ${compact ? 'p-1.5 pl-5' : 'p-2 pl-6'}`}
    >
      <Search className="h-[18px] w-[18px] shrink-0 text-mist" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        onFocus={onFocus}
        placeholder="Qual ideia você quer desvendar?"
        aria-label="Ideia para desvendar"
        disabled={loading}
        autoComplete="off"
        maxLength={200}
        className={`min-w-0 flex-1 bg-transparent font-light tracking-tight text-cream outline-none placeholder:text-mist/55 disabled:opacity-60 ${
          compact ? 'py-2 text-base' : 'py-3 text-lg sm:text-xl'
        }`}
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className={`btn-aurora flex shrink-0 items-center gap-2 rounded-full font-semibold tracking-tight ${
          compact ? 'h-10 px-5 text-sm' : 'h-12 px-6 text-base'
        }`}
      >
        {loading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <span>Tecelar</span>
            <ArrowUpRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
