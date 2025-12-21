#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
question.csv を questions.json に変換するスクリプト
"""

import csv
import json
import os
from datetime import datetime


def convert_questions_csv():
    """question.csv を questions.json に変換"""
    print("=" * 50)
    print("question.csv から questions.json への変換を開始します")
    print("=" * 50)
    print()
    
    questions = []
    
    try:
        # CSVファイルの読み込み
        csv_path = '../question.csv'
        print(f"CSVファイルを読み込んでいます: {csv_path}")
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            row_count = 0
            
            for row in reader:
                row_count += 1
                
                # 選択肢の処理：カンマ区切りの文字列を配列に変換
                options_str = row.get('選択肢', '').strip()
                options = [opt.strip() for opt in options_str.split(',') if opt.strip()] if options_str else []
                
                # 必須フラグの処理
                required_flag = row.get('必須フラグ', 'FALSE').strip().upper()
                required = required_flag == 'TRUE'
                
                # 表示フラグの処理
                visible_flag = row.get('表示フラグ', 'TRUE').strip().upper()
                visible = visible_flag == 'TRUE'
                
                # 表示順の処理
                try:
                    order = int(row.get('表示順', 0))
                except ValueError:
                    order = 0
                    print(f"  警告: 行 {row_count} の表示順が数値ではありません。0に設定しました。")
                
                # 設問データの構築
                question = {
                    'id': row['設問ID'].strip(),
                    'title': row['設問タイトル'].strip(),
                    'type': row['設問タイプ'].strip(),
                    'options': options,
                    'required': required,
                    'order': order,
                    'visible': visible,
                    'description': row.get('説明文', '').strip()
                }
                
                questions.append(question)
                
                # 進捗表示（10件ごと）
                if row_count % 10 == 0:
                    print(f"  処理済み: {row_count} 件")
        
        print(f"\n✓ CSVファイルの読み込み完了: {row_count} 件の設問を読み込みました")
        print()
        
        # dataディレクトリの作成
        data_dir = '../data'
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
            print(f"✓ データディレクトリを作成しました: {data_dir}")
        
        # JSONファイルへの出力
        json_path = os.path.join(data_dir, 'questions.json')
        print(f"JSONファイルに出力しています: {json_path}")
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({'questions': questions}, f, ensure_ascii=False, indent=2)
        
        print(f"✓ JSONファイルの出力完了")
        print()
        
        # 統計情報の表示
        print("=" * 50)
        print("変換統計")
        print("=" * 50)
        print(f"総設問数: {len(questions)} 件")
        print(f"必須設問数: {sum(1 for q in questions if q['required'])} 件")
        print(f"表示設問数: {sum(1 for q in questions if q['visible'])} 件")
        print(f"非表示設問数: {sum(1 for q in questions if not q['visible'])} 件")
        print()
        
        # 設問タイプ別の集計
        type_counts = {}
        for q in questions:
            q_type = q['type']
            type_counts[q_type] = type_counts.get(q_type, 0) + 1
        
        print("設問タイプ別の内訳:")
        for q_type, count in sorted(type_counts.items()):
            print(f"  {q_type}: {count} 件")
        print()
        
        print("=" * 50)
        print(f"変換が正常に完了しました！")
        print(f"出力ファイル: {json_path}")
        print(f"変換日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 50)
        
        return True
        
    except FileNotFoundError:
        print()
        print("✗ エラー: question.csv が見つかりません")
        print(f"  ファイルパス: {os.path.abspath(csv_path)}")
        print("  ファイルが存在することを確認してください。")
        return False
        
    except KeyError as e:
        print()
        print(f"✗ エラー: CSVファイルに必要な列が見つかりません: {e}")
        print("  必要な列: 設問ID, 設問タイトル, 設問タイプ, 選択肢, 必須フラグ, 表示順, 表示フラグ, 説明文")
        return False
        
    except Exception as e:
        print()
        print(f"✗ エラー: 変換中に問題が発生しました")
        print(f"  エラー内容: {e}")
        import traceback
        traceback.print_exc()
        return False


def convert_previous_answers():
    """white_paper_2018.csv を読み込み、新しい設問IDにマッピングして previous_answers.json を更新"""
    print("=" * 50)
    print("過去の回答データの変換を開始します")
    print("=" * 50)
    print()
    
    # マッピング定義: 新設問ID -> 旧CSVヘッダー名
    mapping = {
        'Q002': 'メールアドレス',
        'Q003': '2.ご担当者名',
        'Q004': '4.電話番号（ハイフンなし・半角数字のみ）',
        'Q005': '5.施設名（正式名称）',
        'Q006': '6.施設名（英語名）',
        'Q007': '7.施設名（略称・愛称・天文台名）',
        'Q008': '8.施設の開設年（西暦・半角数字のみ）',
        'Q010': '9.天文台の所在地の郵便番号（ハイフンなし・半角数字のみ）',
        'Q011': '10.天文台の所在の都道府県',
        'Q012': '11.天文台の住所（都道府県以下）',
        'Q013': '13.ホームページアドレス',
        'Q018': '14.施設の開館時間（半角数字のみ）',
        'Q021': '17.定休日（当てはまるものすべて）をお選びください',
        'Q024': '18.【入館料】大人（半角数字のみ）',
        'Q025': '19.【入館料】大学生（半角数字のみ）',
        'Q026': '20.【入館料】高校生（半角数字のみ）',
        'Q027': '21.【入館料】中学生（半角数字のみ）',
        'Q028': '22.【入館料】小学生（半角数字のみ）',
        'Q029': '27.駐車場（台・半角数字のみ）',
        'Q030': '25.公共交通でお越しの場合',
        'Q031': '26.自動車でお越しの場合',
        'Q032': '64.施設のセールスポイントがあればお書きください',
        'Q039': '28.天体望遠鏡がありますか',
        'Q040': '29.口径（㎝・半角数字のみ）についてご記入ください',
        'Q043': '30.光学系（屈折・反射）についてご記入ください',
        'Q044': '31.メーカーにについてご記入ください',
        'Q046': '32.太陽望遠鏡がありますか',
        'Q047': '33.鏡筒の数をご記入ください（台・半角数字のみ）',
        'Q048': '34.投影、映像展示の有無をご記入ください',
        'Q049': '35.メーカーをご記入ください',
        'Q050': '36.プラネタリウムがありますか',
        'Q051': '40.移動天文台がありますか。あるものをすべてお答えください。',
        'Q053': '41.その他設備についてあるものをチェックしてください',
        'Q054': '42.夜間観望会を実施していますか',
        'Q055': '43.定例実施日をすべてお選びください',
        'Q056': '45.夜間観望会の実施時間をお答えください',
        'Q058': '46.夜間観望会1回の定員の有無',
        'Q059': '47.〔定員がある場合〕夜間観望会1回の定員（半角数字のみ）',
        'Q060': '48.夜間観望会の予約',
        'Q061': '49.夜間観望会の料金',
        'Q062': '50.大人の料金（半角数字のみ）',
        'Q063': '51.大学生の料金（半角数字のみ）',
        'Q064': '52.高校生の料金（半角数字のみ）',
        'Q065': '53.中学生の料金（半角数字のみ）',
        'Q066': '54.小学生の料金（半角数字のみ）',
        'Q068': '56.一般の方の利用できる宿泊施設にチェックしてください',
        'Q069': '65.望遠鏡の置かれている施設をお答えください',
        'Q070': '66.設置主体の担当部局をお答えください',
        'Q071': '67.施設の設置主体をお答えください。',
        'Q072': '68.経営主体の担当部局をお答えください',
        'Q073': '69.施設の経営主体をお答えください。',
        'Q074': '72.施設の総入場者数（半角数字のみ）',
        'Q075': '73.出張観望会を除く、昼間の観望会（恒星や惑星、太陽などの観望）の参加総人数（半角数字のみ）',
        'Q076': '出張観望会を除く、夜間の観望会参加総人数（半角数字のみ）',
        'Q077': '74.昼間に施設以外で開催した出張観望会の参加総人数（半角数字のみ）',
        'Q078': '75.夜間に施設以外で開催した出張観望会の参加総人数（半角数字のみ）',
        'Q080': '108.昼間に天体望遠鏡で一等星や金星などの観望を行っている。',
        'Q081': '110.夜間に野外で星座案内を行っている',
        'Q085': '110.定例の夜間観望会の実施方法についてお答えください。',
        'Q086': '111.（前問で「開始時刻を決めて時間を区切って実施している」と答えた場合）1夜の実施回数をお答えください',
        'Q089': '114.車いすの方が観測室に行くことができますか。',
        'Q090': '115.車いすの方が望遠鏡を覗くことができますか。',
        'Q091-1': '118.望遠鏡の使用目的について頻度の高い順番に３つを次の中からお答えください [1番目]',
        'Q091-2': '118.望遠鏡の使用目的について頻度の高い順番に３つを次の中からお答えください [2番目]',
        'Q091-3': '118.望遠鏡の使用目的について頻度の高い順番に３つを次の中からお答えください [3番目]',
        'Q092': '119.どのくらいの頻度で望遠鏡を使用していますか。',
        'Q094': '129.人件費、光熱費を除いた天文台の運営費についてお答えください。',
        'Q100': '120.観測は勤務時間として認められますか。',
        'Q101': '122.天文台を含め施設全体を運営する常勤職員数をお答えください（半角数字のみ）',
        'Q105': '132.あなたの施設は指定管理者制度を導入していますか。',
        'Q106': '133.指定管理者への委託契約期間は何年ですか（半角数字のみ）',
        'Q107': '135.指定管理者選定の際に一般公募されましたか',
        'Q108': '138.前回調査(平成17年・2006年)以降、で委託される団体が変わりましたか',
        'Q110': '140.〔公が設置した施設の場合のみ〕あなたの施設の設置目的を定めた「条例」がありますか',
        'Q111': '141.あなたの施設の運営に意見や助言を与える諮問的役割を持つ運営協議会または同等の委員会がありますか',
        'Q112-1': '142.あなたの施設に求められている対外的な評価として、最も重要だと思われる順番に３つ答えてください [1番]',
        'Q112-2': '142.あなたの施設に求められている対外的な評価として、最も重要だと思われる順番に３つ答えてください [2番]',
        'Q112-3': '142.あなたの施設に求められている対外的な評価として、最も重要だと思われる順番に３つ答えてください [3番]',
        'Q113': '145.あなたの施設には、来館者や地域の人たちが参加できる通年の同好会や、天文台を運営するためのボランティア組織はありますか。あるものすべてお選びください',
        'Q114': '146.（ボランティア組織があるとお答えした方）ボランティア組織は、天文台の運営に関してどの程度必要ですか',
        'Q120': '24.割引制度（あるものすべて）',
        'Q121': '143.広報として取り組んだことをお答えください',
    }

    try:
        # 1. 既存の previous_answers.json から施設名とIDの対応を取得
        previous_json_path = '../data/previous_answers.json'
        facility_id_map = {}
        
        if os.path.exists(previous_json_path):
            print(f"既存の回答データを読み込んでいます: {previous_json_path}")
            with open(previous_json_path, 'r', encoding='utf-8') as f:
                previous_data = json.load(f)
                for fid, answers in previous_data.items():
                    # Q005が施設名と仮定（古い定義でもQ005が施設名だった場合）
                    # もし見つからない場合は、他の手段を考える必要があるが、
                    # 今回はQ005を信じる
                    if 'Q005' in answers:
                        facility_name = answers['Q005'].strip()
                        facility_id_map[facility_name] = fid
            print(f"  {len(facility_id_map)} 件の施設IDマッピングを取得しました")
        else:
            print("  警告: previous_answers.json が見つかりません。新規作成します。")
            previous_data = {}

        # 2. white_paper_2018.csv の読み込み
        csv_path = '../white_paper_2018.csv'
        print(f"過去のCSVデータを読み込んでいます: {csv_path}")
        
        new_previous_answers = {}
        
        # エンコーディングを cp932 (Shift-JIS) に変更
        try:
            f = open(csv_path, 'r', encoding='cp932')
            reader = csv.DictReader(f)
            # 試し読みしてエンコーディングを確認
            next(reader)
            f.seek(0)
            reader = csv.DictReader(f)
        except UnicodeDecodeError:
            # cp932で失敗した場合はutf-8を試す（あるいはその逆）
            f.close()
            f = open(csv_path, 'r', encoding='utf-8')
            reader = csv.DictReader(f)
            
        with f:
            row_count = 0
            matched_count = 0
            
            for row in reader:
                row_count += 1
                
                # 施設名の取得
                facility_name = row.get('5.施設名（正式名称）', '').strip()
                if not facility_name:
                    continue
                
                # 施設IDの特定
                facility_id = facility_id_map.get(facility_name)
                
                if not facility_id:
                    # 施設名で完全一致しない場合、少し緩い検索をするか、
                    # あるいは今回はスキップするか。
                    # ログを出してスキップする
                    # print(f"  スキップ: 施設IDが見つかりません - {facility_name}")
                    continue
                
                matched_count += 1
                
                # 回答データの構築
                answers = {}
                for new_id, old_header in mapping.items():
                    if old_header in row:
                        value = row[old_header].strip()
                        if value:
                            answers[new_id] = value
                
                # 施設IDをキーとして保存
                new_previous_answers[facility_id] = answers
        
        print(f"  {row_count} 件中 {matched_count} 件のデータをマッピングしました")
        
        # 3. JSONファイルへの出力
        # 既存のデータ構造を維持しつつ、新しいマッピングで上書きする
        # ただし、マッピングに含まれない設問（新設問など）はデータが入らない
        
        print(f"JSONファイルに出力しています: {previous_json_path}")
        
        with open(previous_json_path, 'w', encoding='utf-8') as f:
            json.dump(new_previous_answers, f, ensure_ascii=False, indent=2)
            
        print(f"✓ 過去の回答データの変換完了")
        return True

    except Exception as e:
        print()
        print(f"✗ エラー: 過去データの変換中に問題が発生しました")
        print(f"  エラー内容: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """メイン処理"""
    print()
    success_questions = convert_questions_csv()
    print()
    success_answers = convert_previous_answers()
    print()
    
    if success_questions and success_answers:
        return 0
    else:
        return 1


if __name__ == '__main__':
    exit_code = main()
    exit(exit_code)
