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
          visible: isVisible
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
    const data = sheet.getDataRange().getValues();
    const answers = {};

    if (data.length > 1) {
      const headers = data[0]; // ヘッダー行（1行目）
      
      // 該当会員の行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == memberID) {
          // 設問IDの列から回答を取得（会員番号列は除外）
          for (let j = 1; j < headers.length; j++) {
            if (data[i][j] && data[i][j] !== '') {
              answers[headers[j]] = data[i][j];
            }
          }
          break;
        }
      }
    }

    return {
      success: true,
      answers: answers
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

    // 現在のデータとヘッダーを取得
    const data = answerSheet.getDataRange().getValues();
    let headers = [];
    let memberRowIndex = -1;

    // ヘッダー行が存在するかチェック
    if (data.length > 0) {
      headers = data[0];
    } else {
      // 初回の場合、ヘッダー行を作成
      headers = ['会員番号'];
      answerSheet.appendRow(headers);
    }

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

    // ヘッダーが更新された場合、シートに反映
    if (headersUpdated) {
      answerSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // 回答データの行を準備
    const answerRow = new Array(headers.length).fill('');
    answerRow[0] = memberID; // 会員番号

    // 各設問IDの回答を対応する列に設定
    questionIds.forEach(questionId => {
      const columnIndex = headers.indexOf(questionId);
      if (columnIndex !== -1 && answers[questionId]) {
        answerRow[columnIndex] = answers[questionId];
      }
    });

    // 既存の行がある場合は更新、ない場合は新規追加
    if (memberRowIndex !== -1) {
      // 既存の回答を保持しつつ新しい回答で上書き
      const existingRow = data[memberRowIndex];
      for (let i = 0; i < headers.length; i++) {
        if (i < existingRow.length && existingRow[i] !== '' && answerRow[i] === '') {
          answerRow[i] = existingRow[i]; // 既存の回答を保持
        }
      }
      answerSheet.getRange(memberRowIndex + 1, 1, 1, headers.length).setValues([answerRow]);
    } else {
      // 新規行として追加
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