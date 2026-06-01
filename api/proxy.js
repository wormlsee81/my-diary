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

    // target, response_format 제거 후 나머지만 사용
    const { target, response_format, ...rest } = body;
    const isDalle3 = rest.model === 'dall-e-3';

    // ── DALL-E 3 ──
    // dall-e-3는 b64_json을 직접 지원하므로 바로 요청
    if (isDalle3) {
      const allowed3 = ['1024x1024', '1792x1024', '1024x1792'];
      if (!allowed3.includes(rest.size)) rest.size = '1024x1024';
      rest.n = 1;

      const openaiBody = { ...rest, response_format: 'b64_json' };

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
        if (!r.ok) return res.status(r.status).json(data);

        // dall-e-3 b64_json 직접 반환
        const b64 = data.data?.[0]?.b64_json;
        if (!b64) {
          return res.status(500).json({ error: { message: 'DALL-E 3 b64_json이 없습니다.' } });
        }
        return res.status(200).json({ data: [{ b64_json: b64 }] });
      } catch (e) {
        return res.status(500).json({ error: { message: `DALL-E 3 오류: ${e.message}` } });
      }
    }

    // ── DALL-E 2 ──
    // dall-e-2도 b64_json 직접 지원 → URL 다운로드 왕복 없애기
    // (구 코드: url로 받아 서버에서 fetch → Vercel 10초 타임아웃 초과로 500 발생)
    const openaiBody2 = { ...rest, response_format: 'b64_json' };

    try {
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(openaiBody2),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);

      const b64 = data.data?.[0]?.b64_json;
      if (!b64) {
        return res.status(500).json({ error: { message: 'DALL-E 2 b64_json이 없습니다.' } });
      }
      return res.status(200).json({ data: [{ b64_json: b64 }] });
    } catch (e) {
      return res.status(500).json({ error: { message: `DALL-E 2 오류: ${e.message}` } });
    }
  }

  // ── Claude 텍스트 생성 ──
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: { message: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' } });
  }
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: { message: `Anthropic 오류: ${e.message}` } });
  }
}
