# PostgreSQL Database Setup Guide for TranslateAI

This guide will help you set up a local PostgreSQL database to save and view translation history in your TranslateAI application.

## Prerequisites

- PostgreSQL 12 or higher

## Installation

### macOS

1. **Install PostgreSQL using Homebrew:**
   ```bash
   brew install postgresql@15
   ```

2. **Start PostgreSQL service:**
   ```bash
   brew services start postgresql@15
   ```

3. **Verify installation:**
   ```bash
   psql --version
   ```

### Ubuntu/Debian Linux

1. **Install PostgreSQL:**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Start PostgreSQL service:**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

3. **Verify installation:**
   ```bash
   psql --version
   ```

### Windows

1. **Download PostgreSQL installer:**
   - Visit https://www.postgresql.org/download/windows/
   - Download and run the installer (version 15 recommended)
   
2. **During installation:**
   - Remember the password you set for the 'postgres' user
   - Default port is 5432 (keep this)
   - Select all components

3. **Verify installation:**
   - Open Command Prompt
   - Run: `psql --version`

## Database Configuration

### Step 1: Create Database

1. **Access PostgreSQL (macOS/Linux):**
   ```bash
   psql -U postgres
   ```

   **On Windows:**
   - Open SQL Shell (psql) from Start menu
   - Press Enter for all prompts to use defaults
   - Enter your postgres user password

2. **Create the database:**
   ```sql
   CREATE DATABASE translateai;
   ```

3. **Connect to the database:**
   ```sql
   \c translateai
   ```

4. **Exit psql:**
   ```sql
   \q
   ```

### Step 2: Initialize Database Schema

1. **Run the initialization script:**
   ```bash
   psql -U postgres -d translateai -f database/schema.sql
   ```

   Or you can let the application auto-initialize the schema on first use.

### Step 3: Configure Environment Variables

The `.env.local` file has already been updated with default values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=translateai
DB_USER=postgres
DB_PASSWORD=postgres
```

**Important:** Update the `DB_PASSWORD` to match your PostgreSQL password:

1. Open `.env.local`
2. Change `DB_PASSWORD=postgres` to your actual password
3. Save the file

## Testing the Database Connection

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Translate a document:**
   - Upload and translate any document
   - Click "Save Translation" button
   - You should see a success message

3. **View saved translations:**
   - Click the "History" button in the header
   - You should see your saved translation

## Troubleshooting

### Connection Refused Error

**Problem:** Cannot connect to PostgreSQL

**Solution:**
```bash
# macOS
brew services restart postgresql@15

# Linux
sudo systemctl restart postgresql

# Windows
# Restart "postgresql-x64-15" service from Services app
```

### Authentication Failed Error

**Problem:** Password incorrect

**Solution:**
1. Reset PostgreSQL password:
   ```bash
   # macOS/Linux
   psql -U postgres
   ALTER USER postgres PASSWORD 'your_new_password';
   ```

2. Update `.env.local` with the new password

### Database Does Not Exist

**Problem:** Database "translateai" does not exist

**Solution:**
```bash
psql -U postgres
CREATE DATABASE translateai;
\q
```

### Permission Denied

**Problem:** Permission denied for schema public

**Solution:**
```sql
psql -U postgres -d translateai
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

## Database Management

### View All Translations
```bash
psql -U postgres -d translateai
SELECT id, original_file_name, target_language, created_at FROM translations;
```

### Delete All Translations
```sql
psql -U postgres -d translateai
TRUNCATE TABLE translations;
```

### Backup Database
```bash
pg_dump -U postgres translateai > translateai_backup.sql
```

### Restore Database
```bash
psql -U postgres translateai < translateai_backup.sql
```

## Advanced Configuration

### Change Database Port

If port 5432 is already in use:

1. Edit PostgreSQL config file:
   - **macOS:** `/usr/local/var/postgresql@15/postgresql.conf`
   - **Linux:** `/etc/postgresql/15/main/postgresql.conf`
   - **Windows:** `C:\Program Files\PostgreSQL\15\data\postgresql.conf`

2. Find and change the port:
   ```
   port = 5433  # Change to any available port
   ```

3. Restart PostgreSQL

4. Update `.env.local`:
   ```
   DB_PORT=5433
   ```

### Using a Different Database User

1. Create a new user:
   ```sql
   psql -U postgres
   CREATE USER translateai_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE translateai TO translateai_user;
   ```

2. Update `.env.local`:
   ```
   DB_USER=translateai_user
   DB_PASSWORD=secure_password
   ```

## Features

Once the database is set up, you can:

1. **Save Translations** - Click "Save Translation" after translating any document
2. **View History** - Click "History" button to see all saved translations
3. **View Full Translation** - Click the eye icon to view complete translated text with markdown formatting
4. **Delete Translations** - Remove unwanted translations from history
5. **Search & Filter** - Filter by language and date (coming soon)

## Database Schema

The application uses a single main table:

### `translations` table
- `id`: Auto-incrementing primary key
- `original_file_name`: Name of the uploaded file
- `original_text`: Original document text (optional)
- `translated_text`: Complete translated text with markdown formatting
- `source_language`: Detected source language
- `target_language`: Selected target language
- `file_type`: MIME type of uploaded file
- `file_size`: Size of file in bytes
- `page_count`: Number of pages/segments
- `high_fidelity`: Boolean flag for translation mode
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

## Security Best Practices

1. **Never commit `.env.local` to version control**
2. **Use strong passwords for production**
3. **Restrict database access to localhost in development**
4. **Use SSL connections for production databases**
5. **Regular backups are recommended**

## Getting Help

If you encounter any issues:

1. Check PostgreSQL is running: `pg_isready`
2. Check connection: `psql -U postgres -d translateai -c "SELECT 1"`
3. Review logs in browser console
4. Check PostgreSQL logs:
   - **macOS:** `tail -f /usr/local/var/log/postgresql@15.log`
   - **Linux:** `sudo tail -f /var/log/postgresql/postgresql-15-main.log`

## Next Steps

After successful setup:

1. Translate a document
2. Save the translation
3. View it in the history
4. The translated text will now show proper formatting with:
   - **Bold headings**
   - *Italic emphasis*
   - Proper paragraph breaks
   - Lists and structure

Enjoy your enhanced TranslateAI experience! 🎉

