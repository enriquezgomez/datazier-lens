import BrowserWindow from 'sketch-module-web-view'
const UI = require('sketch/ui');

export default function(context) {

  const options = {
//  identifier: 'unique.id', Allows multiple windows!!
    x: 200, y: -50,
    width: 557, height: 957,
    minWidth: 490, minHeight: 890,  //560
    backgroundColor: '#ffffff',
    alwaysOnTop: true,
    acceptsFirstMouse: true,
    //opacity: .95,
  }
  const browserWindow = new BrowserWindow(options);
  options.x += 20;

  browserWindow.once('ready-to-show', () => {
    browserWindow.show();
  });

  const webContents = browserWindow.webContents,
        callOnWebView = someFunction => webContents.executeJavaScript(someFunction);
        FontBook = Array.from(NSFontManager.sharedFontManager().availableFonts());
        
  // Sends Font Book as a String to the WebView
  webContents.on('did-finish-load', () => callOnWebView(`setFontDropdown("${FontBook}")`));
  
  // Sends O Path Description upon Request by the Web View
  webContents.on('getBezier', indexAndType => {
    const text = MSTextLayer.alloc().init();
    indexAndType[1] == 'Contrast' ? text.setStringValue('O') : '';
    indexAndType[1] == 'X-Height' ? text.setStringValue('Hx') : '';
    indexAndType[1] == 'Proportion' ? text.setStringValue('O') : '';
    indexAndType[1] == 'Weight' ? text.setStringValue('E') : '';
    indexAndType[1] == 'Serif Style' ? text.setStringValue('I') : '';
    text.setFontSize(72); //500
    text.setKerning(9);
    text.setFontPostscriptName(FontBook[indexAndType[0]]);

    if(indexAndType[1] == 'X-Height') {
      /Zapfino/.test(FontBook[indexAndType[0]]) ? text.setKerning(60) : '';
      /Snell Roundhand/.test(FontBook[indexAndType[0]]) ? text.setKerning(40) : '';
      /Apple Chancery|Kokonor/.test(FontBook[indexAndType[0]]) ? text.setKerning(25) : '';
    }

    const Path = NSBezierPath.bezierPathWithPath(text.pathInFrame()).toString(),
          viewBox = Path.match(/bounds: {{.*/)[0].replace(/[\:a-z{,}]/g,''),
                d = Path.replace(/(\d.*)moveto/g, 'M$1')
                        .replace(/(\d.*)curveto/g, 'C$1')
                        .replace(/(\d.*)lineto/g, 'L$1')
                        .replace(/closepath/g, 'Z ').replace(/\n *|M.*$|[PBC]\D.*/g, '')
                        .replace(/-M/g, 'M-').replace(/-L/g, 'L-').replace(/-C/g, 'C-');

    callOnWebView(`setOViewBox("${viewBox}")`);
    d.match(/M/g).length <= 2 ? callOnWebView(`setODescription("${d}")`) : ''; // Accepts 2 Paths 
  });

  // Initializes offsetY to render graphics below the previously rendered 
  let offsetY = 20;

  webContents.on('render', svg => {
    // Imports the SVG from the webview into Sketch
    const svgImporter = MSSVGImporter.svgImporter();
    svgImporter.prepareToImportFromData(NSString.stringWithString(svg).dataUsingEncoding(NSUTF8StringEncoding));

    // Sets position and dimensions of the SVG Frame
    const svgLayerGroup = svgImporter.importAsLayer(), 
      svgFrame = svgLayerGroup.frame();
      svgFrame.setX(680);
      svgFrame.setY(offsetY)
      svgFrame.setHeight(svgFrame.height() * 7);
      svgFrame.setWidth(svgFrame.width() * 7);

    // Loops through the layers to set the Thickness to 1
    const svgLayers = svgLayerGroup.containedLayers()[0];
    for(let i = 0 ; i < svgLayers.containedLayersCount() ; i++) {
        let borders = svgLayers.containedLayers()[i].style().borders();
        borders.length ? borders[0].setThickness(1) : '';
    }
    
    // Renders the processed SVG on the current Sketch Page
    context.document.currentPage().addLayer(svgLayerGroup);
    offsetY += 425;
  });

  webContents.on('use', fontData => {
    const text = MSTextLayer.alloc().init();
    text.setStringValue('Sphinx of black quartz, judge my vow');
    text.setFontPostscriptName(FontBook[fontData[0]]);
    text.setFontSize(32);
    text.setName(`${fontData[1]} ≙ ${fontData[2]}`);
    text.frame().setX(550);
    text.frame().setY(offsetY);
    context.document.currentPage().addLayer(text);
    offsetY += 50;
    //browserWindow.close();
  });

  browserWindow.loadURL(require('../assets/webview.html'));
}