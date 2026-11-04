import React, { useEffect } from "react";
import type { CSSProperties } from "react";
import { groupBadgesByIssuer, parseBadges } from "../shared/badges";
import type { CredlyBadge } from "../shared/badges";
import { BadgeItem } from "./BadgeItem";

export interface CredlyBadgesProps {
  username: string;
  direction?: "horizontal" | "vertical";
  groupBy?: "issuer";
  endpoint?: string;
  className?: string;
  style?: CSSProperties;
}

type BadgeState =
  | { key: string; status: "loading" }
  | { key: string; status: "success"; badges: CredlyBadge[] }
  | { key: string; status: "error"; message: string };

export function CredlyBadges({
  username,
  direction = "horizontal",
  groupBy,
  endpoint = "https://react-credly-badges.safnaj99.workers.dev/",
  className,
  style,
}: CredlyBadgesProps) {
  const key = JSON.stringify([username, endpoint]);
  const [state, setState] = React.useState<BadgeState>({
    key,
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ key, status: "loading" });

    async function loadBadges() {
      try {
        if (!username.trim()) {
          throw new Error("A Credly username is required.");
        }

        const url = new URL(endpoint, window.location.href);
        url.searchParams.set("username", username.trim());
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Unable to load Credly badges (HTTP ${response.status}).`,
          );
        }

        const payload: unknown = await response.json();
        const badges = parseBadges(payload);
        if (active) setState({ key, status: "success", badges });
      } catch (error: unknown) {
        if (active) {
          setState({
            key,
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to load Credly badges.",
          });
        }
      }
    }

    void loadBadges();

    return () => {
      active = false;
      controller.abort();
    };
  }, [username, endpoint, key]);

  // Hide results from the previous profile before the next effect runs.
  const current: BadgeState =
    state.key === key ? state : { key, status: "loading" };
  const groupedBadges =
    current.status === "success" && groupBy === "issuer"
      ? groupBadgesByIssuer(current.badges)
      : [];

  return (
    <div className={className} style={style}>
      {current.status === "loading" && (
        <p role='status'>Loading Credly badges...</p>
      )}
      {current.status === "error" && <p role='alert'>{current.message}</p>}
      {current.status === "success" &&
        (current.badges.length === 0 ? (
          <p role='status'>No public Credly badges found.</p>
        ) : (
          <ul
            aria-label={`Credly badges for ${username}`}
            style={{
              display: "flex",
              flexDirection: direction === "vertical" ? "column" : "row",
              flexWrap: direction === "vertical" ? "nowrap" : "wrap",
              gap: "1rem",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            {groupBy === "issuer"
              ? groupedBadges.map(({ issuer, badges }) => (
                  <li key={issuer}>
                    <h2>{issuer}</h2>
                    <ul
                      aria-label={`Credly badges from ${issuer}`}
                      style={{
                        display: "flex",
                        flexDirection:
                          direction === "vertical" ? "column" : "row",
                        flexWrap: direction === "vertical" ? "nowrap" : "wrap",
                        gap: "1rem",
                        listStyle: "none",
                        margin: 0,
                        padding: 0,
                      }}
                    >
                      {badges.map((badge) => (
                        <BadgeItem key={badge.id} badge={badge} />
                      ))}
                    </ul>
                  </li>
                ))
              : current.badges.map((badge) => (
                  <BadgeItem key={badge.id} badge={badge} />
                ))}
          </ul>
        ))}
    </div>
  );
}
