// Small stroke icons. Decorative: the buttons around them carry the words.
const Svg = ({ size = 16, children }) => (
  <svg className="ic" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    {children}
  </svg>
);

export const PlusIcon = (props) => (
  <Svg {...props}>
    <path d="M8 3v10M3 8h10" />
  </Svg>
);

export const ChevronIcon = (props) => (
  <Svg {...props}>
    <path d="M6 4l4 4-4 4" />
  </Svg>
);

export const CloseIcon = (props) => (
  <Svg {...props}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Svg>
);

export const PencilIcon = (props) => (
  <Svg {...props}>
    <path d="M10.9 2.7a1.6 1.6 0 0 1 2.3 0l.1.1a1.6 1.6 0 0 1 0 2.3L6 12.4l-3.1.7.7-3.1 7.3-7.3Z" />
  </Svg>
);

export const InfoIcon = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="8" r="6.2" />
    <path d="M8 7.2v3.6M8 5.1v.1" />
  </Svg>
);

export const AlertIcon = (props) => (
  <Svg {...props}>
    <circle cx="8" cy="8" r="6.2" />
    <path d="M8 4.8v4M8 11.2v.1" />
  </Svg>
);

export const CheckIcon = (props) => (
  <Svg {...props}>
    <path d="M3.5 8.5l3 3 6-7" />
  </Svg>
);

export const SearchIcon = (props) => (
  <Svg {...props}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5 14 14" />
  </Svg>
);

export const BuyArrow = (props) => (
  <Svg size={12} {...props}>
    <path d="M4.5 11.5l7-7M5.5 4.5h6v6" />
  </Svg>
);

export const ShortArrow = (props) => (
  <Svg size={12} {...props}>
    <path d="M4.5 4.5l7 7M11.5 5.5v6h-6" />
  </Svg>
);

export const LotBranch = () => (
  <svg className="ic" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2 0v6a3 3 0 0 0 3 3h8" />
  </svg>
);

// ↑ when sorted ascending, ↓ descending, ↕ when not sorted by this column.
export function SortIcon({ dir }) {
  return (
    <Svg size={12}>
      {dir === 'asc' && <path d="M8 12V4M5 7l3-3 3 3" />}
      {dir === 'desc' && <path d="M8 4v8M5 9l3 3 3-3" />}
      {!dir && <path d="M5 6l3-3 3 3M5 10l3 3 3-3" />}
    </Svg>
  );
}

// Three rising bars: the app's mark, and the term glyph (one bar short, two mid, three long).
export function BrandMark({ className = 'brand__mark', size = 28 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="7" />
      <rect x="8" y="15" width="3" height="5" rx="1" />
      <rect x="12.5" y="12" width="3" height="8" rx="1" />
      <rect x="17" y="9" width="3" height="11" rx="1" />
    </svg>
  );
}
