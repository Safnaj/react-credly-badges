# react-credly-badges

A lightweight React + TypeScript library for displaying public Credly badges
using a Credly username.

- Horizontal and vertical layouts.
- Badge images link to their Credly verification pages.
- Fetches badges through a hosted Cloudflare Worker; no application backend required.
- Supports React 17, 18.2, and 19.

## Usage

```tsx
import { CredlyBadges } from 'react-credly-badges';

<CredlyBadges username="ahamed-safnaj" direction="horizontal" />;
```

Use `direction="vertical"` for a column.

Setup guidelines will be added later.

## Note

This is an unofficial integration that displays public badges only.
Your username is sent to the hosted Worker to retrieve badges.
