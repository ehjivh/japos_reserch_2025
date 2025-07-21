// アンケート回答データ可視化システム - メインスクリプト
// Google Apps Script バックエンド

// Webアプリのエントリーポイント
function doGet() {
  return HtmlService.createHtmlOutputFromFile('visualization')
    .setTitle('アンケート回答データ可視化システム')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 既存システムのスプレッドシート取得関数を再利用
function getSpreadsheet() {
  const files = DriveApp.getFilesByName("アンケート調査システム");
  if (!files.hasNext()) {
    throw new Error("『アンケート調査システム』という名前のスプレッドシートが見つかりませんでした。");
  }
  const file = files.next();
  return SpreadsheetApp.open(file);
}

// 各シートを取得する関数
function getMemberSheet() {
  return getSpreadsheet().getSheetByName("会員データ");
}

function getQuestionSheet() {
  return getSpreadsheet().getSheetByName("設問管理");
}

function getAnswerSheet() {
  return getSpreadsheet().getSheetByName("回答データ");
}

/**
 * 設問データを取得（表示可能な設問のみ）
 */
function getVisibleQuestions() {
  try {
    const sheet = getQuestionSheet();
    const data = sheet.getDataRange().getValues();
    const questions = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // 設問IDが存在する場合のみ
        const isVisible = data[i][6] === true || data[i][6] === 'true' || data[i][6] === undefined || data[i][6] === '';

        // 表示フラグがtrueの設問のみ追加
        if (isVisible) {
          questions.push({
            id: data[i][0],
            title: data[i][1],
            type: data[i][2],
            options: data[i][3] ? data[i][3].split(',').map(opt => opt.trim()) : [],
            required: data[i][4] === true || data[i][4] === 'true',
            order: data[i][5] || 999,
            description: data[i][7] || ''
          });
        }
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

/**
 * 回答データを設問別に集計
 */
function getAnswerData() {
  try {
    const answerSheet = getAnswerSheet();
    const memberSheet = getMemberSheet();
    
    // 回答データを取得
    const answerData = answerSheet.getDataRange().getValues();
    const memberData = memberSheet.getDataRange().getValues();
    
    // 総会員数を計算（ヘッダー行を除く）
    const totalMembers = memberData.length - 1;
    
    if (answerData.length <= 1) {
      return {
        success: true,
        data: {},
        totalMembers: totalMembers,
        responseCount: 0
      };
    }

    const headers = answerData[0];
    const responseData = {};
    
    // 回答者数をカウント（重複除外）
    const respondents = new Set();
    
    // 各設問列を処理（会員番号列とタイムスタンプ列を除く）
    for (let colIndex = 1; colIndex < headers.length; colIndex++) {
      const questionId = headers[colIndex];
      
      // タイムスタンプ列や空の列はスキップ
      if (!questionId || questionId.includes('時') || questionId === '') {
        continue;
      }
      
      const answers = [];
      
      // 各行の回答を収集
      for (let rowIndex = 1; rowIndex < answerData.length; rowIndex++) {
        const memberId = answerData[rowIndex][0];
        const answer = answerData[rowIndex][colIndex];
        
        if (memberId && answer && answer !== '') {
          answers.push({
            memberId: memberId,
            answer: answer
          });
          respondents.add(memberId);
        }
      }
      
      if (answers.length > 0) {
        responseData[questionId] = answers;
      }
    }
    
    return {
      success: true,
      data: responseData,
      totalMembers: totalMembers,
      responseCount: respondents.size
    };
  } catch (error) {
    return {
      success: false,
      message: "回答データの取得に失敗しました: " + error.message
    };
  }
}

/**
 * ラジオボタン設問用のグラフデータを生成
 */
function generateRadioChartData(questionId, answers, options) {
  try {
    const counts = {};
    
    // 選択肢を初期化
    options.forEach(option => {
      counts[option] = 0;
    });
    
    // 回答を集計
    answers.forEach(answerObj => {
      const answer = answerObj.answer;
      if (counts.hasOwnProperty(answer)) {
        counts[answer]++;
      } else {
        // 「その他」の回答など、選択肢にない場合
        if (answer.startsWith('その他:')) {
          const otherLabel = 'その他';
          if (counts.hasOwnProperty(otherLabel)) {
            counts[otherLabel]++;
          } else {
            counts[otherLabel] = 1;
          }
        } else {
          counts[answer] = (counts[answer] || 0) + 1;
        }
      }
    });
    
    // 0件の選択肢も含めてグラフデータを生成
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    const total = answers.length;
    
    // パーセンテージを計算
    const percentages = data.map(count => total > 0 ? ((count / total) * 100).toFixed(1) : 0);
    
    return {
      success: true,
      chartData: {
        type: 'radio',
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
            '#4BC0C0', '#FF6384'
          ],
          borderWidth: 2
        }],
        percentages: percentages,
        total: total
      }
    };
  } catch (error) {
    return {
      success: false,
      message: "ラジオボタンデータの生成に失敗しました: " + error.message
    };
  }
}

/**
 * チェックボックス設問用のグラフデータを生成
 */
function generateCheckboxChartData(questionId, answers, options) {
  try {
    const counts = {};
    
    // 選択肢を初期化
    options.forEach(option => {
      counts[option] = 0;
    });
    
    // 回答を集計（複数選択対応）
    answers.forEach(answerObj => {
      const answer = answerObj.answer;
      const selectedOptions = answer.split(',').map(opt => opt.trim());
      
      selectedOptions.forEach(selectedOption => {
        if (counts.hasOwnProperty(selectedOption)) {
          counts[selectedOption]++;
        } else {
          // 「その他」の回答処理
          if (selectedOption.startsWith('その他:')) {
            const otherLabel = 'その他';
            if (counts.hasOwnProperty(otherLabel)) {
              counts[otherLabel]++;
            } else {
              counts[otherLabel] = 1;
            }
          } else {
            counts[selectedOption] = (counts[selectedOption] || 0) + 1;
          }
        }
      });
    });
    
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    const totalResponses = answers.length;
    
    // パーセンテージ（選択率）を計算
    const percentages = data.map(count => 
      totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(1) : 0
    );
    
    return {
      success: true,
      chartData: {
        type: 'checkbox',
        labels: labels,
        datasets: [{
          label: '選択数',
          data: data,
          backgroundColor: '#36A2EB',
          borderColor: '#36A2EB',
          borderWidth: 2
        }],
        percentages: percentages,
        totalResponses: totalResponses
      }
    };
  } catch (error) {
    return {
      success: false,
      message: "チェックボックスデータの生成に失敗しました: " + error.message
    };
  }
}

/**
 * テキスト設問用のデータを生成
 */
function generateTextData(questionId, answers) {
  try {
    const textResponses = [];
    const wordFreq = {};
    const lengthDistribution = {};
    
    answers.forEach(answerObj => {
      const answer = answerObj.answer;
      const memberId = answerObj.memberId;
      
      textResponses.push({
        memberId: memberId,
        answer: answer,
        length: answer.length
      });
      
      // 文字数分布を計算
      const lengthRange = Math.floor(answer.length / 50) * 50; // 50文字単位
      const rangeLabel = `${lengthRange}-${lengthRange + 49}文字`;
      lengthDistribution[rangeLabel] = (lengthDistribution[rangeLabel] || 0) + 1;
      
      // 簡単なワード頻度分析（スペースと句読点で分割）
      const words = answer.split(/[\s、。！？\n]+/)
        .filter(word => word.length > 1 && word.length < 20) // 1文字以下と20文字以上を除外
        .filter(word => !isStopWord(word)); // ストップワード除去
      
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
    });
    
    // 頻出ワードを抽出（上位20個）
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    // 文字数分布のラベルをソート
    const sortedLengthLabels = Object.keys(lengthDistribution).sort((a, b) => {
      const aStart = parseInt(a.split('-')[0]);
      const bStart = parseInt(b.split('-')[0]);
      return aStart - bStart;
    });
    
    return {
      success: true,
      textData: {
        type: 'text',
        responses: textResponses,
        wordCloud: topWords,
        lengthDistribution: {
          labels: sortedLengthLabels,
          data: sortedLengthLabels.map(label => lengthDistribution[label])
        },
        totalResponses: textResponses.length
      }
    };
  } catch (error) {
    return {
      success: false,
      message: "テキストデータの生成に失敗しました: " + error.message
    };
  }
}

/**
 * ストップワード判定（簡易版）
 */
function isStopWord(word) {
  const stopWords = [
    'です', 'ます', 'である', 'ある', 'いる', 'する', 'れる', 'られる',
    'こと', 'もの', 'とき', 'ところ', 'ため', 'など', 'ほか', 'また',
    'しかし', 'それ', 'これ', 'その', 'この', 'あの', 'どの', 'かなり',
    'とても', '非常', 'ちょっと', 'ほぼ', 'やや', 'かなり', 'もっと',
    'から', 'まで', 'より', 'ほど', 'くらい', 'だけ', 'しか', 'ばかり'
  ];
  
  return stopWords.includes(word);
}

/**
 * 特定の設問のグラフデータを取得
 */
function getQuestionChartData(questionId) {
  try {
    // 設問情報を取得
    const questionsResult = getVisibleQuestions();
    if (!questionsResult.success) {
      return questionsResult;
    }
    
    const question = questionsResult.questions.find(q => q.id === questionId);
    if (!question) {
      return {
        success: false,
        message: "指定された設問が見つかりません: " + questionId
      };
    }
    
    // 回答データを取得
    const answersResult = getAnswerData();
    if (!answersResult.success) {
      return answersResult;
    }
    
    const answers = answersResult.data[questionId];
    if (!answers || answers.length === 0) {
      return {
        success: true,
        chartData: null,
        message: "この設問には回答がありません"
      };
    }
    
    // 設問タイプに応じてデータを生成
    switch (question.type) {
      case 'radio':
        return generateRadioChartData(questionId, answers, question.options);
        
      case 'checkbox':
        return generateCheckboxChartData(questionId, answers, question.options);
        
      case 'text':
        return generateTextData(questionId, answers);
        
      default:
        return {
          success: false,
          message: "サポートされていない設問タイプです: " + question.type
        };
    }
  } catch (error) {
    return {
      success: false,
      message: "グラフデータの生成に失敗しました: " + error.message
    };
  }
}

/**
 * ダッシュボード用の統計情報を取得
 */
function getDashboardStats() {
  try {
    const questionsResult = getVisibleQuestions();
    const answersResult = getAnswerData();
    
    if (!questionsResult.success || !answersResult.success) {
      return {
        success: false,
        message: "統計データの取得に失敗しました"
      };
    }
    
    const questions = questionsResult.questions;
    const answerData = answersResult.data;
    const totalMembers = answersResult.totalMembers;
    const responseCount = answersResult.responseCount;
    
    // 設問別の回答率を計算
    const questionStats = questions.map(question => {
      const answers = answerData[question.id] || [];
      const responseRate = totalMembers > 0 ? ((answers.length / totalMembers) * 100).toFixed(1) : 0;
      
      return {
        questionId: question.id,
        title: question.title,
        type: question.type,
        responseCount: answers.length,
        responseRate: responseRate
      };
    });
    
    // 設問タイプ別の統計
    const typeStats = {
      radio: questions.filter(q => q.type === 'radio').length,
      checkbox: questions.filter(q => q.type === 'checkbox').length,
      text: questions.filter(q => q.type === 'text').length
    };
    
    return {
      success: true,
      stats: {
        totalMembers: totalMembers,
        responseCount: responseCount,
        responseRate: totalMembers > 0 ? ((responseCount / totalMembers) * 100).toFixed(1) : 0,
        totalQuestions: questions.length,
        questionStats: questionStats,
        typeStats: typeStats
      }
    };
  } catch (error) {
    return {
      success: false,
      message: "統計データの生成に失敗しました: " + error.message
    };
  }
}

/**
 * 全設問のサマリーデータを取得
 */
function getAllQuestionsData() {
  try {
    const questionsResult = getVisibleQuestions();
    if (!questionsResult.success) {
      return questionsResult;
    }
    
    const questions = questionsResult.questions;
    const allData = [];
    
    questions.forEach(question => {
      const chartDataResult = getQuestionChartData(question.id);
      if (chartDataResult.success) {
        allData.push({
          question: question,
          chartData: chartDataResult.chartData || chartDataResult.textData
        });
      }
    });
    
    return {
      success: true,
      questionsData: allData
    };
  } catch (error) {
    return {
      success: false,
      message: "全設問データの取得に失敗しました: " + error.message
    };
  }
}
