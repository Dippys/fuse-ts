# FuseTS - Habbo Hotel Emulator

FuseTS is an advanced Habbo Hotel emulator built using TypeScript and Node.js, designed to recreate the classic Habbo Hotel experience with modern technologies and best practices.

![FuseTS Logo](https://via.placeholder.com/800x200?text=FuseTS+Habbo+Hotel+Emulator)

## Features

- **TypeScript-Based**: Fully type-safe codebase for robust development
- **Modern Architecture**: Leverages the latest Node.js features and practices
- **Database Integration**: Uses Prisma ORM with PostgreSQL for efficient data management
- **Real-time Communication**: Implements both TCP sockets and WebSockets for client connectivity
- **Secure Authentication**: Features encryption and secure authentication flows
- **Redis Caching**: Implements Redis for fast in-memory caching
- **Structured Logging**: Comprehensive logging system using Pino

## Prerequisites

- Node.js v21.0.0 or higher
- PostgreSQL database
- Redis server
- TypeScript knowledge

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/fuse-ts.git
cd fuse-ts
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy the example environment file and adjust the settings:

```bash
cp .env.example .env
```

Then edit the `.env` file with your database credentials and other settings.

4. **Set up the database**

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. **Build the project**

```bash
npm run build
```

## Usage

### Development Mode

```bash
npm run dev
```

This starts the server with hot-reloading enabled.

### Production Mode

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── cache/         # Redis caching implementation
├── config/        # Configuration files including RSA settings
├── database/      # Database models and Prisma schema
├── game/          # Game logic and mechanics
├── network/       # Network handling and protocol implementation
│   ├── handlers/  # Message handlers for client requests
│   ├── protocol/  # Protocol encoding/decoding
│   ├── sockets/   # TCP socket implementation
│   └── websockets/# WebSocket implementation
├── security/      # Security implementations including encryption
├── user/          # User management and authentication
└── utils/         # Utility functions and helpers
```

## Database Schema

The database includes models for:

- Users
- Rooms
- Items
- Friendships
- Badges
- Catalog items

## Development

### Adding New Features

1. Identify the component where your feature belongs
2. Create new TypeScript files with appropriate interfaces and types
3. Implement the feature logic
4. Register any new message handlers in the HandlerRegistry
5. Test your implementation

### Coding Standards

This project follows strict TypeScript practices:

- Use explicit types whenever possible
- Follow the established architectural patterns
- Write comprehensive comments
- Use async/await for asynchronous operations

## Testing

*[TODO: Add testing instructions as they are implemented]*

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

*[TODO: Add license information]*

## Contact

*[TODO: Add contact information]*

---

FuseTS - Bringing back the Habbo Hotel experience with modern technologies