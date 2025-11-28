function doGet() {
  return HtmlService.createHtmlOutputFromFile('form');
}

// スプレッドシートを開く関数
function getSpreadsheet() {
  const files = DriveApp.getFilesByName("アンケート調査システム");
  if (!files.hasNext()) {
    throw new Error("『アンケート調査システム』という名前のスプレッドシートが見つかりませんでした。");
  }
  const file = files.next();
  return SpreadsheetApp.open(file);
}

// 会員データシートを取得
function getMemberSheet() {
  return getSpreadsheet().getSheetByName("会員データ");
}

// 設問管理シートを取得
function getQuestionSheet() {
  return getSpreadsheet().getSheetByName("設問管理");
}

// 回答データシートを取得
function getAnswerSheet() {
  return getSpreadsheet().getSheetByName("回答データ");
}

// 認証＆ユーザーデータ取得
function getUserData(memberID, password) {
  try {
    const sheet = getMemberSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == memberID && data[i][1] == password) {
        return {
          success: true,
          name: data[i][2],
          email: data[i][3],
          organization: data[i][4],
          gender: data[i][5]
        };
      }
    }

    return {
      success: false,
      message: "会員番号またはパスワードが正しくありません。"
    };
  } catch (error) {
    return {
      success: false,
      message: "システムエラーが発生しました: " + error.message
    };
  }
}

// 設問データを取得
function getQuestionData() {
  try {
    const sheet = getQuestionSheet();
    const data = sheet.getDataRange().getValues();
    const questions = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // 設問IDが存在する場合のみ
        const isVisible = data[i][6] === true || data[i][6] === 'true' || data[i][6] === undefined || data[i][6] === '';

        // 表示フラグがfalseの場合はスキップ
        if (!isVisible) {
          continue;
        }

        questions.push({
          id: data[i][0],
          title: data[i][1],
          type: data[i][2],
          options: data[i][3] ? data[i][3].split(',').map(opt => opt.trim()) : [],
          required: data[i][4] === true || data[i][4] === 'true',
          order: data[i][5] || 999,
          visible: isVisible,
          description: data[i][7] || '' // H列に説明文を追加
        });
      }
    }

    // 表示順でソート
    questions.sort((a, b) => a.order - b.order);
    return {
      success: true,
      questions: questions
    };
  } catch (error) {
    return {
      success: false,
      message: "設問データの取得に失敗しました: " + error.message
    };
  }
}

// 既存の回答データを取得
function getExistingAnswers(memberID) {
  try {
    const sheet = getAnswerSheet();
    
    // シートが空の場合は空の回答を返す
    if (sheet.getLastRow() === 0) {
      return {
        success: true,
        answers: {}
      };
    }
    
    const data = sheet.getDataRange().getValues();
    const answers = {};

    if (data.length > 1) {
      const headers = data[0]; // ヘッダー行（1行目）
      
      // 該当会員の行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == memberID) {
          // 設問IDの列から回答を取得（会員番号列は除外）
          for (let j = 1; j < headers.length && j < data[i].length; j++) {
            const questionId = headers[j];
            const answer = data[i][j];
            
            // 設問IDが有効で、回答が空でない場合のみ追加
            if (questionId && questionId !== '' && answer && answer !== '') {
              answers[questionId] = answer;
            }
          }
          break;
        }
      }
    }

    return {
      success: true,
      answers: answers,
      hasExistingData: Object.keys(answers).length > 0
    };
  } catch (error) {
    return {
      success: false,
      message: "既存回答データの取得に失敗しました: " + error.message
    };
  }
}
// 回答データを保存
function submitAnswers(memberID, answers) {
  try {
    const answerSheet = getAnswerSheet();
    const memberSheet = getMemberSheet();
    const now = new Date();
    const timeString = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");

    // シートが空の場合、初期化
    if (answerSheet.getLastRow() === 0) {
      answerSheet.appendRow(['会員番号']);
    }

    // 現在のデータとヘッダーを取得
    const data = answerSheet.getDataRange().getValues();
    let headers = data[0] || ['会員番号'];
    let memberRowIndex = -1;

    // 該当会員の行を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == memberID) {
        memberRowIndex = i;
        break;
      }
    }

    // 新しい設問IDがある場合、ヘッダーに追加
    const questionIds = Object.keys(answers);
    let headersUpdated = false;
    
    questionIds.forEach(questionId => {
      if (!headers.includes(questionId)) {
        headers.push(questionId);
        headersUpdated = true;
      }
    });

    // 最終更新日時列を追加（まだない場合）
    if (!headers.includes('最終更新日時')) {
      headers.push('最終更新日時');
      headersUpdated = true;
    }

    // ヘッダーが更新された場合、シートに反映
    if (headersUpdated) {
      // 既存のデータがある場合は、新しい列を追加
      if (data.length > 1) {
        // 既存の全データを取得
        const existingData = answerSheet.getDataRange().getValues();
        
        // シートをクリアして、新しいヘッダーで再構築
        answerSheet.clear();
        answerSheet.appendRow(headers);
        
        // 既存データを新しい構造で復元
        for (let i = 1; i < existingData.length; i++) {
          const newRow = new Array(headers.length).fill('');
          newRow[0] = existingData[i][0]; // 会員番号
          
          // 既存の回答を対応する新しい列に配置
          for (let j = 1; j < existingData[0].length && j < existingData[i].length; j++) {
            const oldQuestionId = existingData[0][j];
            const newColumnIndex = headers.indexOf(oldQuestionId);
            if (newColumnIndex !== -1 && existingData[i][j]) {
              newRow[newColumnIndex] = existingData[i][j];
            }
          }
          
          answerSheet.appendRow(newRow);
        }
        
        // データを再取得
        const updatedData = answerSheet.getDataRange().getValues();
        
        // 会員の行インデックスを再検索
        memberRowIndex = -1;
        for (let i = 1; i < updatedData.length; i++) {
          if (updatedData[i][0] == memberID) {
            memberRowIndex = i;
            break;
          }
        }
      } else {
        answerSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }

    // 回答データの行を準備
    const answerRow = new Array(headers.length).fill('');
    answerRow[0] = memberID; // 会員番号

    // 既存の回答がある場合は保持
    if (memberRowIndex !== -1) {
      const currentData = answerSheet.getDataRange().getValues();
      const existingRow = currentData[memberRowIndex];
      
      // 既存の回答をコピー
      for (let i = 0; i < Math.min(existingRow.length, answerRow.length); i++) {
        if (existingRow[i] && existingRow[i] !== '') {
          answerRow[i] = existingRow[i];
        }
      }
    }

    // 新しい回答で上書き
    questionIds.forEach(questionId => {
      const columnIndex = headers.indexOf(questionId);
      if (columnIndex !== -1) {
        answerRow[columnIndex] = answers[questionId] || '';
      }
    });

    // 最終更新日時を設定
    const timeColumnIndex = headers.indexOf('最終更新日時');
    if (timeColumnIndex !== -1) {
      answerRow[timeColumnIndex] = timeString;
    }

    // 既存の行がある場合は更新、ない場合は新規追加
    if (memberRowIndex !== -1) {
      answerSheet.getRange(memberRowIndex + 1, 1, 1, headers.length).setValues([answerRow]);
    } else {
      answerSheet.appendRow(answerRow);
    }

    // 会員データの最終送信日時を更新
    const memberData = memberSheet.getDataRange().getValues();
    for (let i = 1; i < memberData.length; i++) {
      if (memberData[i][0] == memberID) {
        memberSheet.getRange(i + 1, 7).setValue(timeString); // G列に最終送信日時
        break;
      }
    }

    return {
      success: true,
      message: "回答を正常に保存しました。"
    };
  } catch (error) {
    return {
      success: false,
      message: "データの保存に失敗しました: " + error.message
    };
  }
}

// 会員データを更新
function updateMemberData(memberID, name, email, organization, gender) {
  try {
    const sheet = getMemberSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == memberID) {
        sheet.getRange(i + 1, 3).setValue(name); // C列: 氏名
        sheet.getRange(i + 1, 4).setValue(email); // D列: メールアドレス
        sheet.getRange(i + 1, 5).setValue(organization); // E列: 所属
        sheet.getRange(i + 1, 6).setValue(gender); // F列: 性別
        return {
          success: true
        };
      }
    }

    return {
      success: false,
      message: "会員データが見つかりません。"
    };
  } catch (error) {
    return {
      success: false,
      message: "会員データの更新に失敗しました: " + error.message
    };
  }
}

// 特定の設問のみ部分更新
function updatePartialAnswers(memberID, partialAnswers) {
  try {
    const answerSheet = getAnswerSheet();
    const now = new Date();
    const timeString = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");

    // 既存の全回答を取得
    const existingResponse = getExistingAnswers(memberID);
    if (!existingResponse.success) {
      return existingResponse;
    }

    // 既存回答と新しい回答をマージ
    const mergedAnswers = { ...existingResponse.answers, ...partialAnswers };

    // 通常の保存処理を実行
    return submitAnswers(memberID, mergedAnswers);
  } catch (error) {
    return {
      success: false,
      message: "部分更新に失敗しました: " + error.message
    };
  }
}

// 回答データの履歴を取得（デバッグ用）
function getAnswerHistory(memberID) {
  try {
    const sheet = getAnswerSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return {
        success: true,
        history: [],
        message: "データがありません"
      };
    }

    const headers = data[0];
    let memberRow = null;

    // 該当会員の行を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == memberID) {
        memberRow = data[i];
        break;
      }
    }

    if (!memberRow) {
      return {
        success: true,
        history: [],
        message: "該当会員のデータが見つかりません"
      };
    }

    // データを整形
    const formattedData = {};
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] && memberRow[i] && memberRow[i] !== '') {
        formattedData[headers[i]] = memberRow[i];
      }
    }

    return {
      success: true,
      history: [formattedData],
      headers: headers
    };
  } catch (error) {
    return {
      success: false,
      message: "履歴取得に失敗しました: " + error.message
    };
  }
}