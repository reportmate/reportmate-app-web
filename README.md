# ReportMate Web Dashboard

A Next.js dashboard for the ReportMate fleet, part of the ReportMate ecosystem. It reads device, module and event data from the [ReportMate API](https://github.com/reportmate/reportmate-api), a FastAPI service backed by PostgreSQL, and receives live events through Azure Web PubSub.

## Features

- **Real-time Event Streaming** via Azure Web PubSub with automatic reconnection
- **Professional Dashboard UI** inspired by MunkiReport's event module
- **Status-based Event Display** with color-coded indicators and icons
- **Smart Payload Formatting** that adapts to different data types
- **Live Connection Status** with visual indicators
- **Modern Design** with glassmorphism effects and smooth animations
- **Responsive Layout** that works on all screen sizes
- **Dark Theme** optimized for monitoring environments
- **Modular Architecture** with a module registry, widgets and charts per reporting module

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- A reachable [ReportMate API](https://github.com/reportmate/reportmate-api) (FastAPI)

### 1. Installation

```bash
git clone https://github.com/reportmate/reportmate-app-web.git
cd reportmate-app-web
pnpm install
```

### 2. Environment Setup

```bash
cp .env.local.example .env.local
```

Configure your environment variables in `.env.local`:

```env
API_BASE_URL=https://your-reportmate-api.example.com
API_INTERNAL_SECRET=<shared-secret-also-set-on-the-api>
NEXT_PUBLIC_ENABLE_SIGNALR=true
```

### 3. Development

```bash
pnpm dev
```

Visit **http://localhost:3000/dashboard** to see the dashboard.

### 4. Production Build

```bash
pnpm build
pnpm start
```

## Dashboard Features

### Main Dashboard (`/dashboard`)
- Real-time event monitoring
- Device status overview
- Event timeline with filtering
- Connection status indicators

### Device Details (`/device/[deviceId]`)

- Individual device information
- Hardware and software inventory
- Security status and compliance
- Event history and logs

### Module Reports

- One fleet report per module: `/applications`, `/hardware`, `/identity`, `/installs`, `/inventory`, `/management`, `/network`, `/peripherals`, `/security` and `/system`
- Events at `/events` and settings at `/settings`

## Testing & Demo

### Demo Mode

Set `DEMO_MODE=true` to bypass sign-in and run the dashboard read-only, as described in [src/lib/demo-mode.ts](src/lib/demo-mode.ts).

### Checks

Continuous integration runs the same checks on every pull request.

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

Playwright tests in [e2e](e2e) check the API, its endpoints and the frontend routes against a running instance.

```bash
pnpm test:e2e
pnpm test:api-health
pnpm test:api-endpoints
pnpm test:routes
```

## Docker Support

### Development

```bash
docker build -t reportmate-web .
docker run -p 3000:3000 reportmate-web
```

### Production

The Dockerfile is optimized for production deployment with:
- Multi-stage builds for smaller images
- Next.js standalone output
- Environment variable injection

Tagged releases are published to the GitHub Container Registry by [the publish workflow](.github/workflows/ghcr-publish.yml).

## Architecture

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Backend**: route handlers under [app/api](app/api) proxy each request to the FastAPI service named by `API_BASE_URL`
- **Real-time**: Azure Web PubSub, using a token minted by the API's negotiate endpoint
- **Authentication**: NextAuth with Entra ID, Google and credentials providers
- **Type Safety**: TypeScript
- **Package Manager**: pnpm
- **Deployment**: Docker standalone image, self-hosted with [Docker Compose](https://github.com/reportmate/selfhosted-docker-reportmate) or on Azure or AWS through the ReportMate Terraform modules

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_BASE_URL` | ReportMate API (FastAPI) base URL | Yes |
| `API_INTERNAL_SECRET` | Shared secret sent to the API as `X-Internal-Secret` | Yes, in production |
| `NEXTAUTH_SECRET` | NextAuth session secret | Yes |
| `NEXTAUTH_URL` | Public URL of the dashboard | Yes, in production |
| `NEXT_PUBLIC_ENABLE_SIGNALR` | Enable live events through Web PubSub | No (off unless `true`) |
| `DEMO_MODE` | Bypass sign-in and run read-only | No |

[.env.example](.env.example) lists the authentication provider settings.

### Next.js Configuration

The project uses Next.js standalone output for optimal Docker deployment:

```javascript
const nextConfig = {
  output: 'standalone',
}
```

## Module System

Each reporting module (hardware, installs, security, network and so on) registers its widgets and charts with the module registry in [src/lib/modules](src/lib/modules). [src/lib/data-processing](src/lib/data-processing) turns API responses into the shapes the module pages render; [MODULAR_MIGRATION.md](MODULAR_MIGRATION.md) describes that split.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) - see the [LICENSE](LICENSE) file for details. A separate commercial license is available for organizations whose policies do not permit AGPL.

## Related Projects

- [ReportMate API](https://github.com/reportmate/reportmate-api) - FastAPI backend and PostgreSQL schema
- [ReportMate Windows Client](https://github.com/reportmate/reportmate-client-win) - Windows data collection client
- [ReportMate Mac Client](https://github.com/reportmate/reportmate-client-mac) - macOS data collection client
- [Self-hosted Docker](https://github.com/reportmate/selfhosted-docker-reportmate) - Docker Compose stack
- [Terraform for Azure](https://github.com/reportmate/terraform-azurerm-reportmate) and [AWS](https://github.com/reportmate/terraform-aws-reportmate) - cloud deployment

## Support

- [Development wiki](wiki/README.md)
- [Website](https://reportmate.app)
- [Issues](https://github.com/reportmate/reportmate-app-web/issues)
- [Discussions](https://github.com/reportmate/reportmate-app-web/discussions)
