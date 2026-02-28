document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');

  startBtn.addEventListener('click', () => {
    // Open room.html in a new tab
    const roomUrl = chrome.runtime.getURL('room.html');
    chrome.tabs.create({ url: roomUrl });
    // Close the popup
    window.close();
  });
});
