import csv
import json
import os

def generate_quiz_sql(csv_path, output_sql_path):
    # INSERT対象に explanation カラムを追加
    sql_statements = [
        "-- Quiz Questions data imported from CSV (with explanations)\n",
        "INSERT INTO public.quiz_questions (question_text, choices, correct_choice_index, explanation) VALUES\n"
    ]
    rows = []

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        
        # ヘッダー行を読み飛ばす
        header = next(reader)
        
        for row in reader:
            # データの不備チェック（列数が足りない場合などはスキップ）
            # 解説は10列目にある想定（インデックス9）
            if not row or len(row) < 7:
                continue
            
            question_text = row[1].replace("'", "''")
            choices = [row[2], row[3], row[4], row[5]]
            choices = [c.strip() for c in choices if c.strip()]
            
            correct_str = row[6]
            try:
                correct_index = int(correct_str.replace("選択肢", "").strip()) - 1
            except ValueError:
                correct_index = 0
            
            # あとがき、解説(9)を取得。存在しない場合は空文字。
            explanation = ""
            if len(row) > 9:
                explanation = row[9].replace("'", "''").strip()
            
            choices_json = json.dumps(choices, ensure_ascii=False)
            rows.append(f"('{question_text}', '{choices_json}'::jsonb, {correct_index}, '{explanation}')")

    if rows:
        sql_statements.append(",\n".join(rows) + ";\n")
        
        with open(output_sql_path, mode='w', encoding='utf-8') as out:
            out.writelines(sql_statements)
        print(f"Successfully generated {len(rows)} SQL statements with explanations to {output_sql_path}")
    else:
        print("No valid rows found in CSV.")

if __name__ == "__main__":
    csv_file = r"c:\Users\ryupc\WorkSpace\NgtHighSchool\NgtFes26\ngtFesDev\supabase\importQuizQestions\長田検定（回答） - フォームの回答 1.csv"
    output_file = r"c:\Users\ryupc\WorkSpace\NgtHighSchool\NgtFes26\ngtFesDev\supabase\importQuizQestions\import_quiz.sql"
    generate_quiz_sql(csv_file, output_file)
