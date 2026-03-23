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
  const BASE_URL = 'https://nagata-fes.vercel.app';

  // 1. トップページへのアクセス
  const resHome = http.get(BASE_URL);
  check(resHome, {
    'home status is 200': (r) => r.status === 200,
    'has home text': (r) => r.body.includes('長田'),
  });

  // 実際のユーザーのように少し待機 (0.5秒〜1.5秒)
  sleep(Math.random() * 1 + 0.5);

  // 2. /projects ページへのアクセス
  const resProjects = http.get(`${BASE_URL}/projects`);
  check(resProjects, {
    'projects status is 200': (r) => r.status === 200,
    'has projects text': (r) => r.body.includes('1-1'), 
  });

  // 次のループまでランダムに待機
  sleep(Math.random() * 2 + 1);
}
