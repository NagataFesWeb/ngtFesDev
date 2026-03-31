# SEO対策.md - Next.js (App Router) & Vercel 検索エンジン登録完全ガイド

このドキュメントは、Next.jsで構築しVercelで公開したサイトを、
Google検索などの検索エンジンに正しく、かつ効率的にインデックスさせるための
技術的な手順をすべて網羅したものです。

---

## 1. サイトが「隠されていないか」の最終確認

技術的な設定をする前に、検索エンジンを拒絶する設定になっていないか確認します。

* Vercel Deployment Protection:
  Vercelの管理画面 [Settings] > [Deployment Protection] で
  Vercel Authentication（パスワード保護）が有効だとクローラーが入れません。
  一般公開サイトなら「OFF」にする必要があります。

* noindex タグの確認:
  ブラウザで自分のサイトを開き、右クリック > [ページのソースを表示] を選択。
  <meta name="robots" content="noindex"> という記述がないか確認してください。
  ※VercelのプレビューURLには自動で付きますが、本番ドメインには不要です。

---

## 2. Google Search Console での所有権確認

Googleに「このサイトの管理者は私です」と証明し、連携を開始します。

1. [Google Search Console] にアクセスし、文化祭用Googleアカウントでログイン。
2. 「URL プレフィックス」を選択し、`https://ngt-fes.vercel.app/` を入力。
3. 確認方法の選択肢から「HTML タグ」を選択。
4. <meta name="google-site-verification" content="数値..." /> をコピー。
5. Next.js の app/layout.tsx に以下のように組み込み、デプロイします。

   export const metadata: Metadata = {
     verification: {
       google: "ここにコピーした英数字の文字列を入れる",
     },
   };

6. Vercelへのデプロイ完了後、Search Consoleの画面で「確認」ボタンを押します。

---

## 3. SEO必須ファイルの作成（robots.ts / sitemap.ts）

Googleに「サイトの地図」を渡し、効率よく巡回してもらうための設定です。

### ① robots.ts の作成
場所: app/robots.ts

import { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/login', '/mypage'],
    },
    sitemap: 'https://ngt-fes.vercel.app/sitemap.xml',
  }
}

### ② sitemap.ts の作成
場所: app/sitemap.ts

import { MetadataRoute } from 'next'
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ngt-fes.vercel.app'
  const lastModified = new Date()
  return [
    { url: baseUrl, lastModified, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/projects`, lastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/access`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/quiz`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
  ]
}

---

## 4. Google への直接的な働きかけ（リクエスト）

1. サイトマップの送信:
   Search Console の左メニュー [サイトマップ] を開き、
   sitemap.xml と入力して送信。ステータスが「成功」になれば完了。

2. URL 検査（特急券）:
   Search Console 上部の検索窓にトップページや /projects のURLを入力。
   「インデックス登録をリクエスト」をクリック。
   ※これをやることで、通常の巡回を待つより早く検索に載ります。

---

## 5. 検索順位を上げるための戦略

* 情報の整理（Disallowの活用）:
  /login や /admin を disallow に設定するのは、SEOにマイナスではなくプラスです。
  価値のないページを無視させ、展示紹介などの重要ページに評価を集中させます。

* レンダリングの最適化:
  Google リッチリザルト テストで「スクリーンショット」を確認。
  画面が真っ白でないか、テキストが正しく抽出されているか確認します。

* 独自ドメインの検討:
  本格的に上位を目指す場合は、.vercel.app よりも独自ドメインが有利です。

---
作成日: 2026年3月31日
作成協力: Gemini (Google)