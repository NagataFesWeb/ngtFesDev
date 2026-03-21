import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 20 }, // 20秒かけて20人まで増やす
    { duration: '20s', target: 100 }, // 次の20秒で100人まで増やす（ここが山場！）
    { duration: '10s', target: 0 },  // 最後に一気に引く
  ],
};

export default function loadTest() {
  // ★ あなたのポート転送URL + 画面のパス（あれば）
  const url = 'https://3j8pgn6z-3000.jpe1.devtunnels.ms/projects';
  
  const res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
    // 画面に「長田」という文字があるかチェック（正しくページが開けている証拠）
    'has quiz text': (r) => r.body.includes('長田'),
  });

  // 実際のユーザーっぽく、1秒〜3秒の間でランダムに待機
  sleep(Math.random() * 2 + 1);
}

