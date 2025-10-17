// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { notoSansJp } from './ui/fonts'

// Next.js のページ全体で共有したい情報をまとめる場所です。まずはここにタイトルなどを登録します。
export const metadata: Metadata = {
  title: "HOURS | 営業時間で見つける（デモ）",
  // OGP 画像を設定すると SNS でシェアしたときに見栄えの良いカードが表示されます。
  openGraph: {
    images: [
      {
        url: '/images/ogp.png',
        width: 1200,
        height: 630,
        alt: 'HOURS デモの OGP 画像',
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // RootLayout はアプリ全体の共通レイアウトを定義します。HTML の基本構造をここで組み立てます。
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <head>
        {/* Google Fonts に素早く接続するための設定です。フォント読み込みが速くなります。 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Material Icons を使いたいときは、このスタイルシートを読み込むだけでOKです。 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
