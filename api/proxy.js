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

  // ── Together AI 이미지 생성 (FLUX 모델) ──
  if (body.target === 'together-image') {
    if (!process.env.TOGETHER_API_KEY) {
      return res.status(500).json({ error: { message: 'TOGETHER_API_KEY 환경변수가 설정되지 않았습니다.' } });
    }

    const { target, ...rest } = body;

    // Together AI 이미지 생성 API 형식
    const togetherBody = {
      model: rest.model || 'black-forest-labs/FLUX.1-schnell',
      prompt: rest.prompt,
      width: rest.width || 1024,
      height: rest.height || 1024,
      steps: rest.steps || 4,
      n: rest.n || 1,
      response_format: 'b64_json',
    };

    try {
      const r = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        },
        body: JSON.stringify(togetherBody),
      });

      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: { message: data.error?.message || `Together AI 오류: ${r.status}` } });

      // Together AI 응답: data[0].b64_json
      const b64 = data.data?.[0]?.b64_json;

      if (b64) {
        return res.status(200).json({ data: [{ b64_json: b64 }] });
      } else {
        return res.status(500).json({ error: { message: '이미지 데이터가 없습니다.' } });
      }

    } catch (e) {
      return res.status(500).json({ error: { message: `이미지 생성 오류: ${e.message}` } });
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
