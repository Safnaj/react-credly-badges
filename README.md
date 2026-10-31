# react-credly-badges

A lightweight React + TypeScript library for displaying public Credly badges
using a Credly username.

- Horizontal and vertical layouts.
- Badge images link to their Credly verification pages.
- Fetches badges through a hosted Cloudflare Worker; no application backend required.
- Supports React 17, 18.2, and 19.

## Usage

```sh
npm install react-credly-badges
```

```tsx
import { CredlyBadges } from 'react-credly-badges';

<CredlyBadges username="ahamed-safnaj" direction="horizontal" />;
```

Use `direction="vertical"` for a column.

## Development

Use Node.js 24 and npm. The tooling also supports Node.js 22.14
or newer on the Node.js 22 line.

```sh
npm ci
npm run typecheck
npm run lint
npm run build
npm pack --dry-run
```

There is currently no automated test suite. CI checks types, linting, the build,
and the package contents. Only the built library and package documentation are published;
the Cloudflare Worker is deployed separately and is not shipped in the npm package.
`prepack` runs typechecking, linting, and the build before packing or publishing.

The commitlint and release workflows select Node.js 24 directly. If you use nvm
locally, run `nvm install 24` and `nvm use 24`.

### Commit conventions

`npm ci` installs the Husky `commit-msg` hook. Commitlint enforces
[Conventional Commits](https://www.conventionalcommits.org/), for example:

```text
feat: add a badge size option
fix: handle an empty badge response
docs: clarify worker configuration
feat!: change the component API
```

`fix` commits produce patch releases, `feat` commits produce minor releases, and
breaking changes (`!` or a `BREAKING CHANGE:` footer) produce major releases.
Other commit types do not trigger a release by default. PR commits and PR titles
are checked in CI. Prefer squash merges and preserve the validated PR title and
any breaking-change footer in the final commit message.

To check a message manually:

```sh
printf '%s\n' 'feat: add a badge size option' | npm run commitlint
```

## Releases

The [CI workflow](.github/workflows/ci.yml) runs typechecking, linting, package
builds, and package inspection on Node.js 22 and 24 for pull requests.
The separate [Release workflow](.github/workflows/release.yml) runs on pushes to
`main` and calls the same reusable CI workflow before publishing. After both
matrix CI jobs pass, semantic-release analyzes commits, selects the next version,
publishes to npm, and creates a Git tag and GitHub release with generated release
notes. PRs never publish. The Release workflow can also be run manually on `main`
to retry a release; commits without a release-worthy change do not publish a new version.

Versions are written into the published package during release, not committed
back to `main`. Git tags and npm are the source of truth for released versions;
do not manually bump the source version for subsequent releases. No release
commits or personal GitHub access tokens are needed.

### One-time maintainer setup

1. Keep this GitHub repository public so npm can generate provenance. Enable
   GitHub Actions and protect `main`, requiring both matrix CI checks and
   `Conventional commits` before merging. Restrict direct pushes.
2. The npm package must exist before its trusted publisher can be configured.
   For this unpublished package, sign in with an npm account that can publish
   `react-credly-badges`, and bootstrap the current version once:

   ```sh
   npm ci
   npm login
   npm publish --access public
   git tag v0.1.0
   git push origin v0.1.0
   ```

   Run this from a clean, committed checkout on `main`, before enabling the
   first automated release. Tag the exact commit used to publish. If a version
   already exists on npm, instead ensure its corresponding Git tag is present;
   do not publish it again. The bootstrap tag tells semantic-release where
   the existing release history starts. Without any release tags,
   semantic-release's first release defaults to `1.0.0`.
3. In the npm package settings, add a **GitHub Actions trusted publisher** with:
   - Organization or user: `Safnaj`
   - Repository: `react-credly-badges`
   - Workflow filename: `release.yml` (the caller workflow that publishes).
   - Environment: leave blank (the release job does not use an environment).
4. After verifying trusted publishing, disable token-based publishing in the
   npm package settings where available. No `NPM_TOKEN` secret is required:
   the release job uses OIDC (`id-token: write`), and npm automatically attaches
   provenance. GitHub releases use the built-in `GITHUB_TOKEN`, with write
   access limited to the release job.
5. Merge a release-worthy Conventional Commit into `main` or manually run the
   workflow after setup. Do not run `npm run release` locally to publish;
   trusted publishing is authorized only from the configured GitHub workflow.

## License

This package is currently unlicensed (`UNLICENSED`); no open-source license or
permission to reuse the code is granted. Choose a license before distributing
it as an open-source library.

## Note

This is an unofficial integration that displays public badges only.
Your username is sent to the hosted Worker to retrieve badges.
