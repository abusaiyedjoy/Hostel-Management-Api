# Hostel Management API Server

A comprehensive backend system for managing hostel operations, including users, mess management, meal tracking, and financial transactions.

## 🚀 Features

### 🔐 Authentication & Authorization

- **Secure Registration**: Email-based registration with password hashing
- **Login System**: Email/password authentication with JWT tokens
- **Role-Based Access Control**:
  - `ADMIN`: Full system access
  - `MESS_MANAGER`: Manage mess operations
  - `MEAL_MANAGER`: Manage meal plans and expenses
  - `MEMBER`: Hostel residents
- **Protected Routes**: Middleware to secure API endpoints
- **Profile Management**: Get and update user profile
- **Password Management**: Change password functionality

### 👥 User Management

- **User Profiles**: Name, email, phone, profile picture
- **Role Management**: Assign roles during registration
- **Status Management**: Activate/deactivate user accounts

### 🍽️ Mess Management

- **Mess Creation**: Create and manage messes with location and pricing
- **Mess Details**: View mess information including rate per meal
- **Role-Specific Views**: Different data visibility for different roles

### 📊 Meal Management

- **Meal Tracking**: Log meals with date and meal type (breakfast, lunch, dinner)
- **Meal History**: View personal meal history
- **Meal Statistics**: Track meal patterns and trends

### 💰 Financial Management

- **Balance Tracking**: Real-time balance updates for members
- **Transaction History**: View all financial transactions
- **Payment Integration**: Support for payment transactions

### 🛡️ Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **JWT Authentication**: JSON Web Tokens for secure session management
- **Input Validation**: Zod schema validation for all inputs
- **Error Handling**: Centralized error handling with custom error classes
- **Rate Limiting**: (Future) Implement rate limiting to prevent abuse

## 🛠️ Tech Stack

- **Runtime**: [Bun](https://bun.sh) v1.3.10
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://prisma.io)
- **Validation**: [Zod](https://zod.dev/)
- **Authentication**: [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- **Password Hashing**: [bcryptjs](https://github.com/kelektiv/node-bcrypt)
- **Environment Management**: [dotenv](https://github.com/motdotla/dotenv)

## 📂 Project Structure

```
src/
├── app/
│   ├── config/         # Application configuration
│   │   ├── env.ts      # Environment variable management
│   │   └── prisma.ts   # Database configuration
│   ├── middlewares/    # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   └── validateRequest.middleware.ts
│   ├── modules/        # Application modules
│   │   └── auth/       # Authentication module
│   │       ├── auth.controller.ts
│   │       ├── auth.route.ts
│   │       ├── auth.service.ts
│   │       └── auth.validation.ts
│   ├── routes/         # API routes
│   │   └── app.routes.ts
│   ├── utils/          # Utility functions
│   │   ├── AppError.ts
│   │   ├── asyncHandler.ts
│   │   ├── httpStatus.ts
│   │   ├── jwt.ts
│   │   └── response.ts
│   └── server.ts       # Server entry point
├── seed.ts             # Database seeding script
├── index.ts            # Application entry point
├── package.json
├── bun.lock
├── tsconfig.json
└── prisma.config.ts
```

## ⚙️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/abusaiyedjoy/Hostel-Management-Api.git
   cd Hostel-Management-Api
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

````

To run:

```bash
bun run dev
````

This project was created using `bun init` in bun v1.3.10. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
