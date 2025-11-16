# Savi Bütçe v.1 - Supabase Edition

Modern budget management system powered by Supabase PostgreSQL database with secure user authentication.

## Features

- 🔐 User authentication & session management
- 💰 Income/Expense tracking
- 👥 Student management
- 🎯 Fee management  
- 📊 Reports and analytics
- 📈 Excel export/import
- 🎨 Modern UI with Dancing Script font
- 🗄️ Supabase PostgreSQL backend
- 🐳 Docker & Coolify ready

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Vanilla JS + Tailwind CSS
- **Charts**: Chart.js
- **Icons**: Font Awesome

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd savi-budget-supabase
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Setup Supabase database**
   - Open Supabase Dashboard → SQL Editor
   - Run `supabase/reset_schema.sql` (creates main tables)
   - Run `supabase/add_users_table.sql` (creates users table)

5. **Start the server**
   ```bash
   npm start
   ```

6. **Login**
   - Navigate to `http://localhost:3000`
   - Default credentials:
     - Username: `admin`
     - Password: `admin123`
   - **⚠️ Change the password immediately after first login!**

### Coolify Deployment

See [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md) for detailed deployment instructions.

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Server Configuration
PORT=3000
NODE_ENV=production

# Session Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=your_random_secret_key
```

## Database Schema

### Main Tables
- `categories` - Income/expense categories
- `students` - Student information
- `transactions` - Financial transactions
- `student_fees` - Student fee assignments
- `payments` - Fee payments

### Authentication
- `users` - User accounts with bcrypt password hashing

## License

MIT License