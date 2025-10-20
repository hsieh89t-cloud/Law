/****************************************************
 * ui.gs — UI 選單入口（v3.8）
 ****************************************************/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('法務智研')
    .addItem('① 抓取法條（A~C 欄）', 'fetchAndParseLaw')
    .addItem('② 生成單條筆記（→ D 欄）', 'formatSingleNote')
    .addItem('③ 批次生成（區間）', 'formatBatchNotes')
    .addSeparator()
    .addItem('🔤 產生關鍵字（只補 B 欄空白）', 'genKeywordsForEmptyB')
    .addItem('以 B 欄關鍵字批次自動填判例', 'autoFillCasesBatch')
    .addItem('自動查判例（單條：逐關鍵字）', 'autoUpdateValuableCaseDialog')
    .addItem('更新判例（人工輸入：單條）', 'updateCaseForArticleDialog')
    .addSeparator()
    .addItem('快速切換法規（常用）', 'quickSelectLaw')
    .addItem('自訂 pcode 與法名', 'setLawByPcodeDialog')
    .addSeparator()
    .addItem('設定 OpenAI API 金鑰', 'setOpenAIKey')
    .addSeparator()
    .addItem('設定司法院密碼（帳號固定 v3681）', 'jy_setPasswordOnly')
    .addItem('測試授權登入狀態', 'jy_testAuth')
    .addSeparator()
    .addItem('查看目前設定', 'showCurrentConfig')
    .addToUi();
}
