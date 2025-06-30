# ReportMate Web Dashboard

A Next.js-based real-time dashboard for monitoring fleet events via SignalR, part of the ReportMate ecosystem.

## ✨ Features

- **Real-time Event Streaming** via SignalR with automatic reconnection
- **Professional Dashboard UI** inspired by MunkiReport's event module
- **Status-based Event Display** with color-coded indicators and icons
- **Smart Payload Formatting** that adapts to different data types
- **Live Connection Status** with visual indicators
- **Modern Design** with glassmorphism effects and smooth animations
- **Responsive Layout** that works on all screen sizes
- **Dark Theme** optimized for monitoring environments
- **Modular Architecture** with plugin system for extensibility

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- ReportMate backend services (Azure Functions)

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
NEXT_PUBLIC_WPS_URL=wss://<your-pubsub>.webpubsub.azure.com/client/?hub=fleet
NEXT_PUBLIC_WPS_TOKEN=<jwt-from-/api/negotiate>
NEXT_PUBLIC_API_BASE_URL=https://reportmate-api.azurewebsites.net
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

## 📱 Dashboard Features

### Main Dashboard (`/dashboard`)
- Real-time event monitoring
- Device status overview
- Event timeline with filtering
- Connection status indicators

### Device Details (`/device-new/[deviceId]`)
- Individual device information
- Hardware and software inventory
- Security status and compliance
- Event history and logs

### Module Management (`/modules`)
- Install/uninstall dashboard modules
- Enable/disable functionality
- Module configuration
- Community module discovery

## 🧪 Testing & Demo

### Demo Data Generation

```bash
# Generate demo events (default: 10 events every 3 seconds)
pnpm demo

# Fast demo (20 events every 1 second)
pnpm demo:fast

# Slow demo (5 events every 5 seconds)  
pnpm demo:slow
```

### API Testing

Test the backend connection:

```bash
# Health check
curl https://reportmate-api.azurewebsites.net/api/negotiate?device=test-device

# Send test event
curl -X POST https://reportmate-api.azurewebsites.net/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "device": "device-001",
    "kind": "info",
    "payload": {"message": "Test event from web dashboard"}
  }'
```

## 🐳 Docker Support

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
- Health checks

## 🏗️ Architecture

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS 4.x
- **Real-time**: SignalR (@microsoft/signalr)
- **Type Safety**: TypeScript
- **Package Manager**: pnpm
- **Deployment**: Docker + Azure Container Apps

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_WPS_URL` | Azure Web PubSub WebSocket URL | Yes |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | Yes |
| `NEXT_PUBLIC_ENABLE_SIGNALR` | Enable real-time features | No (default: true) |

### Next.js Configuration

The project uses Next.js standalone output for optimal Docker deployment:

```javascript
// next.config.mjs
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  }
}
```

## 📦 Module System

The dashboard supports a modular plugin architecture:

- **Core Modules**: Built-in functionality (device overview, events, etc.)
- **Official Modules**: Maintained by the ReportMate team
- **Community Modules**: Third-party extensions
- **Runtime Loading**: Install/remove modules without redeployment

See the [Module Development Guide](docs/modules.md) for creating custom modules.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [ReportMate Infrastructure](https://github.com/reportmate/reportmate-infra-azure) - Azure infrastructure and backend
- [ReportMate Windows Client](https://github.com/reportmate/reportmate-client-win) - Windows data collection client
- [ReportMate Modules](https://github.com/reportmate) - Official and community modules

## 💬 Support

- [Documentation](https://docs.reportmate.io)
- [Issues](https://github.com/reportmate/reportmate-app-web/issues)
- [Discussions](https://github.com/reportmate/reportmate-app-web/discussions)
