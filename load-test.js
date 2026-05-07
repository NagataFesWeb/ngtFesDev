import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // 30秒かけて100人までじわじわ増やす
    { duration: '1m',  target: 100 }, // 100人のまま「1分間」キープして様子を見る（ここが重要！）
    { duration: '10s', target: 0 },   // 10秒で一気に引く
  ],
};

export default function loadTest() {
  const BASE_URL = 'https://ngt-fes.vercel.app';

  // 1. トップページへのアクセス
  const resHome = http.get(BASE_URL);
  check(resHome, {
    'home status is 200': (r) => r.status === 200,
    'has home text': (r) => r.body.includes('長田'),
  });

  // 実際のユーザーのように少し待機 (0.5秒〜1.5秒)
  sleep(Math.random() * 1 + 0.5);

  // 2. /booth ページへのアクセス
  const resProjects = http.get(`${BASE_URL}/booth`);
  check(resProjects, {
    'booth status is 200': (r) => r.status === 200,
    'has booth text': (r) => r.body.includes('2-1'), 
  });
  
  // 次のループまでランダムに待機
  sleep(Math.random() * 2 + 1);

  // 3. 2-1ページへのアクセス
  const resProjectDetail = http.get(`${BASE_URL}/projects/a3dfacaa-e38e-42a5-a171-f058682b0fd7`);
  check(resProjectDetail, {
    'project detail status is 200': (r) => r.status === 200,
    'has project detail text': (r) => r.body.includes('2-8'), 
  });

  // 最後に少し待機してから次のループへ
  sleep(Math.random() * 2 + 1);

  // 4. /display ページへのアクセス
  const resDisplay = http.get(`${BASE_URL}/display`);
  check(resDisplay, {
    'display status is 200': (r) => r.status === 200,
    'has display text': (r) => r.body.includes('文化部展示'), 
  });

  // 次のループまでランダムに待機
  sleep(Math.random() * 2 + 1);

  // 5. 数学部 ページへのアクセス
  const resDisplayDetail = http.get(`${BASE_URL}/projects/b3f57cb6-f3f3-4baf-9af1-07b817c9f12d`);
  check(resDisplayDetail, {
    'display detail status is 200': (r) => r.status === 200,
    'has display detail text': (r) => r.body.includes('数学部'), 
  });

  // 次のループまでランダムに待機
  sleep(Math.random() * 2 + 1);

  // 6. /stage ページへのアクセス
  const resStage = http.get(`${BASE_URL}/stage`);
  check(resStage, {
    'stage status is 200': (r) => r.status === 200,
    'has stage text': (r) => r.body.includes('ステージ'), 
  });

  // 次のループまでランダムに待機
  sleep(Math.random() * 2 + 1);
  
  // 7. ステージの詳細ページへのアクセス
  const resStageDetail = http.get(`${BASE_URL}/projects/a0a6fe9e-3271-477f-8c1b-f062281576c9`);
  check(resStageDetail, {
    'stage detail status is 200': (r) => r.status === 200,
    'has stage detail text': (r) => r.body.includes('吹奏楽部'), 
  });

  // 次のループまでランダムに待機
  sleep(Math.random() * 2 + 1);

  // 8. /quiz ページへのアクセス
  const resQuiz = http.get(`${BASE_URL}/quiz`);
  check(resQuiz, {
    'quiz status is 200': (r) => r.status === 200,
    'has quiz text': (r) => r.body.includes('長田検定'), 
  });

  // 次のループまでランダムに待機
  sleep(Math.random() * 2 + 1);

  // 9. /access ページへのアクセス
  const resAccess = http.get(`${BASE_URL}/access`);
  check(resAccess, {
    'access status is 200': (r) => r.status === 200,
    'has access text': (r) => r.body.includes('アクセス'), 
  });

  // 次のループまでランダムに待機
  sleep(Math.random() * 2 + 1);

  // 10. /theme ページへのアクセス
  const resTheme = http.get(`${BASE_URL}/theme`);
  check(resTheme, {
    'theme status is 200': (r) => r.status === 200,
    'has theme text': (r) => r.body.includes('テーマ'), 
  });

  // 最後に少し待機してから次のループへ
  sleep(Math.random() * 2 + 1);
}
