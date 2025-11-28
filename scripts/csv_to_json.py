#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV to JSON Converter for 公開天文台白書2025
"""

import csv
import json
import os
from datetime import datetime


def convert_questions_csv():
    """question.csv を questions.json に変換"""
    print("Converting question.csv to questions.json...")
    
    questions = []
    
    try:
        with open('../question.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # 選択肢の処理：カンマ区切りの文字列を配列に変換
                options_str = row.get('選択肢', '').strip()
                options = [opt.strip() for opt in options_str.split(',') if opt.strip()] if options_str else []
                
                questions.append({
                    'id': row['設問ID'],
                    'title': row['設問タイトル'],
                    'type': row['設問タイプ'],
                    'options': options,
                    'required': row['必須フラグ'].upper() == 'TRUE',
                    'order': int(row['表示順']),
                    'visible': row['表示フラグ'].upper() == 'TRUE',
                    'description': row.get('説明文', '').strip()
                })
        
        # dataディレクトリの作成
        os.makedirs('../data', exist_ok=True)
        
        # JSONファイルへの出力
        with open('../data/questions.json', 'w', encoding='utf-8') as f:
            json.dump({'questions': questions}, f, ensure_ascii=False, indent=2)
        
        print(f"✓ Successfully converted {len(questions)} questions")
        
    except FileNotFoundError:
        print("✗ Error: question.csv not found")
    except Exception as e:
        print(f"✗ Error converting questions: {e}")


def convert_members_csv():
    """member.csv を members.json に変換"""
    print("Converting member.csv to members.json...")
    
    members = []
    
    try:
        with open('../member.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                members.append({
                    'facility_id': row['施設ID'],
                    'password': row['パスワード'],
                    'facility_name': row['施設名'],
                    'email': row['メールアドレス'],
                    'contact_person': row.get('担当者名', '').strip(),
                    'last_submit': row.get('最終送信日時', '').strip()
                })
        
        # dataディレクトリの作成
        os.makedirs('../data', exist_ok=True)
        
        # JSONファイルへの出力
        with open('../data/members.json', 'w', encoding='utf-8') as f:
            json.dump({'members': members}, f, ensure_ascii=False, indent=2)
        
        print(f"✓ Successfully converted {len(members)} members")
        
    except FileNotFoundError:
        print("✗ Error: member.csv not found")
    except Exception as e:
        print(f"✗ Error converting members: {e}")


def convert_previous_answers_csv():
    """white_paper_2018.csv を previous_answers.json に変換"""
    print("Converting white_paper_2018.csv to previous_answers.json...")
    
    previous_answers = {}
    
    # 列名と設問IDのマッピング（実際のデータに合わせて調整が必要）
    column_mapping = {
        'メールアドレス': 'Q002',
        '2.ご担当者名': 'Q003',
        '4.電話番号（ハイフンなし・半角数字のみ）': 'Q004',
        '5.施設名（正式名称）': 'Q005',
        '6.施設名（英語名）': 'Q006',
        '7.施設の郵便番号（ハイフンなし・半角数字のみ）': 'Q007',
        '8.施設の所在地（都道府県）': 'Q008',
        # 以下、必要に応じて追加
        # マッピングは実際のCSVの列名とquestion.csvの設問IDを照らし合わせて作成
    }
    
    try:
        # エンコーディングの自動検出
        encodings = ['utf-8', 'shift-jis', 'cp932', 'utf-8-sig']
        data = None
        
        for encoding in encodings:
            try:
                with open('../white_paper_2018.csv', 'r', encoding=encoding) as f:
                    reader = csv.DictReader(f)
                    data = list(reader)
                break
            except (UnicodeDecodeError, Exception):
                continue
        
        if not data:
            raise Exception('Could not detect encoding')
        
        for row in data:
            # 施設IDの取得（member.csvと照合が必要な場合がある）
            # ここでは仮に施設名から特定する処理を記載
            facility_name = row.get('5.施設名（正式名称）', '').strip()
            
            if not facility_name:
                continue
            
            # member.csvとの照合で施設IDを特定（簡易実装）
            # 実際にはmembers.jsonを読み込んで照合する
            facility_id = None
            try:
                with open('../data/members.json', 'r', encoding='utf-8') as mf:
                    members_data = json.load(mf)
                    for member in members_data['members']:
                        if member['facility_name'] == facility_name:
                            facility_id = member['facility_id']
                            break
            except:
                pass
            
            if not facility_id:
                # 施設IDが見つからない場合はスキップ
                continue
            
            answers = {}
            
            # 列名マッピングに基づいて設問IDに変換
            for csv_col, question_id in column_mapping.items():
                if csv_col in row:
                    value = row[csv_col].strip()
                    # 空文字やNaNは除外
                    if value and value.lower() not in ['nan', 'na', 'n/a', '']:
                        answers[question_id] = value
            
            if answers:
                previous_answers[facility_id] = answers
        
        # dataディレクトリの作成
        os.makedirs('../data', exist_ok=True)
        
        # JSONファイルへの出力
        with open('../data/previous_answers.json', 'w', encoding='utf-8') as f:
            json.dump(previous_answers, f, ensure_ascii=False, indent=2)
        
        print(f"✓ Successfully converted {len(previous_answers)} previous answers")
        
    except FileNotFoundError:
        print("✗ Error: white_paper_2018.csv not found")
    except Exception as e:
        print(f"✗ Error converting previous answers: {e}")


def main():
    """メイン処理"""
    print("=== CSV to JSON Converter ===")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 各CSVファイルを変換
    convert_questions_csv()
    print()
    
    convert_members_csv()
    print()
    
    convert_previous_answers_csv()
    print()
    
    print("=== Conversion completed ===")


if __name__ == '__main__':
    main()
