const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------
// 1. 기본 아이템 세팅 (이미지 슬롯)
// -----------------------------
// 여기 imageUrl 자리에, 지금 쓰고 계신 Netlify 프론트의 이미지 경로나
// 나중에 업로드하신 S3/CloudFront 경로를 넣으시면 됩니다.
// (일단은 예시 경로라 이름만 맞춰두고, URL은 나중에 바꿔도 돼요)
const defaultItems = [
  {
    id: "hat_basic",
    name: "기본 모자",
    price: 100,
    imageUrl: "/images/hat_basic.png",
    slot: "A"
  },
  {
    id: "glasses_basic",
    name: "기본 안경",
    price: 150,
    imageUrl: "/images/glasses_basic.png",
    slot: "B"
  },
  {
    id: "clothes_basic",
    name: "기본 옷",
    price: 200,
    imageUrl: "/images/clothes_basic.png",
    slot: "C"
  }
  // … 나중에 여기다가 '아바타 이미지 모음.zip' 안에 있는 것들 쭉 추가
];

// -----------------------------
// 2. 교사별 커스텀 설정 저장 (간단 버전)
// -----------------------------
// 진짜 서비스면 DB(예: Supabase, Firebase, PlanetScale 등) 쓰는 게 맞고,
// 지금은 "돌아가는 예시"라서 파일로만 저장합니다.
// ⚠️ Render에서 재배포되면 날아갈 수 있으니 '프로토타입 용도'라고 생각해주세요.
const DATA_FILE = path.join(__dirname, "teacher-configs.json");

let teacherConfigs = {};
try {
  if (fs.existsSync(DATA_FILE)) {
    teacherConfigs = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  }
} catch (e) {
  console.error("Failed to read teacher-configs.json:", e);
}

function saveConfigs() {
  fs.writeFile(
    DATA_FILE,
    JSON.stringify(teacherConfigs, null, 2),
    (err) => {
      if (err) {
        console.error("Failed to save teacher configs:", err);
      }
    }
  );
}

// -----------------------------
// 3. 뱃지 → 슬롯 매핑
// -----------------------------
// 다했니 뱃지 1~6을 기준으로 슬롯 A~F를 여는 규칙 예시
const badgeToSlots = {
  "1": ["A"],
  "2": ["B"],
  "3": ["C"],
  "4": ["D"],
  "5": ["E"],
  "6": ["F"]
};

// -----------------------------
// 4. API 라우트들
// -----------------------------

// 헬스 체크 / 간단 확인용
app.get("/", (req, res) => {
  res.send("Avatar API Server is running.");
});

// (1) 교사별 아이템 설정 저장
// POST /teacher/config
// body: { apiKey: "teacher-api-key", items: [...], slotRules?: {...} }
app.post("/teacher/config", (req, res) => {
  const { apiKey, items, slotRules } = req.body;

  if (!apiKey || !Array.isArray(items)) {
    return res
      .status(400)
      .json({ error: "apiKey와 items 배열은 필수입니다." });
  }

  // slotRules는 선택 (뱃지-슬롯 규칙을 교사가 따로 커스텀하고 싶을 때)
  teacherConfigs[apiKey] = {
    items,
    slotRules: slotRules || null
  };

  saveConfigs();
  return res.json({ ok: true });
});

// (2) 교사별 아이템 목록 조회
// GET /teacher/items?apiKey=xxxxx
// - 없으면 defaultItems 반환
app.get("/teacher/items", (req, res) => {
  const apiKey = req.query.apiKey;
  if (!apiKey) {
    return res.status(400).json({ error: "apiKey 쿼리 파라미터가 필요합니다." });
  }

  const config = teacherConfigs[apiKey];
  if (!config) {
    return res.json({
      source: "default",
      items: defaultItems
    });
  }

  return res.json({
    source: "custom",
    items: config.items
  });
});

// (3) 학생이 가진 뱃지 → 오픈 가능한 슬롯 계산
// GET /student/slots?apiKey=xxx&badges=1,3,5
app.get("/student/slots", (req, res) => {
  const apiKey = req.query.apiKey;
  const badgesRaw = req.query.badges || "";

  if (!apiKey) {
    return res.status(400).json({ error: "apiKey 쿼리 파라미터가 필요합니다." });
  }

  const badgeIds = badgesRaw
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  // 1) 교사가 커스텀한 slotRules가 있으면 우선 사용
  const config = teacherConfigs[apiKey];
  const rules = config && config.slotRules ? config.slotRules : badgeToSlots;

  const unlocked = new Set();

  badgeIds.forEach((badgeId) => {
    const slots = rules[badgeId];
    if (Array.isArray(slots)) {
      slots.forEach((s) => unlocked.add(s));
    }
  });

  res.json({
    badges: badgeIds,
    unlockedSlots: Array.from(unlocked)
  });
});

// -----------------------------
// 5. 서버 시작
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Avatar API Server listening on port ${PORT}`);
});
