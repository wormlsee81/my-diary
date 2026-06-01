// api/proxy.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: { message: 'Request body is missing or invalid JSON.' } });
  }

  // ── OpenAI DALL-E 이미지 생성 ──
  if (body.target === 'openai-image') {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: { message: 'OPENAI_API_KEY 환경변수가 설정되지 않았습니다.' } });
    }

    const { target, response_format, ...rest } = body;
    const isDalle3 = rest.model === 'dall-e-3';

    // dall-e-3: size 강제, n=1 고정, 기본값(url)으로 요청 후 서버에서 b64 변환
    if (isDalle3) {
      const allowed3 = ['1024x1024', '1792x1024', '1024x1792'];
      if (!allowed3.includes(rest.size)) rest.size = '1024x1024';
      rest.n = 1;

      const openaiBody = { ...rest };

      try {
        const r = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(openaiBody),
        });
        const data = await r.json();
        if (!