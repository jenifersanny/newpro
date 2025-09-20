import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: "localhost",
  user: "root",         // default XAMPP user
  password: "",          // leave empty unless you set a password
  database: "yufunanec_db"
});

export default pool;
