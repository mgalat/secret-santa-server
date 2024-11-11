import express from "express";
import cors from "cors";
import user from "./routes/user.js";

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());
app.use("/", user);

// start the Express server
app.listen(80, () => {
  console.log(`Server listening on port ${80}`);
});
