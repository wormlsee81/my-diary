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

    // ❌ response_format 절대 포함하지 않음 (OpenAI가 Unknown parameter 오류 반환)
    const { target, response_format, ...rest } = body;
    const isDalle3 = rest.model === 'dall-e-3';

    // dall-e-3 허용 사이즈 강제
    if (isDalle3) {
      const allowed = ['1024x1024', '1792x1024', '1024x1792'];
      if (!allowed.includes(rest.size)) rest.size = '1024x1024';
      rest.n = 1;
    }

    // ── URL로 받아서 서버에서 base64 변환 (response_format 파라미터 없이 요청) ──
    try {
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(rest),  // response_format 없이 전송 → 기본값 url로 응답
      });

      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);

      const imageUrl = data.data?.[0]?.url;
      if (!imageUrl) {
        return res.status(500).json({ error: { message: 'OpenAI URL이 없습니다.' } });
      }

      // 서버에서 직접 이미지 다운로드 → base64 변환 (프론트 CORS 우회)
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return res.status(imgRes.status).json({ error: { message: `이미지 다운로드 실패: ${imgRes.status}` } });
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      const b64 = Buffer.from(arrayBuffer).toString('base64');

      // 프론트가 기존과 동일하게 data[0].b64_json 으로 받을 수 있도록 반환
      return res.status(200).json({ data: [{ b64_json: b64 }] });

    } catch (e) {
      return res.status(500).json({ error: { message: `DALL-E 오류: ${e.message}` } });
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
