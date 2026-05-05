export default function supabaseLoader({ src }: { src: string; width: number; quality?: number }) {
  // 案Aへの移行: 実ファイルをWebP化して直接配信するため、変換ロジックをバイパスします。
  // これにより、Vercelの課金を回避しつつ、Supabase Storageから直接画像を取得します。
  return src;
}
