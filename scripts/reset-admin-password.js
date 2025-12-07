/**
 * Script to reset Strapi admin password
 * 
 * Usage:
 *   node scripts/reset-admin-password.js
 * 
 * This script will delete all admin users, allowing you to create a new one
 * through the registration form at http://localhost:1337/admin
 */

const path = require("path");
const fs = require("fs");

// Try to load database config
let dbConfig = {};
try {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        dbConfig[key.trim()] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
      }
    });
  }
} catch (error) {
  console.log("Could not read .env file, using defaults");
}

const dbClient = dbConfig.DB_CLIENT || "sqlite";
const dbHost = dbConfig.DB_HOST || "localhost";
const dbPort = parseInt(dbConfig.DB_PORT || "5432");
const dbName = dbConfig.DB_NAME || "strapi";
const dbUser = dbConfig.DB_USERNAME || "strapi";
const dbPassword = dbConfig.DB_PASSWORD || "strapi";

async function resetAdminPassword() {
  try {
    if (dbClient === "postgres") {
      const { Client } = require("pg");
      const client = new Client({
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPassword,
      });

      await client.connect();
      console.log("✅ Connected to PostgreSQL database");

      // Delete all admin users
      const result = await client.query(
        "DELETE FROM strapi_admin_users WHERE id IS NOT NULL"
      );
      console.log(`✅ Deleted ${result.rowCount} admin user(s)`);

      await client.end();
      console.log("\n🎉 Admin password reset successful!");
      console.log("\n📝 Next steps:");
      console.log("   1. Go to http://localhost:1337/admin");
      console.log("   2. You will see the registration form");
      console.log("   3. Create a new admin user with your desired credentials");
    } else if (dbClient === "sqlite") {
      const Database = require("better-sqlite3");
      const dbPath = path.join(
        __dirname,
        "..",
        dbConfig.DATABASE_FILENAME || ".tmp/data.db"
      );

      if (!fs.existsSync(dbPath)) {
        console.error("❌ SQLite database file not found at:", dbPath);
        process.exit(1);
      }

      const db = new Database(dbPath);
      console.log("✅ Connected to SQLite database");

      // Delete all admin users
      const result = db.prepare("DELETE FROM strapi_admin_users").run();
      console.log(`✅ Deleted ${result.changes} admin user(s)`);

      db.close();
      console.log("\n🎉 Admin password reset successful!");
      console.log("\n📝 Next steps:");
      console.log("   1. Go to http://localhost:1337/admin");
      console.log("   2. You will see the registration form");
      console.log("   3. Create a new admin user with your desired credentials");
    } else {
      console.error(`❌ Unsupported database client: ${dbClient}`);
      console.log("Supported clients: postgres, sqlite");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error resetting admin password:", error.message);
    console.error("\n💡 Alternative method:");
    console.log("   1. Connect to your database manually");
    console.log("   2. Run: DELETE FROM strapi_admin_users;");
    console.log("   3. Restart Strapi");
    console.log("   4. Go to http://localhost:1337/admin to register");
    process.exit(1);
  }
}

// Run the script
resetAdminPassword();

