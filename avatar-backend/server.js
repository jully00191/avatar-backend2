// server.js
const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/static", express.static("public")); // 이미지 제공

// DB 파일 위치
const DB_PATH = "data/teachers.json";

// teacher.json 이 없으면 자동 생성
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
}

// API 키 → teacherId 변환(서버에 키 저장하지 않음)
function getTeacherId(apiKey) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

// DB 읽기
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

// DB 저장
function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ① 교사 설정 저장
app.post("/api/save-settings", (req, res) => {
  const { apiKey, items } = req.body;

  if (!apiKey || !items) return res.status(400).json({ error: "Missing parameters" });

  const teacherId = getTeacherId(apiKey);
  const db = loadDB();

  db[teacherId] = {
    items,
    updatedAt: new Date().toISOString()
  };

  saveDB(db);

  res.json({ success: true });
});

// ② 교사 설정 불러오기
app.post("/api/load-settings", (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: "Missing apiKey" });

  const teacherId = getTeacherId(apiKey);
  const db = loadDB();

  if (!db[teacherId]) {
    return res.json({
      items: [],
      message: "No custom settings, using default"
    });
  }

  res.json(db[teacherId]);
});

// ③ 슬롯(뱃지) 규칙
app.get("/api/slot-rules", (req, res) => {
  res.json({
    rules: [
      { badgeId: 1, slot: "A" },
      { badgeId: 2, slot: "B" },
      { badgeId: 3, slot: "C" },
      { badgeId: 4, slot: "D" },
      { badgeId: 5, slot: "E" },
      { badgeId: 6, slot: "F" }
    ]
  });
});

app.get("/", (req, res) => {
  res.send("Avatar API Server is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
