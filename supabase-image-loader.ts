export default function supabaseLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  // project-imagesバケットの画像のみSupabaseのImage Transformationsを適用する
  // (ファイルの元形式がJPEG/PNGのまま、動的にWebP化・リサイズして配信するため)
  if (src.includes('supabase.co/storage/v1/object/public/project-images/')) {
    const transformedSrc = src.replace('/object/public/', '/render/image/public/');
    return `${transformedSrc}?width=${width}&format=webp&quality=${quality || 75}`;
  }
  
  // public-assetsやquiz-rewardsバケットの画像は、ユーザーが手動ですでにwebp化しているため
  // もしくは署名付きURL（sign）を使用しているため、変換APIを通さずそのままのURLを返す
  return src;
}
