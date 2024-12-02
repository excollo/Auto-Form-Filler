
chrome.runtime.onInstalled.addListener(() => {
  console.log("Excel to Form Auto-Fill extension installed.");
  
  chrome.storage.local.set({
    excelData: null,
    currentIndex: 0,
    settings: {
      autoAdvance: true,
      fillDelay: 500,
      retryAttempts: 3,
    },
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkContentScript") {
    sendResponse({ status: "ready" });
  }
  return true;
});
