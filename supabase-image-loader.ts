export default function supabaseLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  // Supabase Storageの画像をImage Transformations APIのURLに変換
  if (src.includes('supabase.co/storage/v1/object/public/')) {
    const transformedSrc = src.replace('/object/public/', '/render/image/public/');
    return `${transformedSrc}?width=${width}&format=webp&quality=${quality || 75}`;
  }
  
  // すでにrender APIのパスになっている場合のフェールセーフ
  if (src.includes('supabase.co/storage/v1/render/image/public/')) {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}width=${width}&format=webp&quality=${quality || 75}`;
  }

  // ローカル画像（/logo.pngなど）やその他の外部URLはそのまま返す
  return src;
}
