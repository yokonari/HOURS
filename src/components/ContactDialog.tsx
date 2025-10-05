'use client';

import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';

type ContactDialogProps = {
  open: boolean;
  onClose: () => void;
};

// シンプルなモーダルダイアログでお問い合わせフォームを提供するコンポーネント
export function ContactDialog({ open, onClose }: ContactDialogProps) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const titleId = useId();
  const descriptionId = useId();

  // ダイアログが開いている間は背面のスクロールを抑制する
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setSending(false);
      setErrorMessage(null);
      setMessageDraft('');
    }
  }, [open]);

  const handleClose = () => {
    setSending(false);
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const message = messageDraft;
    const email = formData.get('email');
    const name = formData.get('name');

    if (typeof message !== 'string' || message.trim().length === 0) {
      form.querySelector<HTMLTextAreaElement>('textarea[name="message"]')?.focus();
      return;
    }

    setSubmitted(false);
    setSending(true);
    setErrorMessage(null);

    // Resend API に問い合わせ内容を転送するリクエストを送ります
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: typeof name === 'string' ? name : '',
          email: typeof email === 'string' ? email : '',
          message,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const msg =
          data && typeof data === 'object' && 'message' in data && typeof (data as Record<string, unknown>).message === 'string'
            ? ((data as Record<string, unknown>).message as string)
            : '送信に失敗しました。時間を置いて再度お試しください。';
        setErrorMessage(msg);
        return;
      }

      setSubmitted(true);
      form.reset();
      setMessageDraft('');
    } catch (error) {
      console.error('Failed to submit contact form', error);
      setErrorMessage('通信中にエラーが発生しました。ネットワーク環境をご確認のうえ再度お試しください。');
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-[61] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-on-surface">
              お問い合わせ
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="material-symbols-rounded text-on-surface-light"
            aria-label="ダイアログを閉じる"
          >
            close
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="contact-name" className="block text-sm font-medium text-on-surface">
              お名前（任意）
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div>
            <label htmlFor="contact-email" className="block text-sm font-medium text-on-surface">
              メールアドレス（任意）
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <p className="mt-1 text-xs text-on-surface-light">
              ご返信を希望される場合はメールアドレスをご記入ください。
            </p>
          </div>

          <div>
            <label htmlFor="contact-message" className="block text-sm font-medium text-on-surface">
              お問い合わせ内容
            </label>
            <textarea
              id="contact-message"
              name="message"
              required
              rows={4}
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              className="mt-1 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="ご質問やご要望をご入力ください"
            />
          </div>

          {submitted && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              送信が完了しました。
            </p>
          )}

          {errorMessage && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={sending || messageDraft.trim().length === 0}
              className="btn-primary"
            >
              {sending ? '送信中…' : '送信する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
