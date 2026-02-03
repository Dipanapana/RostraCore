const { app, BrowserWindow } = require('electron');

console.log('app:', app);
console.log('BrowserWindow:', BrowserWindow);

app.whenReady().then(() => {
  console.log('Electron app ready!');
  const win = new BrowserWindow({
    width: 800,
    height: 600
  });

  win.loadURL('https://www.google.com');

  setTimeout(() => {
    console.log('Quitting after 5 seconds');
    app.quit();
  }, 5000);
});

app.on('window-all-closed', () => {
  app.quit();
});
