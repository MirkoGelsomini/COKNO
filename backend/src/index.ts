import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import searchRouter from "./routes/search";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use("/api", searchRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "Cokno API", version: "1.0.0" });
});

const frontendPath = path.join(__dirname, "..", "..", "frontend");
app.use(express.static(frontendPath));

app.listen(PORT, () => {
  console.log(`Cokno running → http://localhost:${PORT}`);
});
