// api/proxy.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',   // b64 이미지 대비 여유 크기
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

  // ── body 파싱 실패 방어 ──
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: { message: 'Request body is missing or invalid JSON.' } });
  }

  // ── DALL-E URL → base64 변환 (CORS 우회) ──
  // dall-e-3는 b64_json을 직접 지원하지 않으므로
  // URL로 받은 뒤 서버에서 base64로 변환하여 반환
  if (body.target === 'fetch-url') {
    if (!body.url) {
      return res.status(400).json({ error: { message: 'url is required for fetch-url target.' } });
    }
    try {
      const imgRes = await fetch(body.url);
      if (!imgRes.ok) {
        return res.status(imgRes.status).json({ error: { message: `이미지 URL fetch 실패: ${imgRes.status}` } });
      }
      const contentType = imgRes.headers.get('content-type') || 'image/png';
      const arrayBuffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return res.status(200).json({ b64: base64, contentType });
    } catch (e) {
      return res.status(500).json({ error: { message: `fetch-url 오류: ${e.message}` } });
    }
  }

  // ── OpenAI DALL-E 이미지 생성 ──
  if (body.target === 'openai-image') {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: { message: 'OPENAI_API_KEY 환경변수가 설정되지 않았습니다.' } });
    }

    const { target, ...openaiBody } = body;
    const isDalle3 = openaiBody.model === 'dall-e-3';

    // ── dall-e-3 전용 처리 ──
    // dall-e-3는 response_format:'b64_json' 미지원 → URL로 받아 서버에서 변환
    if (isDalle3) {
      // dall-e-3 허용 사이즈만 강제
      const allowed3 = ['1024x1024', '1792x1024', '1024x1792'];
      if (!allowed3.includes(openaiBody.size)) openaiBody.size = '1024x1024';
      // n은 항상 1
      openaiBody.n = 1;
      // response_format은 url로 고정 (b64_json 미지원)
      openaiBody.response_format = 'url';

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

        const imageUrl = data.data?.[0]?.url;
        if (!imageUrl) {
          return res.status(500).json({ error: { message: 'DALL-E 3 URL이 없습니다.' } });
        }

        // URL → base64 변환 (프론트에서 CORS 불가이므로 서버에서 처리)
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) {
          return res.status(imgRes.status).json({ error: { message: `이미지 다운로드 실패: ${imgRes.status}` } });
        }
        const arrayBuffer = await imgRes.arrayBuffer();
        const b64 = Buffer.from(arrayBuffer).toString('base64');

        // 프론트가 기존과 동일한 data[0].b64_json 구조로 받을 수 있도록 반환
        return res.status(200).json({
          data: [{ b64_json: b64 }],
        });
      } catch (e) {
        return res.status(500).json({ error: { message: `DALL-E 3 요청 오류: ${e.message}` } });
      }
    }

    // ── dall-e-2 처리 (기존 방식 유지) ──
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
      return res.status(r.status).json(data);
    } catch (e) {
      return res.status(500).json({ error: { message: `OpenAI 요청 오류: ${e.message}` } });
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
    return res.status(500).json({ error: { message: `Anthropic 요청 오류: ${e.message}` } });
  }
}
