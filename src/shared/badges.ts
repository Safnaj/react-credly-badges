export interface CredlyBadge {
  id: string;
  name: string;
  imageUrl: string;
  url: string;
  issuerName?: string | null;
  issuedAt?: string | null;
}

export function sortBadgesByIssuer(badges: CredlyBadge[]): CredlyBadge[] {
  const issuers = new Map<string | null, CredlyBadge[]>();

  for (const badge of badges) {
    const issuer = badge.issuerName ?? null;
    const issuerBadges = issuers.get(issuer);
    if (issuerBadges) {
      issuerBadges.push(badge);
    } else {
      issuers.set(issuer, [badge]);
    }
  }

  return Array.from(issuers.values()).flatMap((issuerBadges) =>
    issuerBadges
      .map((badge, index) => ({ badge, index }))
      .sort((a, b) => {
        const aDate = a.badge.issuedAt ? Date.parse(a.badge.issuedAt) : null;
        const bDate = b.badge.issuedAt ? Date.parse(b.badge.issuedAt) : null;

        if (aDate === null && bDate === null) return a.index - b.index;
        if (aDate === null) return 1;
        if (bDate === null) return -1;
        return bDate - aDate || a.index - b.index;
      })
      .map(({ badge }) => badge),
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isHttpsUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;

  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseBadges(value: unknown): CredlyBadge[] {
  const isWorkerResponse = isRecord(value);
  const badges: unknown = isWorkerResponse ? value.badges : value;

  if (!Array.isArray(badges)) {
    throw new Error('The badges endpoint must return a JSON array or an object with a badges array.');
  }

  return badges.map((badge: unknown) => {
    const url = isRecord(badge)
      ? (isWorkerResponse ? badge.badgeUrl : badge.url)
      : undefined;

    if (
      !isRecord(badge) ||
      !isNonEmptyString(badge.id) ||
      !isNonEmptyString(badge.name) ||
      !isHttpsUrl(badge.imageUrl) ||
      !isHttpsUrl(url)
    ) {
      throw new Error('The badges endpoint returned an invalid badge.');
    }

    return {
      id: badge.id,
      name: badge.name,
      imageUrl: badge.imageUrl,
      url,
      issuerName: isNonEmptyString(badge.issuerName)
        ? badge.issuerName.trim()
        : null,
      issuedAt:
        isNonEmptyString(badge.issuedAt) &&
        !Number.isNaN(Date.parse(badge.issuedAt))
          ? badge.issuedAt
          : null,
    };
  });
}
