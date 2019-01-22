import BrowserWindow from 'sketch-module-web-view'
const UI = require('sketch/ui');

export default function(context) {

  const options = {
    identifier: 'unique.id',
    x: 270, y: -50,
    width: 1114, height: 957,
    minWidth: 900, minHeight: 890, 
    backgroundColor: '#ffffff',
    alwaysOnTop: true,
    acceptsFirstMouse: true,
    opacity: 1,
  }
  const browserWindow = new BrowserWindow(options);

  browserWindow.once('ready-to-show', () => {
    browserWindow.show();
  });

  const webContents = browserWindow.webContents,
        callOnWebView = someFunction => webContents.executeJavaScript(someFunction);
        FontBook = Array.from(NSFontManager.sharedFontManager().availableFonts()); // .availableFontFamilies
        FontBookLength = FontBook.length;
        
  // Sends Font Book as a String to the WebView
  webContents.on('initFontQuery', () => callOnWebView(`sortGlyphs("${FontBook.length}")`));
  
  // Sends O Path Description upon Request by the Web View
  webContents.on('getBezier', indexAndType => {
    const text = MSTextLayer.alloc().init();
    indexAndType[1] == 'contrast' ? text.setStringValue('O') : '';
    indexAndType[1] == 'xHeight' ? text.setStringValue('Hx') : '';
    indexAndType[1] == 'proportion' ? text.setStringValue('O') : '';
    indexAndType[1] == 'weight' ? text.setStringValue('E') : '';
    indexAndType[1] == 'serif' ? text.setStringValue('I') : '';
    text.setFontSize(72); //500
    text.setKerning(3);
    text.setFontPostscriptName(FontBook[indexAndType[0]]);

    const Path = NSBezierPath.bezierPathWithPath(text.pathInFrame()).toString(),
          viewBox = Path.match(/bounds: {{.*/)[0].replace(/[\:a-z{,}]/g,''),
                d = Path.replace(/(\d.*)moveto/g, 'M$1')
                        .replace(/(\d.*)curveto/g, 'C$1')
                        .replace(/(\d.*)lineto/g, 'L$1')
                        .replace(/closepath/g, 'Z ').replace(/\n *|M.*$|[PBC]\D.*/g, '')
                        .replace(/-M/g, 'M-').replace(/-L/g, 'L-').replace(/-C/g, 'C-');

    callOnWebView(`setOViewBox("${viewBox}")`);
    callOnWebView(`setFont("${FontBook[indexAndType[0]]}, ${[indexAndType[0]]}" )`);
    d.match(/M/g).length <= 2 ? callOnWebView(`setODescription("${d}")`) : ''; // Accepts 2 Paths 
  });

  // Initializes offsetY to render graphics below the previously rendered 
  let offsetY = 20;

  webContents.on('use', fontData => {
    const text = MSTextLayer.alloc().init();
    text.setStringValue('Sphinx of black quartz, judge my vow');
    text.setFontPostscriptName(FontBook[fontData[0]]);
    text.setFontSize(32);
    text.setName(`${fontData[1]}`);
    text.frame().setX(550);
    text.frame().setY(offsetY);
    context.document.currentPage().addLayer(text);
    offsetY += 50;
    //browserWindow.close();
  });

  browserWindow.loadURL(require('../assets/sort.html'));
}