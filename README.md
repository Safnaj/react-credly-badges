# react-credly-badges

A lightweight React + TypeScript component for displaying public Credly badges.
Supports React 17, 18.2, and 19, with horizontal or vertical layouts and optional
grouping by issuer. Badge images link to their Credly verification pages.

## Setup

Install the library in your React application:

```sh
npm install react-credly-badges
```

Import the component and pass your Credly profile username:

```tsx
import { CredlyBadges } from "react-credly-badges";

export default function App() {
  return <CredlyBadges username='ahamed-safnaj' />;
}
```

No API key or application backend is required. Only public badges are available.
In frameworks with server components, render this component inside a client
component.

### Options

| Prop        | Description                                              | Default                  |
| ----------- | -------------------------------------------------------- | ------------------------ |
| `username`  | Credly profile username (required).                      | -                        |
| `direction` | `"horizontal"` or `"vertical"`.                          | `"horizontal"`           |
| `groupBy`   | Set to `"issuer"` to group badges under issuer headings. | No grouping              |
| `endpoint`  | URL of a compatible proxy, if self-hosting.              | Hosted Cloudflare Worker |
| `className` | CSS class for the outer container.                       | -                        |
| `style`     | Inline styles for the outer container.                   | -                        |

```tsx
<CredlyBadges username='ahamed-safnaj' direction='vertical' groupBy='issuer' />
```

Without grouping, badges retain the endpoint's order. Issuer groups follow their
first appearance in the response; badges within each group are sorted newest
first, with undated badges last. Missing issuers appear under "Unknown issuer".

## How the proxy works

The component sends the username to a hosted Cloudflare Worker. The Worker
fetches public badge data from Credly, validates and normalizes it, and returns
JSON with CORS headers so the browser can read it. Images load directly from
their source URLs; the Worker does not proxy image bytes.

Cloudflare Workers provides a serverless endpoint and edge caching without
requiring every application to run its own backend. Responses are
cached for six hours, with a stale copy available for up to seven days when
Credly is unavailable.

The proxy source is in [worker/worker.js](worker/worker.js) and is deployed
separately from the npm package. To self-host, deploy it as a Cloudflare Worker
and pass its URL through `endpoint`.

## Development

Use Node.js 24 and npm.

```sh
npm ci
npm run typecheck
npm run lint
npm run build
```

Use [Conventional Commits](https://www.conventionalcommits.org/), such as
`feat: group badges by issuer`, `fix: handle empty responses`, or
`docs: update setup instructions`. Commit messages and PR titles are checked
in CI.

## Releases

After CI passes on `main`, semantic-release publishes release-worthy changes
to npm and creates a GitHub release. Versions are determined from Conventional
Commits; no manual version bump is needed.

## License and disclaimer

This package is `UNLICENSED`; no open-source license or permission to reuse the
code is granted.

This is an unofficial integration, not affiliated with or endorsed by Credly.
Your username is sent to the configured proxy to retrieve public badges.
