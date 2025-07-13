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

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == memberID) {
        answers[data[i][1]] = data[i][2]; // 設問ID: 回答内容
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

    // 既存の回答を削除（同じ会員番号の行をクリア）
    const existingData = answerSheet.getDataRange().getValues();
    const rowsToDelete = [];

    for (let i = existingData.length - 1; i >= 1; i--) {
      if (existingData[i][0] == memberID) {
        rowsToDelete.push(i + 1);
      }
    }

    // 行を削除（後ろから削除して行番号のずれを防ぐ）
    rowsToDelete.forEach(rowNum => {
      answerSheet.deleteRow(rowNum);
    });

    // 新しい回答を追加
    Object.keys(answers).forEach(questionId => {
      if (answers[questionId]) { // 空でない回答のみ保存
        answerSheet.appendRow([memberID, questionId, answers[questionId], timeString]);
      }
    });

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