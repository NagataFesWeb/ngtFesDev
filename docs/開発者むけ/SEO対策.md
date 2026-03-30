# SEO対策.md - Next.js (Vercel) 検索エンジン登録完全ガイド

このドキュメントは、Next.jsで構築しVercelで公開したサイトを
Google検索に正しくインデックスさせるための全手順をまとめたものです。

---

## 1. Vercelの「公開設定」を確認する

まず、サイトが物理的にGoogleから隠されていないか確認します。

* チェック項目:
    * Vercelの管理画面で「Deployment Protection」がOFFであること。
    * ブラウザでソースを表示し <meta name="robots" content="noindex"> がないこと。
    * ※VercelのプレビューURL（ブランチごとのURL）は自動でnoindexになります。
      必ず「Production」のURL（本番ドメイン）で確認してください。

---

## 2. Google Search Consoleの所有権確認

Googleに「このサイトの管理者は私です」と証明します。

* 手順:
    1. [Google Search Console]に文化祭用Googleアカウントでログイン。
    2. 「URL プレフィックス」を選択し、サイトURL（https://...）を入力。
    3. 確認方法で「HTML タグ」を選択し、content="..." の値をコピー。
    4. Next.jsの app/layout.tsx の metadata に以下を追記してデプロイ。

    export const metadata: Metadata = {
      verification: {
        google: "コピーした文字列",
      },
    };

---

## 3. SEO必須ファイルの作成 (robots.ts / sitemap.ts)

Googleに「サイトの地図」を渡します。これがないと巡回効率が下がります。

### ① robots.ts の作成
場所: app/robots.ts (拡張子は .ts)

import { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://あなたのドメイン/sitemap.xml',
  }
}

### ② sitemap.ts の作成
場所: app/sitemap.ts (拡張子は .ts)

import { MetadataRoute } from 'next'
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://あなたのドメイン',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]
}

---

## 4. Googleへの送信とリクエスト

ファイルを作成・デプロイしたら、Googleに直接知らせます。

1. サイトマップの送信:
   Search Consoleの左メニュー「サイトマップ」から sitemap.xml を送信。
   ステータスが「成功」になるまで確認する。
2. インデックス登録リクエスト:
   Search Console上の「URL検査」でトップページのURLを入力。
   「インデックス登録をリクエスト」をクリックする。

---

## 5. Googleからどう見えているかテストする

「リッチリザルト テスト」ツールを使い、URLを入力して実行。
「テスト済みのページを表示」→「スクリーンショット」を確認し、
画面が真っ白でなく、文字やデザインが正しく映っていれば合格です。

---

## 6. さらなる改善策

* 独自ドメインの導入: .vercel.app よりも信頼性が高まり、SEOに有利です。
* メタデータの充実: layout.tsx の title や description を具体的に書く。
* SSR/SSGの活用: HTMLに中身が入った状態で配信されるように構成する。
