import * as React from "react";
import type { CredlyBadge } from "../shared/badges";

interface BadgeItemProps {
  badge: CredlyBadge;
}

export function BadgeItem({ badge }: BadgeItemProps) {
  return (
    <li>
      <a href={badge.url} target='_blank' rel='noopener noreferrer'>
        <img
          src={badge.imageUrl}
          alt={badge.name}
          width={120}
          height={120}
          loading='lazy'
          style={{ objectFit: "contain" }}
        />
      </a>
    </li>
  );
}
