# Country Currency & Exchange API 🌍

A RESTful API that fetches country data from external APIs, stores it in a MySQL database, and provides CRUD operations with filtering, sorting, and image generation capabilities.

## 🚀 Features

- Fetch and cache country data with exchange rates
- Filter countries by region or currency
- Sort countries by GDP, population, or name
- Auto-generate summary images with top GDP countries
- Case-insensitive country search
- Comprehensive error handling

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running Locally](#running-locally)
- [API Endpoints](#api-endpoints)
- [Response Examples](#response-examples)
- [Error Handling](#error-handling)
- [Deployment](#deployment)

## 🛠 Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MySQL
- **ORM**: Drizzle ORM
- **Language**: TypeScript
- **Image Generation**: Canvas

## 📦 Prerequisites

- Node.js 18+ installed
- MySQL database (local or cloud)
- npm or yarn package manager

## 💾 Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd hng-backend-2
```

2. **Install dependencies**
```bash
npm install
```

3. **Install additional dependencies (if needed)**
```bash
# Canvas is already installed, but if you need to reinstall:
npm install canvas

# For Windows users having issues with canvas:
npm install @napi-rs/canvas
```

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=mysql://username:password@host:port/database_name
PORT=3000
```

**Example:**
```env
DATABASE_URL=mysql://root:password@localhost:3306/countries_db
PORT=3000
```

### For SSL Connection (Cloud databases):
```env
DATABASE_URL=mysql://user:pass@host:port/db?ssl={"rejectUnauthorized":false}
```

## 🗄️ Database Setup

1. **Create the database**
```sql
CREATE DATABASE countries_db;
USE countries_db;
```

2. **Run migrations**
```bash
# Generate migration
npm run db:generate

# Push to database
npm run db:push
```

Or manually create tables:

```sql
CREATE TABLE countries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  capital VARCHAR(100),
  region VARCHAR(100),
  population BIGINT NOT NULL,
  currency_code VARCHAR(10),
  exchange_rate DECIMAL(15, 4),
  estimated_gdp DECIMAL(20, 2),
  flag_url VARCHAR(255),
  last_refreshed_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE metadata (
  id INT PRIMARY KEY DEFAULT 1,
  total_countries INT,
  last_refreshed_at DATETIME,
  summary_image_path VARCHAR(255)
);
```

## 🏃 Running Locally

### Development Mode (with hot reload)
```bash
npm run dev
```

### Production Build
```bash
# Build TypeScript
npm run build

# Run built files
npm start
```

The server will start on `http://localhost:3000` (or your specified PORT)

## 📡 API Endpoints

### 1. Refresh Country Data
```http
POST /countries/refresh
```
Fetches all countries and exchange rates from external APIs and caches them in the database.

**Response:**
```json
{
  "message": "Country data refreshed successfully",
  "inserted": 250,
  "updated": 0,
  "total": 250
}
```

---

### 2. Get All Countries
```http
GET /countries
```

**Query Parameters:**
- `region` - Filter by region (e.g., `Africa`, `Europe`, `Asia`)
- `currency` - Filter by currency code (e.g., `NGN`, `USD`, `EUR`)
- `sort` - Sort results:
  - `gdp_desc` - Highest GDP first
  - `gdp_asc` - Lowest GDP first
  - `population_desc` - Highest population first
  - `population_asc` - Lowest population first
  - `name_asc` - Alphabetical A-Z (default)
  - `name_desc` - Alphabetical Z-A

**Examples:**
```bash
# Get all countries
GET /countries

# Get African countries
GET /countries?region=Africa

# Get countries using NGN currency
GET /countries?currency=NGN

# Get African countries sorted by GDP
GET /countries?region=Africa&sort=gdp_desc
```

---

### 3. Get Single Country
```http
GET /countries/:name
```

**Examples:**
```bash
GET /countries/Nigeria
GET /countries/United%20States
```

---

### 4. Delete Country
```http
DELETE /countries/:name
```

**Response:**
```json
{
  "message": "Country deleted successfully",
  "name": "Nigeria"
}
```

---

### 5. Get Status
```http
GET /status
```

**Response:**
```json
{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-26T14:30:00.000Z"
}
```

---

### 6. Get Summary Image
```http
GET /countries/image
```

Returns a PNG image with:
- Total countries count
- Top 5 countries by GDP
- Last refresh timestamp

---

## 📝 Response Examples

### Country Object
```json
{
  "id": 1,
  "name": "Nigeria",
  "capital": "Abuja",
  "region": "Africa",
  "population": 206139589,
  "currency_code": "NGN",
  "exchange_rate": 1600.23,
  "estimated_gdp": 25767448125.2,
  "flag_url": "https://flagcdn.com/ng.svg",
  "last_refreshed_at": "2025-10-26T18:00:00.000Z"
}
```

## ⚠️ Error Handling

### 404 Not Found
```json
{
  "error": "Country not found"
}
```

### 503 Service Unavailable
```json
{
  "error": "External data source unavailable",
  "details": "Could not fetch data from restcountries.com"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## 🧪 Testing Endpoints

### Using cURL

```bash
# Refresh data
curl -X POST http://localhost:3000/countries/refresh

# Get all countries
curl http://localhost:3000/countries

# Filter by region
curl http://localhost:3000/countries?region=Africa

# Get specific country
curl http://localhost:3000/countries/Nigeria

# Get status
curl http://localhost:3000/status

# Download image
curl http://localhost:3000/countries/image --output summary.png

# Delete country
curl -X DELETE http://localhost:3000/countries/Ghana
```

### Using Postman or Thunder Client

Import the following endpoints:
- POST: `{{baseUrl}}/countries/refresh`
- GET: `{{baseUrl}}/countries`
- GET: `{{baseUrl}}/countries/:name`
- DELETE: `{{baseUrl}}/countries/:name`
- GET: `{{baseUrl}}/status`
- GET: `{{baseUrl}}/countries/image`

## 🚀 Deployment

### Railway

1. Create a new project on [Railway](https://railway.app)
2. Add MySQL database addon
3. Connect your GitHub repository
4. Add environment variables:
   - `DATABASE_URL` (auto-filled by Railway)
   - `PORT` (optional, Railway auto-assigns)
5. Deploy!

### AWS/Heroku/Other Platforms

1. Ensure your database is accessible
2. Set environment variables
3. Build the project: `npm run build`
4. Start command: `npm start`

## 📁 Project Structure

```
hng-backend-2/
├── src/
│   ├── db/
│   │   └── schema.ts          # Database schema
│   ├── lib/
│   │   ├── types.ts           # TypeScript types
│   │   └── utils.ts           # Utility functions
│   └── index.ts               # Main application
├── cache/                     # Generated images
├── drizzle/                   # Database migrations
├── .env                       # Environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── drizzle.config.ts
```

## 🔧 Scripts

```json
{
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push"
}
```

## 📚 Dependencies

### Production
- `express` - Web framework
- `dotenv` - Environment variables
- `drizzle-orm` - ORM for MySQL
- `mysql2` - MySQL client
- `canvas` - Image generation

### Development
- `typescript` - Type safety
- `tsx` - TypeScript execution
- `drizzle-kit` - Database migrations
- `@types/express` - Express types
- `@types/node` - Node.js types

## 🐛 Troubleshooting

### Canvas Installation Issues (Windows)

If you encounter errors installing canvas:

1. Install Windows Build Tools:
```bash
npm install --global windows-build-tools
```

2. Or use the simpler alternative:
```bash
npm uninstall canvas
npm install @napi-rs/canvas
```

Then update the import in `src/lib/utils.ts`:
```typescript
import { createCanvas } from "@napi-rs/canvas";
```

### Database Connection Issues

- Verify `DATABASE_URL` format is correct
- Check if MySQL server is running
- Ensure database exists
- For cloud databases, check SSL settings

## 📄 License

MIT

## 👤 Author

**Your Name**
- GitHub: [@your-github]
- Email: your.email@example.com

## 🙏 Acknowledgments

- [REST Countries API](https://restcountries.com/)
- [Exchange Rates API](https://www.exchangerate-api.com/)
- HNG Internship Program

---

Made with ❤️ for HNG Backend Stage 2
