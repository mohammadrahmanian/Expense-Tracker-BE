# Expense Tracker - Backend API

A robust RESTful API backend for tracking personal finances, built with Fastify, TypeScript, and Prisma.

## Features

- **User Authentication**: Secure JWT-based authentication system
- **Transaction Management**: Create, read, update, and delete income and expense transactions
- **Category Management**: Organize transactions with hierarchical categories
- **Recurring Transactions**: Automate regular income and expenses with scheduled cron jobs
- **Dashboard & Reports**: Get financial insights with customizable date ranges
- **CSV Import**: Bulk upload transactions via CSV files
- **Error Tracking**: Integrated Sentry monitoring for production reliability
- **API Documentation**: Interactive Swagger/OpenAPI documentation

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: JSON Schema via Fastify
- **File Processing**: CSV parsing for bulk imports
- **Monitoring**: Sentry (error tracking & profiling)
- **Testing**: Vitest
- **API Docs**: Swagger/OpenAPI

## Prerequisites

- Node.js (v18 or higher recommended)
- PostgreSQL (v13 or higher)
- npm or yarn package manager

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/mohammadrahmanian/Expense-Tracker-be.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Create a PostgreSQL database for the project:

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE expense_tracker;

# Create user (optional)
CREATE USER expense_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE expense_tracker TO expense_user;
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/expense_tracker?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
SENTRY_DSN="your-sentry-dsn-url"  # Optional
PORT=5000
HOST=0.0.0.0
NODE_ENV=development
```

### 5. Run Database Migrations

```bash
npx prisma migrate dev
```

This will create all the necessary tables in your database.

### 6. Start the Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm test` - Run tests in watch mode
- `npx prisma studio` - Open Prisma Studio for database management
- `npx prisma migrate dev` - Create and apply database migrations
- `npx prisma generate` - Generate Prisma Client

## API Documentation

Once the server is running, access the interactive API documentation at:

```
http://localhost:5000/docs
```

## Error Tracking

The application integrates with Sentry for error tracking and performance monitoring. Set the `SENTRY_DSN` environment variable to enable this feature.

## Project Structure

```
src/
├── config/           # Configuration constants
├── controllers/      # Request handlers
├── jobs/            # Cron jobs
├── plugins/         # Fastify plugins (auth, prisma)
├── routes/          # Route definitions
├── schemas/         # JSON schemas for validation
├── services/        # Business logic
├── types/           # TypeScript type definitions
└── utils/           # Helper functions and validators

prisma/
└── schema.prisma    # Database schema

app.ts               # Application entry point
```

## Development Tips

1. **Prisma Studio**: Use `npx prisma studio` to visually manage your database
2. **Database Reset**: Use `npx prisma migrate reset` to reset your database (dev only)
3. **API Testing**: Use the Swagger UI at `/docs` for interactive API testing
4. **Logs**: Check the console for detailed request/response logs via Fastify logger

## Frontend Integration

This backend application can be used standalone or with the Expense Tracker frontend. See the [frontend repository](https://github.com/mohammadrahmanian/Expense-tracker) for setup instructions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

GNU Affero General Public License v3.0 (AGPL-3.0)

See [LICENSE](./LICENSE) for details.
