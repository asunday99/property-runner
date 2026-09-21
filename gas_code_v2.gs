function doGet(e) {
  // 대표님의 구글 스프레드시트 ID를 여기에 입력하세요.
  // (예: https://docs.google.com/spreadsheets/d/이부분/edit 의 '이부분')
  var SPREADSHEET_ID = '여기에_스프레드시트_ID_입력'; 
  
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheets = ss.getSheets();
    var result = {};
    
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var sheetName = sheet.getName();
      
      // 시트의 모든 데이터를 2D 배열(Raw 2D Array) 형태로 가져옵니다.
      // 이렇게 하면 헤더 규칙에 얽매이지 않고 프론트엔드에서 텍스트 기반으로 검색할 수 있습니다.
      var data = sheet.getDataRange().getValues();
      
      result[sheetName] = data;
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
