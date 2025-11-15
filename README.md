# Savi Bütçe v.1 - Supabase Edition

Modern budget management system powered by Supabase PostgreSQL database.

## Features

- 💰 Income/Expense tracking
- 👥 Student management
- 🎯 Fee management  
- 📊 Reports and analytics
- 📈 Excel export/import
- 🎨 Modern UI with Dancing Script font
- 🗄️ Supabase PostgreSQL backend

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Vanilla JS + Tailwind CSS
- **Charts**: Chart.js
- **Icons**: Font Awesome

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Supabase credentials in `.env`
4. Run: `npm start`

### Resetting the Supabase schema

If you need to drop every table and recreate them with the new Turkish column names, run the SQL script under `supabase/reset_schema.sql` inside the Supabase SQL editor or the Supabase CLI:

1. **Back up** your data first; the script wipes `payments`, `student_fees`, `transactions`, `students`, and `categories`.
2. Open the Supabase Dashboard → SQL Editor.
3. Paste the contents of `supabase/reset_schema.sql` and execute it.
4. Re-run `node -e "require('./database').initializeDatabase()"` locally to verify the connection and that the tables now exist.

## Environment Variables

Create a `.env` file with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
PORT=3000
```

## License

MIT License