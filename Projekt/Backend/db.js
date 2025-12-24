const mongoose = require("mongoose");

const MONGO_URL = "mongodb+srv://hayashahen_db_user:cJGBbDtKGMub9LEL@cluster0.ut2oalc.mongodb.net/appointments?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("✅ Database Connected"))
  .catch(err => console.log("❌ DB Error:", err));
