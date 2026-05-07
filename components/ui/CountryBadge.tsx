import {
  getCountryFlagUrl,
  getCountryName,
  normalizeCountryCode,
} from "@/constants/countries";

type CountryBadgeProps = {
  country?: string | null;
  className?: string;
  showName?: boolean;
};

export default function CountryBadge({
  country,
  className = "",
  showName = true,
}: CountryBadgeProps) {
  const code = normalizeCountryCode(country);
  const name = code ? getCountryName(code) : "Unknown country";
  const flagUrl = getCountryFlagUrl(code, 40);
  const flagUrl2x = getCountryFlagUrl(code, 80);

  if (!code || !flagUrl) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <span className="text-base">🌐</span>
        {showName ? <span>{name}</span> : null}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={flagUrl}
        srcSet={`${flagUrl2x} 2x`}
        width={22}
        height={16}
        alt={`${name} flag`}
        className="h-4 w-[22px] rounded-[3px] object-cover shadow-sm"
      />
      {showName ? <span>{name}</span> : null}
    </span>
  );
}