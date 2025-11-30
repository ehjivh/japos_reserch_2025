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


def main():
    """メイン処理"""
    print()
    success = convert_questions_csv()
    print()
    
    if success:
        return 0
    else:
        return 1


if __name__ == '__main__':
    exit_code = main()
    exit(exit_code)
