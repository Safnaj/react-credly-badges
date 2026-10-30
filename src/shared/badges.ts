export interface CredlyBadge {
  id: string;
  name: string;
  imageUrl: string;
  url: string;
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
    };
  });
}
