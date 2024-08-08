chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.i18n.getMessage('tutorial') })
  }
})
