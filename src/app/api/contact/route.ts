import { Resend } from 'resend';

// Resend 経由でお問い合わせ内容をメール送信する API です

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
};

type ContactResponse = {
  ok: true;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL;

  // 必須の環境変数が欠けている場合はここで弾いて利用者に分かりやすいメッセージを返します
  if (!apiKey) {
    return json(500, { message: 'RESEND_API_KEY が設定されていません。' });
  }
  if (!from) {
    return json(500, { message: 'RESEND_FROM_EMAIL が設定されていません。' });
  }
  if (!to) {
    return json(500, { message: 'CONTACT_TO_EMAIL が設定されていません。' });
  }

  // フロントエンドから送られてきた JSON を安全にパースします
  let payload: ContactPayload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { message: 'JSON ボディを解析できませんでした。' });
  }

  // 空白のみの値を避けるためにトリムを行います
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const emailRaw = typeof payload.email === 'string' ? payload.email.trim() : '';
  const messageRaw = typeof payload.message === 'string' ? payload.message.trim() : '';

  if (!emailRaw) {
    return json(400, { message: 'メールアドレスを入力してください。' });
  }
  if (!messageRaw) {
    return json(400, { message: 'お問い合わせ内容を入力してください。' });
  }

  const resend = new Resend(apiKey);

  // Resend に渡す件名と本文をここで組み立てます
  const subject = name ? `お問い合わせ: ${name}` : 'お問い合わせ';
  const summary = [
    `お名前: ${name || '未入力'}`,
    `メールアドレス: ${emailRaw}`,
    '',
    'お問い合わせ内容:',
    messageRaw,
  ].join('\n');

  try {
    await resend.emails.send({
      from,
      to: to.split(',').map((address) => address.trim()).filter(Boolean),
      replyTo: emailRaw,
      subject,
      text: summary,
    });
  } catch (error) {
    console.error('Failed to send contact email via Resend', error);
    return json(502, { message: 'メール送信に失敗しました。時間を置いて再度お試しください。' });
  }

  const response: ContactResponse = { ok: true };
  return json(200, response);
}
