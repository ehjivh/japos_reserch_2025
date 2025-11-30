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
    
    # 列名と設問IDのマッピング（white_paper_2018.csvの列名 -> question.csvの設問ID）
    column_mapping = {
        'メールアドレス': 'Q002',
        '2.ご担当者名': 'Q003',
        '4.電話番号（ハイフンなし・半角数字のみ）': 'Q004',
        '5.施設名（正式名称）': 'Q005',
        '6.施設名（英語名）': 'Q006',
        '7.施設名（略称・愛称・天文台名）': 'Q007',
        '8.施設の開設年（西暦・半角数字のみ）': 'Q008',
        '9.天文台の所在地の郵便番号（ハイフンなし・半角数字のみ）': 'Q010',
        '10.天文台の所在の都道府県': 'Q011',
        '11.天文台の住所（都道府県以下）': 'Q012',
        '13.ホームページアドレス': 'Q013',
        '14.施設の開館時間（半角数字のみ）': 'Q018',
        '15.施設の閉館時間（半角数字のみ）': 'Q019',
        '16.施設の開館時間の例外などがあればお書きください': 'Q020',
        '17.定休日（当てはまるものすべて）をお選びください': 'Q021',
        '18.【入館料】大人（半角数字のみ）': 'Q024',
        '19.【入館料】大学生（半角数字のみ）': 'Q025',
        '20.【入館料】高校生（半角数字のみ）': 'Q026',
        '21.【入館料】中学生（半角数字のみ）': 'Q027',
        '22.【入館料】小学生（半角数字のみ）': 'Q028',
        '27.駐車場（台・半角数字のみ）': 'Q029',
        '28.天体望遠鏡がありますか': 'Q039',
        '29.口径（㎝・半角数字のみ）についてご記入ください': 'Q040',
        '30.光学系（屈折・反射）についてご記入ください': 'Q043',
        '31.メーカーにについてご記入ください': 'Q044',
        '32.太陽望遠鏡がありますか': 'Q046',
        '33.鏡筒の数をご記入ください（台・半角数字のみ）': 'Q047',
        '36.プラネタリウムがありますか': 'Q050',
        '40.移動天文台がありますか。あるものをすべてお答えください。': 'Q051',
        '42.夜間観望会を実施していますか': 'Q054',
        '43.定例実施日をすべてお選びください': 'Q055',
        '46.夜間観望会1回の定員の有無': 'Q058',
        '47.〔定員がある場合〕夜間観望会1回の定員（半角数字のみ）': 'Q059',
        '48.夜間観望会の予約': 'Q060',
        '49.夜間観望会の料金': 'Q061',
        '50.大人の料金（半角数字のみ）': 'Q062',
        '51.大学生の料金（半角数字のみ）': 'Q063',
        '52.高校生の料金（半角数字のみ）': 'Q064',
        '53.中学生の料金（半角数字のみ）': 'Q065',
        '54.小学生の料金（半角数字のみ）': 'Q066',
        '65.望遠鏡の置かれている施設をお答えください': 'Q069',
        '66.設置主体の担当部局をお答えください': 'Q070',
        '67.施設の設置主体をお答えください。': 'Q071',
        '68.経営主体の担当部局をお答えください': 'Q072',
        '69.施設の経営主体をお答えください。': 'Q073',
        '72.施設の総入場者数（半角数字のみ）': 'Q074',
        '73.出張観望会を除く、昼間の観望会（恒星や惑星、太陽などの観望）の参加総人数（半角数字のみ）': 'Q075',
        '74.昼間に施設以外で開催した出張観望会の参加総人数（半角数字のみ）': 'Q077',
        '75.夜間に施設以外で開催した出張観望会の参加総人数（半角数字のみ）': 'Q079',
        '108.昼間に天体望遠鏡で一等星や金星などの観望を行っている。': 'Q080',
        '109.昼間に職員がついて太陽の観望を行っている。': 'Q080',
        '110.夜間に野外で星座案内を行っている': 'Q081',
        '110.定例の夜間観望会の実施方法についてお答えください。': 'Q085',
        '111.（前問で「開始時刻を決めて時間を区切って実施している」と答えた場合）1夜の実施回数をお答えください': 'Q086',
        '113.通常の夜間観望会における天体の解説方法について実施しているものを、すべてお答えください。': 'Q087',
        '114.車いすの方が観測室に行くことができますか。': 'Q089',
        '115.車いすの方が望遠鏡を覗くことができますか。': 'Q090',
        '118.望遠鏡の使用目的について頻度の高い順番に３つを次の中からお答えください [1番目]': 'Q091',
        '119.どのくらいの頻度で望遠鏡を使用していますか。': 'Q092',
        '120.観測は勤務時間として認められますか。': 'Q100',
        '126.天文台の担当者の経歴についてすべてお答えください [1人目]': 'Q102',
        '129.人件費、光熱費を除いた天文台の運営費についてお答えください。': 'Q094',
        '130.望遠鏡やドームの保守整備費（維持管理費）についてお答えください': 'Q095',
        '131.望遠鏡やドームの保守整備についてお答えください': 'Q096',
        '132.あなたの施設は指定管理者制度を導入していますか。': 'Q105',
        '133.指定管理者への委託契約期間は何年ですか（半角数字のみ）': 'Q106',
        '135.指定管理者選定の際に一般公募されましたか': 'Q107',
        '138.前回調査(平成17年・2006年)以降、で委託される団体が変わりましたか': 'Q108',
        '140.〔公が設置した施設の場合のみ〕あなたの施設の設置目的を定めた「条例」がありますか': 'Q110',
        '141.あなたの施設の運営に意見や助言を与える諮問的役割を持つ運営協議会または同等の委員会がありますか': 'Q111',
        '142.あなたの施設に求められている対外的な評価として、最も重要だと思われる順番に３つ答えてください [1番]': 'Q112',
        '145.あなたの施設には、来館者や地域の人たちが参加できる通年の同好会や、天文台を運営するためのボランティア組織はありますか。あるものすべてお選びください': 'Q113',
        '146.（ボランティア組織があるとお答えした方）ボランティア組織は、天文台の運営に関してどの程度必要ですか': 'Q114',
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
