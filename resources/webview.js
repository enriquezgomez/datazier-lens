let svgIntersections = require('svg-intersections'), intersect = svgIntersections.intersect, shape = svgIntersections.shape;
let pointInSvgPolygon = require("point-in-svg-polygon");
import Snap from 'imports-loader?this=>window,fix=>module.exports=0!snapsvg/dist/snap.svg.js';
import pluginCall from 'sketch-module-web-view/client';

// Paper, colors, and aux functions 
const paper = Snap("svg"), grape='#773376', seafoam='#71EEB8', ether='#9EB6B8', aux = {'stroke':ether, 'stroke-width':.1, 'stroke-opacity':.4},
      id = id => document.getElementById(id), remove = elms => [...elms].map(el => el.remove()), flatten = a => Array.prototype.concat(...a),
      pointer = (x,y,r=.5, f=grape,fo=1, s='',sw='.17',so='.64') => paper.circle(x,y,r)
        .attr({'fill':f,'fill-opacity':fo, 'stroke':s,'stroke-width':sw, 'stroke-opacity':so}),
      auxPath = (p,s='') => paper.path(p).attr({'stroke':s, 'fill':'none'});

// Fetches the Font Book String from Sketch into the Font Dropdown Menu | Index 0 is to display 'Inspect a Font' | Helvetica is default 
window.setFontDropdown = fStr => fStr.split(',').map((v, i) => {
  id('fontDropdown')[i + 1] = new Option(v);
  if (v == 'Helvetica') {
    pluginCall('getBezier', [ i, 'Contrast' ]); // This index doesn't receive plus 1, so it doesn't need minus 1
    id('fontDropdown')[i + 1].selected = true;
    id('inspectFont').innerText = '- Inspect a Font';
  } 
});

// Gets the selected PANOSE parameter and the selected Font Index to trigger getBezier and the View accordingly
let panoseType = 'Contrast', panoseNumber, panoseMeaning; // Contrast is default, number and meaning are global
const fontIndex = () => id('fontDropdown').selectedIndex - 1, 
      setPanose = () => {
        panoseType = id('panoseDropdown')[id('panoseDropdown').selectedIndex].value;
        id('panoseTitle').innerText = panoseType;
        panoseType == 'X-Height' ? id('panoseFormula').innerText = '\xa0x-Tall / H-Tall' :
        panoseType == 'Contrast' ? id('panoseFormula').innerText = '\xa0min / max' : 
        panoseType == 'Proportion' ? id('panoseFormula').innerText = '\xa0height / width' : '';
        panoseType == 'Weight' ? id('panoseFormula').innerText = 'E-Height / stem-Width' : '';  
        panoseType == 'Serif Style' ? id('panoseFormula').innerText = 'foot-Width / stem-Width' : ''; 
        return panoseType;
      } 
      
// Requests Bezier Description and View-Box from the selected Font and PANOSE parameter  
['click','change'].map(e => id('fontDropdown').addEventListener(e, () => pluginCall('getBezier', [fontIndex(), setPanose()])));
['click','change'].map(e => id('panoseDropdown').addEventListener(e, () => pluginCall('getBezier', [fontIndex(), setPanose()])));
window.setOViewBox = viewBox => id('SVG').setAttribute('viewBox', viewBox);

// Locks focus on fontDropdown for hot typed searches
window.onmouseup = e => id('fontDropdown').focus();
id('fontDropdown').focus();

/****************************************************
The Received Description Triggers the Font Inspection 
*****************************************************/
window.setODescription = d => {
  console.log(d);
  // Resets Distance Range Slider and Padding
  id('measure').reset(), id('SVG').style.padding = '1.5em';     

  // Removes all previous SVG Path Elements but the letter path
  remove(document.querySelectorAll("#SVG *:not(:first-child)"));

  // Reseting any rotation relative to the center of the bounding box 
  const BBox = Snap.path.getBBox(d), resetRotation = new Snap.Matrix();
  resetRotation.rotate(0, BBox.cx, BBox.cy); 

  // A function to fetch the anchors' coordinates by their type
  const anchorsType = regex => Snap.path.toAbsolute(d)
    .filter(v => regex.test(v)).map(v => v = v.length == 3 ? {x:v[1], y:v[2]} : {x:v[5], y:v[6]});

  // A function to fetch the coordinates of all anchors
  const anchors = Snap.path.toAbsolute(d).filter(v => /[MLC]/.test(v))
    .map(v => v = v.length == 3 ? {x:v[1], y:v[2], type:'rect'} : {x:v[5], y:v[6], type:'curve'});  

  // The letter description is updated with the selected font and its rotation and styling are reseted
  Snap('#glyph').transform(resetRotation)
    .attr({'d':d, 'fill-opacity':.06, 'fill':ether, 'stroke':ether, 'stroke-width':.13, 'stroke-opacity':.75});

  // Fetching Outer and Inner Path Descriptions OR First and Second Letter. Pending to change it for 4 letters if needed
  let outerDef = d.replace(/Z.*/, 'Z'),   //erases the last path with the Z of the previous path, so that Z is restored
      innerDef = d.replace(/.*Z M/, 'M'); //erases the first path with the M of the following path, so that M is restored
  
  // Finds the closest value To the Match In a given Array
  const closestToIn = (match, arr) => arr.reduce((acc, v) => (Math.abs(v - match) <= Math.abs(acc - match) ? v : acc));    

  // If necessary checks if the outerDef is really the outerDef, otherwise swaps defs to have the right outerDef
  const outerDefIsRequired = () => {
    if (Snap.path.getBBox(outerDef).vb != BBox.vb) {
      outerDef = d.replace(/.*Z M/, 'M');
      innerDef = d.replace(/Z.*/, 'Z');
    }
  }

  // Pointer at Length Function with variable Radii to enable **Live Measurement**
  const pointerAtLength = (path, length, outerRadius, innerRadius='.5', sWidth=.16) => {
    const PAL= Snap.path.getPointAtLength(path, length);
    pointer(PAL.x, PAL.y, outerRadius, ether, 0.1, ether, sWidth).addClass('userCreated');
    pointer(PAL.x, PAL.y, innerRadius).addClass('userCreated');
      return {x: PAL.x, y: PAL.y};
  }
  
  // A function to check if a given point x, y is inside a Magnet Circle cx, cy, r  
  const xyMag = (x,y, cx,cy,r) => (x - cx)*(x - cx) + (y - cy)*(y - cy) <= r * r;
        
  /************************
    Contrast Measurements 
  *************************/
  if (panoseType == 'Contrast') {
    id('glyph').setAttribute('stroke-width', .12);

    // Fetching Aux Path to calculate Closest Points
    const innerPath = auxPath(innerDef);
    
    // Drawing Inner Distance from Absolute Positioned Anchor Points while excluding M & Z  
    const distance = Snap.path.toAbsolute(outerDef).filter(v => v.includes('C')).map(v => {
      const iAnchor = Snap.closestPoint(innerPath, v[5], v[6]);
  
      pointer(iAnchor.x, iAnchor.y, .4, seafoam, .75);
      pointer(v[5], v[6], .4, seafoam, .75); //[5] & [6] from C hold the anchor coordinates 
  
      const dPath = paper.path(`M ${v[5]}, ${v[6]} L ${iAnchor.x}, ${iAnchor.y}`)
        .attr({'stroke': ether, 'stroke-width':.13, 'stroke-opacity':.25});
  
      return v = {d: iAnchor.distance, l: iAnchor.length, x: v[5], y: v[6], x2: iAnchor.x, y2: iAnchor.y, dP: dPath}; 
    }); 
  
    // Calculating maxDistance, minDistance and Contrast
    const maxDistance = Math.max(...distance.map(v => v.d)),
          minDistance = Math.min(...distance.map(v => v.d)), 
          k = (minDistance / maxDistance).toFixed(2);
    
    // Printing maxDistance, minDistance and K  //  : [ min / max ] 
    id('panoseSubstitution').innerHTML = `${minDistance.toFixed(1)} / ${maxDistance.toFixed(1)} = ${k} ≙`;
    
    // Classifying Panose Contrast Numbers 
    panoseNumber = k>.8 ? 2 : k<=.8 && k>.65 ? 3 : k<=.65 && k>.48 ? 4 : k<=.48 && k>.3 ? 5 : k<=.3 
                && k>.2 ? 6 : k<=.2 && k>.15 ? 7 : k<=.15 && k>.08 ? 8 : k<=.08 && k > 0 ? 9 : 1;
  
    // Labels for Contrast Meaning       
    const contrastArray = ['No Fit', 'No Contrast', 'Very Low', 'Low', 'Medium Low', 'Medium', 'Medium High', 'High', 'Very High'];
    panoseMeaning = contrastArray[panoseNumber - 1];
  
    // Printing Panose Contrast
    id('panoseMeaning').innerHTML = panoseMeaning;
    id('panoseNumber').value = panoseNumber;
     
    // For labeling the layers when the Use Function is called
    panoseMeaning = panoseMeaning != 'No Contrast' ? `${panoseMeaning} Contrast` : panoseMeaning;
    
    // Drawing Circles for Max and Min Distance and Returning Max amd Min Length and Points;
    distance.map((v,i) => { 
      if (v.d == minDistance) {
        pointer(v.x, v.y, 1, 'none', '', ether);	
        pointer(v.x2, v.y2, 1, 'none', '', ether);
        return minD = { length : i + 1, x: v.x, y: v.y };
      }
      if (v.d == maxDistance) {
        pointer(v.x, v.y, 2.1, 'none', '', ether);
        pointer(v.x2, v.y2, 2.1, 'none', '', ether);
        return maxD = { length : i + 1, x: v.x, y: v.y };
      }
    });
    
    // Calculating the length of every segment on the outer Path plus the Total Length 
    let segCombo = ''; 
    const segLength = outerDef.match(/.+?(?=[CZ])/g).map(v => Snap.path.getTotalLength(auxPath(segCombo += v))),
          length = Snap.path.getTotalLength(outerDef);
    
    // Set Magnets Before and After MaxDistance Lenghts to ensure the slider can display those lengths
    const setMagnet = (length, offset) => Snap.path.getPointAtLength(outerDef,  segLength[length] + offset),
          maxMagS = setMagnet(maxD.length, -.45), maxMagN = setMagnet(maxD.length, .45),
          minMagS = setMagnet(minD.length, -.45), minMagN = setMagnet(minD.length, .45);
          
    // ***Function to get the letter width along various length points***								
    const drawDistance = outerLength => {
      remove(document.querySelectorAll(".userCreated"));
  
      // Setting Outer and Inner Pointers at Length
      const oPAL = pointerAtLength(outerDef, outerLength, 1.6),
            innerPoint = Snap.closestPoint(innerPath, oPAL.x, oPAL.y),	
            iPAL = pointerAtLength(innerDef, innerPoint.length, 1.6);
  
      paper.path(`M ${oPAL.x}, ${oPAL.y} L ${iPAL.x}, ${iPAL.y}`).attr({'stroke': seafoam, 'stroke-width': .3, 'stroke-opacity': .7,
        'class': 'userCreated' }); 
      
      id('lengthOutput').value = innerPoint.distance.toFixed(1);
      
      // Magnets - When the Point at Length enters the Magnet South or North Circles, the Distance is redrawn to the exact min or max Distance Length
      // The conditionals avoid Infinite Loops if the min or max Distance Length is at the beginning or ending of the Path's Total Length !!!!
      if (segLength[maxD.length] != length && segLength[maxD.length] != 0) {
        xyMag(oPAL.x, oPAL.y, maxMagS.x, maxMagS.y, .35) || xyMag(oPAL.x, oPAL.y, maxMagN.x, maxMagN.y, .35) ? drawDistance(segLength[maxD.length]) : '';
      }
      
      if (segLength[minD.length] != length && segLength[minD.length] != 0) {
        xyMag(oPAL.x, oPAL.y, minMagS.x, minMagS.y, .35) || xyMag(oPAL.x, oPAL.y, minMagN.x, minMagN.y, .35) ? drawDistance(segLength[minD.length]) : '';
      }
    }
    
    // Drawing Distance and set Slider Length Attributes Accordingly
    id('measurement').innerText = 'Thickness';
    id('lengthInput').setAttribute('step', 'any');
    id('lengthInput').setAttribute('value', segLength[maxD.length]);
    id('lengthInput').setAttribute('max', length);   
    drawDistance(id('lengthInput').getAttribute('value'));
  
    // Fetching Values
    id('lengthInput').oninput = e => drawDistance(e.target.value);
  }

  /************************
    X-Height Measurements 
  *************************/
  if (panoseType == 'X-Height') {
    // Renaming the Path Definitions Accordingly
    const HDef = outerDef, xDef = innerDef;
    
    id('glyph').setAttribute('stroke-width', .14);
    // Drawing Anchor Points 
    [HDef, xDef].map(v => Snap.path.toAbsolute(v).filter(v => /[ML]/.test(v)).map(v => pointer(v[1], v[2], .4, ether, .4)));  
    [HDef, xDef].map(v => Snap.path.toAbsolute(v).filter(v => /[C]/.test(v)).map(v => pointer(v[5], v[6], .4, ether, .4)));  

    // Fetching H and x Bounding Boxes 
    const HBox = Snap.path.getBBox(HDef), xBox = Snap.path.getBBox(xDef);

    // Drawing H-Tall
    const tallStyle = {'stroke': ether, 'stroke-width':.2, 'stroke-opacity':.25};
    paper.line(HBox.x2, HBox.y2, HBox.x2, HBox.y).attr(tallStyle);
    
    // Drawing x-Tall from the H baseline to the upper edge of the x Bounding Box. Adjusted for intersection
    const xTall = Snap.path.getTotalLength(paper.path(`M ${xBox.x}, ${HBox.y2} L ${xBox.x}, ${xBox.y}`).attr(tallStyle));

    // Getting Middle X to draw the Middle tallLine between H and x    
    const midX = (Snap.len(HBox.x2, HBox.y2, xBox.x, HBox.y2) / 2) + HBox.x2,
          tallLine = paper.path(`M ${midX}, ${HBox.y2} L ${midX}, ${HBox.y}`).attr({'stroke':seafoam, 'stroke-width':.3, 'stroke-opacity':1}),
          tallLength = tallLine.getTotalLength();
    
    // Drawing the dots of the Middle tallLine
    pointer(midX, HBox.y2, .4, seafoam), pointer(midX, HBox.y, .4, seafoam);

    // Drawing the Lens Pointers to mark the H-Tall and the X-Tall (Adjusted for intersection) 
    pointer(midX, HBox.y, 1.6, 'none', '', ether, .2), pointer(midX, xBox.y, 3.3, 'none', '', ether, .2);

    // Calculating the x-Ratio
    const x = xTall / tallLength;
      
    // Printing x-Tall, H-Tall and x-Ratio
    id('panoseSubstitution').innerHTML = `${xTall.toFixed(1)} / ${tallLength.toFixed(1)} = ${x.toFixed(2)} ≙`;
    
    // Classifying Panose X-Height Numbers
    panoseNumber = x<=.50 ? 2 : x>.50 && x<=.66 ? 3 : x>.66 ? 4 : '';
    
    // Labels for X-Height Meaning 
    const xHeightArray = ['Small', 'Standard', 'High'];
    panoseMeaning = xHeightArray[panoseNumber - 2];

    // Printing Panose X-Height
    id('panoseMeaning').innerHTML = panoseMeaning;
    id('panoseNumber').value = panoseNumber; 
    
    // For labeling the Sketch Layers when the Use Function is called
    panoseMeaning = `${panoseMeaning} X-Height`;

    // Function to fetch the Intesection Points between the glyphs and the measuring line or rectangle
    const intersectionPoints = (def, lineOrRect) => intersect(lineOrRect, shape("path", {d: def})).points.map(v => v.x).sort((a, b) => a - b);
    
    // A Line-Intersection is quite precise along a Bounding Box, because there are anchor(s)
    const line2Intersect = shape("line", {x1:HBox.x ,y1:xBox.y, x2:xBox.x2 ,y2:xBox.y});

    // Drawing the Horizontal xTall Roof with the corresponding intersection points 
    const xTallRoof = intersectionPoints(d, line2Intersect);
    paper.line(xTallRoof[0], xBox.y, xTallRoof[xTallRoof.length - 1] , xBox.y).attr({'stroke':seafoam, 'stroke-width':.32, 'stroke-opacity':.55});

    // Drawing Horizontal H Baseline 
    paper.line(HBox.x, HBox.y2, xBox.x2, HBox.y2).attr({'stroke': ether, 'stroke-width':.2, 'stroke-opacity':.2});
   
    // Measure Style to be used within the drawDistance function below
    const measureStyle = {'stroke': seafoam, 'stroke-width':.32, 'stroke-opacity':1, 'class':'userCreated'};

    // Setting step of the slider to .2 since any or smaller delivers confuse/buggy interaction
    id('lengthInput').setAttribute('step', .1);

    // **** Function to get the letter height along various length points **** //								
    const drawDistance = atTallLength => {
      remove(document.querySelectorAll(".userCreated"));

      // Setting lengthOutput to Tall Length
      id('lengthOutput').value = parseFloat(atTallLength).toFixed(1);

      // Setting without drawing the Y of the Tall Pointer. It will be drawn later on top of the measuring line 
      const Y = pointerAtLength(tallLine, atTallLength, 0, 0).y;

      // Between anchors a Rectangle-Intersection ensures that all visual intersections are retrieved
      const rect2Intersect = shape("rect", {x:HBox.x, y:Y, width:xBox.x2-HBox.x, height:.3});  
      
      // interH uses rect2Intersect and interX line2Intersect at the xTall point for precision and rect2Intersect anywhere else. Can be tuned!
      const interH = intersectionPoints(HDef, rect2Intersect),
            interX = Y.toFixed(1) == (xBox.y).toFixed(1) ? intersectionPoints(xDef, rect2Intersect) : intersectionPoints(xDef, rect2Intersect); 

      // Only lines whose middle point is inside the given path definition are drawn      
      const linesWithin = (inter, def) => inter.map((x, i, a) => {
        if ( a[i+1] != undefined && pointInSvgPolygon.isInside([(a[i+1]+x)/2, Y], def) ) {
          paper.line(x,Y, a[i+1],Y).attr(measureStyle);
          return [x, a[i+1]];
        } //x < midX ? paper.line(x,Y, midX,Y).attr(measureStyle) : ''; Also can be tuned!
        if (Y.toFixed(1) == (xBox.y).toFixed(1) && x > midX) {
          //a[i+1] != undefined && pointInSvgPolygon.isInside([(a[i+1]+x)/2, Y], def) ? paper.line(x,Y, a[i+1],Y).attr(measureStyle) : '';
          return [x];
        }           
      });  

      // EdgePoints are calculated at the ends of lines within and undefined returned values are filtered out  
      const EdgePointsH = linesWithin(interH, HDef).filter(v => v), EdgePointsX = linesWithin(interX, xDef).filter(v => v);

      // If there are edge points, then lines are drawn from the midline to the H path and to the x path
      EdgePointsH.length ? paper.line(EdgePointsH[EdgePointsH.length - 1][1],Y, midX,Y).attr(measureStyle) : ''; 
      EdgePointsX.length ? paper.line(midX,Y, EdgePointsX[0][0],Y).attr(measureStyle) : '';
      
      // The Tall Pointer is visualized on Top of the Measuring Line
      pointerAtLength(tallLine, atTallLength, 2.5, .75, .18);

      // Set Magnet Points Before and After Lens Lenghts to ensure the slider can display such lengths
      const setMagnet = (length, offset) => Snap.path.getPointAtLength(tallLine,  length + offset),
      xTallMagS = setMagnet(xTall, -.3), xTallMagN = setMagnet(xTall, .3);

      // Magnets - When the Point at Length enters the Magnet South or North Circles, the Distance is redrawn to the exact Lens Length
      // The conditionals avoid Infinite Loops if the xTall Length is at the beginning or ending of the Path's Total Length !!!!
      if (xTall != length && xTall != 0 && tallLength > xTall) {
        xyMag(midX, Y, midX, xTallMagS.y, .2) || xyMag(midX, Y, midX, xTallMagN.y, .2) ? drawDistance(xTall) : '';
      }
    }

    // Drawing Height and set Slider Length Attributes Accordingly
    id('measurement').innerText = 'Height';
    id('lengthInput').setAttribute('value', xTall);
    id('lengthInput').setAttribute('max', tallLength.toFixed(1)); //HBox.height.toFixed(1)   
    drawDistance(id('lengthInput').getAttribute('value'));
  
    // Fetching Values
    id('lengthInput').oninput = e => drawDistance(e.target.value);
  }

  /************************
    Proportion Measurements 
  *************************/
 if (panoseType == 'Proportion') {
  outerDefIsRequired();

  // Drawing the fixed O on top of the rotatable O which was loaded before this conditional
  paper.path(d).attr({'stroke':ether, 'stroke-width':.18, 'stroke-opacity':.5, 'fill':'#F9FBFB', 'fill-opacity':.74});
  // [outerDef, innerDef].map(v => Snap.path.toAbsolute(v).filter(v => v.includes('C')).map(v => pointer(v[5], v[6], .3, ether, .5)));  

  // Getting the bounding box of the rotatable O and drawing its center
  const OBox = Snap.path.getBBox(d);

  // Calculating the proportion (height/width) 
  const o = OBox.h / OBox.w;

  // Calculating and printing height, width and proportion
  id('panoseSubstitution').innerHTML = `${OBox.h.toFixed(1)} / ${OBox.w.toFixed(1)} = ${o.toFixed(2)} ≙`;
  
  // Classifying the Panose proportion numbers
  panoseNumber = o>.92 && o <=1.27 ? 4 : o>.9 && o<=.92 ? 5 : o>1.27 && o<=2.1 ? 6 : o<.9 ? 7 : o>=2.1 ? 8 : '';

  // Labels for Proportion Meaning
  const proportionArray = ['Even Width', 'Extended', 'Condensed', 'Very Extended', 'Very Condensed'];
  panoseMeaning = proportionArray[panoseNumber - 4];

  id('panoseMeaning').innerHTML = panoseMeaning;  
  id('panoseNumber').value = panoseNumber; 
  
  // Passing the degrees upon which the rotatable O and its tall line will rotate
  const rotatePath = degrees => {
    remove(document.querySelectorAll('.userCreated'));

    // Rounding degrees near rect angles to their respective rect angles (90, 180, 270) - [Magnets]
    degrees = degrees >= 86  && degrees <= 89  || degrees >= 91  && degrees <= 94  ? 90 
            : degrees >= 176 && degrees <= 179 || degrees >= 181 && degrees <= 184 ? 180 
            : degrees >= 266 && degrees <= 269 || degrees >= 271 && degrees <= 274 ? 270 : degrees

    // Setting the matrix to enable rotation around the center of the O and also fixed at 90 degrees
    let OSpin = new Snap.Matrix(), O90 = new Snap.Matrix(); 
    OSpin.rotate(degrees, OBox.cx, OBox.cy), O90.rotate(90, OBox.cx, OBox.cy);

    // Fetching the O in the lowermost layer to rotate it in the background with the OSpin matrix
    Snap('#glyph').transform(OSpin).attr({'stroke':ether, 'stroke-width':.14, 'stroke-opacity':.4, 'fill-opacity':0});

    // Getting points after transformation to draw the rotated height line with render capabilities
    const Mx = OSpin.x(OBox.cx, OBox.y2), My = OSpin.y(OBox.cx, OBox.y2),
          Lx = OSpin.x(OBox.cx, OBox.y),  Ly = OSpin.y(OBox.cx, OBox.y);

    const M90x = O90.x(OBox.cx, OBox.y2), M90y = O90.y(OBox.cx, OBox.y2),
          L90x = O90.x(OBox.cx, OBox.y),  L90y = O90.y(OBox.cx, OBox.y);      

    // Drawing the height line within the rotated O 
    const lineStyle = {'stroke': ether, 'stroke-width':.1, 'stroke-opacity':.3};
    paper.path(`M ${Mx}, ${My} L ${Lx}, ${Ly}`).attr(lineStyle).addClass('userCreated');

    // Drawing the height pointers
    pointer(Mx, My, .5, grape, .9).addClass('userCreated');
    pointer(Mx, My, 1.8, ether, .07, ether, .07).addClass('userCreated');
    pointer(Lx, Ly, .5, grape, .9).addClass('userCreated');  
    pointer(Lx, Ly, 1.8, ether, .07, ether, .07).addClass('userCreated');  
  
    // Drawing the intesection points between the O and the rotating height line
    intersect(shape("line", {x1:Mx ,y1:My, x2:Lx ,y2:Ly}), shape("path", {d: outerDef})).points
      .map(v => {
        pointer(v.x, v.y, .5, grape, .9).addClass('userCreated');
        pointer(v.x, v.y, 1.8, ether, .07, ether, .07).addClass('userCreated'); 
        paper.path(`M ${v.x}, ${v.y} L ${Snap.len(v.x, v.y, Mx, My) > Snap.len(v.x, v.y, Lx, Ly) 
          ? `${Lx}, ${Ly}` 
          : `${Mx}, ${My}`}`)
        .attr({'stroke': seafoam, 'stroke-width':.34, 'stroke-opacity':1}).addClass('userCreated');
    });

    intersect(shape("line", {x1:M90x ,y1:M90y, x2:L90x ,y2:L90y}), shape("path", {d: outerDef})).points
      .map(v => pointer(v.x, v.y, 1.1, 'none', '', ether).addClass('userCreated'));

    // Printing the degress to the UI
    id('lengthOutput').value = degrees;
    
    // Drawing the Width Line of the O 
    const width = paper.path(`M ${OBox.x}, ${OBox.cy} L ${OBox.x2}, ${OBox.cy}`).attr(lineStyle).addClass('userCreated');
    
    // Drawing the Width Targets of the O 
    pointer(M90x, M90y, 1.1, 'none', '', ether).addClass('userCreated'); 
    pointer(L90x, L90y, 1.1, 'none', '', ether).addClass('userCreated'); 

    // Drawing the Center of the O 
    pointer(OBox.cx, OBox.cy, 2, '#FCFCFC', 1, ether, .13).addClass('userCreated');
    pointer(OBox.cx, OBox.cy, .6, ether, .5).addClass('userCreated');
  }

  // Drawing the Tall Targets of the O
  pointer(OBox.cx, OBox.y, 1.1, 'none', '', ether); 
  pointer(OBox.cx, OBox.y2, 1.1, 'none', '', ether);   // r1.4

  // Setting defaults for the Proportion Diagram
  id('measurement').innerText = 'Degrees';
  id('lengthInput').setAttribute('value', 90);
  id('lengthInput').setAttribute('step', 1);
  id('lengthInput').setAttribute('max', 360);
  rotatePath(id('lengthInput').getAttribute('value'));

  // Fetching Values
  id('lengthInput').oninput = e => rotatePath(e.target.value);

  // Drawing the Tall with the corresponding intersection points 
  //const OTall = intersectionPoints(d, line2Intersect);
  //paper.line(xTallRoof[0], xBox.y, xTallRoof[xTallRoof.length - 1] , xBox.y).attr({'stroke':seafoam, 'stroke-width':.32, 'stroke-opacity':.55});
 }

  /************************
    Weight Measurements
  *************************/
  if (panoseType == 'Weight') { 
    Snap.path.toAbsolute(d).filter(v => /[ML]/.test(v)).map(v => pointer(v[1], v[2], .3, ether, .5));
    Snap.path.toAbsolute(d).filter(v => /[C]/.test(v)).map(v => pointer(v[5], v[6], .2, ether, .4));

    // Fetching EBox for calculations
    const EBox = Snap.path.getBBox(d);

    // Intersecting midlines with E to find stem edge points
    const stemEdgeW = intersect(shape("line", {x1:EBox.x ,y1:EBox.cy, x2:EBox.x2 ,y2:EBox.cy}), 
                                shape("path", {d: d})).points.sort((a, b) => a.x - b.x)[0];
          
    const stemEdgeNE = intersect(shape("line", {x1:EBox.x ,y1:EBox.cy, x2:EBox.x2 ,y2:EBox.y}),
                                 shape("path", {d: d})).points.sort((a, b) => a.x - b.x)[1];

    const stemEdgeSE = intersect(shape("line", {x1:EBox.x ,y1:EBox.cy, x2:EBox.x2 ,y2:EBox.y2}), 
                                 shape("path", {d: d})).points.sort((a, b) => a.x - b.x)[1];
                              
    const stemEdgeE = intersect(shape("line", {x1:EBox.x ,y1:EBox.cy, x2:EBox.x2 ,y2:EBox.cy}), 
                                shape("line", {x1:stemEdgeNE.x ,y1:stemEdgeNE.y, x2:stemEdgeSE.x ,y2:stemEdgeSE.y})).points[0];

    // Calculating the stem-Width and weight (EBox-Height / stem-Width) 
    const stemWidth = stemEdgeE.x - stemEdgeW.x, w = EBox.h / stemWidth;
        
    // Calculating and printing height, width and weight
    id('panoseSubstitution').innerHTML = `${EBox.h.toFixed(1)} / ${stemWidth.toFixed(1)} = ${w.toFixed(2)} ≙`;
    
    // Classifying the Panose weight numbers
    panoseNumber = w>=35 ? 2 : w<35 && w>=18 ? 3 : w<18 && w>=10 ? 4 : w<10 && w>=7.5 ? 5 : w<7.5 && w>=5.5 ? 6 
                 : w<5.5 && w>=4.5 ? 7 : w<4.5 && w>=3.5 ? 8 : w<3.5 && w>=2.5 ? 9 : w<2.5 && w>=2 ? 10 : w<2 ? 11 : '';

    // Labels for Weight Meaning
    const weightArray = ['Very Light', 'Light', 'Thin', 'Book', 'Medium', 'Demi', 'Bold', 'Heavy', 'Black', 'Extra Black'];
    panoseMeaning = weightArray[panoseNumber - 2];

    // Printing panoseMeaning and panoseNumber
    id('panoseMeaning').innerHTML = panoseMeaning;  
    id('panoseNumber').value = panoseNumber;
    
    // Aux constants for drawing
    const stem_cx = stemWidth/2 + stemEdgeW.x;

    // Drawing west edge center of the EBox
    pointer(EBox.x, EBox.cy, .9, 'none', '', ether, .1, .7);

    // Drawing angled auxlines
    paper.path(`M ${EBox.x}, ${EBox.cy} L ${EBox.x2}, ${EBox.y}`).attr(aux);
    paper.path(`M ${EBox.x}, ${EBox.cy} L ${EBox.x2}, ${EBox.y2}`).attr(aux);
    paper.path(`M ${EBox.x}, ${EBox.cy} L ${stem_cx}, ${EBox.y}`).attr(aux);
    paper.path(`M ${EBox.x}, ${EBox.cy} L ${stem_cx}, ${EBox.y2}`).attr(aux);

    // Drawing top and bottom connecting lines to represent EBox height
    paper.path(`M ${stem_cx}, ${EBox.y} L ${EBox.x2}, ${EBox.y}`).attr(aux);
    paper.path(`M ${stem_cx}, ${EBox.y2} L ${EBox.x2}, ${EBox.y2}`).attr(aux);

    // Drawing aux intersection circles to find the east stem edge
    pointer(stemEdgeNE.x, stemEdgeNE.y, .8, 'none', '', ether, .1, .7);
    pointer(stemEdgeSE.x, stemEdgeSE.y, .8, 'none', '', ether, .1, .7);

    // Drawing west and east stem edge points
    pointer(stemEdgeW.x, stemEdgeW.y, .5, seafoam, 1);                              
    pointer(stemEdgeE.x, stemEdgeE.y, .5, seafoam, 1);

    // Drawing north and south EBox height points
    pointer(stem_cx, EBox.y, .5, seafoam, 1);                              
    pointer(stem_cx, EBox.y2, .5, seafoam, 1);

    // Drawing the stem closing line and perpendicular line to the west center of the EBox
    paper.path(`M ${stemEdgeNE.x}, ${stemEdgeNE.y} L ${stemEdgeSE.x}, ${stemEdgeSE.y}`).attr(aux);                                                    
    paper.path(`M ${EBox.x}, ${EBox.cy} L ${stemEdgeW.x}, ${stemEdgeW.y}`).attr(aux);

    // Drawing midline stem lines
    paper.path(`M ${stem_cx}, ${EBox.y} L ${stem_cx}, ${EBox.y2}`).attr(aux);
    paper.path(`M ${stemEdgeW.x}, ${stemEdgeW.y}L ${stemEdgeE.x}, ${stemEdgeE.y}`).attr(aux);

    // Setting the sharedLength and measureStyle for the drawDistance function
    const sharedLength = EBox.h + stemWidth, 
          measureStyle = {'stroke': seafoam, 'stroke-width':.2, 'stroke-opacity':1};

    // Drawing the distance with the current shared lenght of width and height     
    const drawDistance = sharedLength => {
      remove(document.querySelectorAll(".userCreated"));

      // The width and height are divided in positive and negative along the shared length
      const polarizedLength = sharedLength - EBox.h, displayedLength = Math.abs(polarizedLength),
            x_Slider = polarizedLength >= 0 ? displayedLength / 2 : 0, y_Slider = x_Slider ? 0 : displayedLength / 2;

      // The corresponding values are displayed
      id('lengthOutput').value = displayedLength.toFixed(1);
      id('measurement').innerText = x_Slider ? 'Width' : 'Height'; 

      // The live measurements are rendered with the current x and y slider values
      const p1 = pointer(stem_cx + x_Slider, EBox.cy + y_Slider, .5, grape, .9).addClass('userCreated');
      pointer(stem_cx + x_Slider, EBox.cy + y_Slider, 1.8, ether, .07, ether, .07).addClass('userCreated');
      const p2 = pointer(stem_cx - x_Slider, EBox.cy - y_Slider, .5, grape, .9).addClass('userCreated');
      pointer(stem_cx - x_Slider, EBox.cy - y_Slider, 1.8, ether, .07, ether, .07).addClass('userCreated');
      
      // Draw the line between the live pointers
      const px = p => p.node.cx.baseVal.value, py = p => p.node.cy.baseVal.value;
      paper.path(`M ${px(p1)}, ${py(p1)} L ${px(p2)}, ${py(p2)}`).attr(measureStyle).addClass('userCreated');
    }

    // Drawing stem width and set slider attributes accordingly
    id('measurement').innerText = 'Width';
    id('lengthInput').setAttribute('step', 'any');
    id('lengthInput').setAttribute('value', sharedLength);
    id('lengthInput').setAttribute('max', sharedLength);   
    drawDistance(id('lengthInput').getAttribute('value'));

    // Fetching Values
    id('lengthInput').oninput = e => drawDistance(e.target.value);
  }

  /***************************
    Serif Style Measurements
  ***************************/
  if (panoseType == 'Serif Style') {
    // Intersecting I midline to find the stem edge points
    const stemEdges = intersect(shape("line", {x1:BBox.x, y1:BBox.cy, x2:BBox.x2, y2:BBox.cy}), 
                                shape("path", {d: d})).points.sort((a, b) => a.x - b.x).slice(0, 2); 

    // Fetching the tips coordinates based on the low anchors and their min and max x coordinates
    const lowAnchors = anchors.filter(v => v.y > BBox.cy * 1.2), xs = lowAnchors.map(v => v.x), 
          xFootMax = Math.max(...xs), xFootMin = Math.min(...xs), 
          tips = lowAnchors.filter(v => v.x == xFootMax || v.x == xFootMin).sort((a, b) => a.y - b.y);
    
    // Retrieving the serif departure anchors by targeting the anchor closest to the stem edges
    const serifDepartures = flatten(stemEdges.map(s => lowAnchors.filter(l => l.x == closestToIn(s.x, xs))));  
    
    // Calculating the footRat with the foot and stem width to identify if the glyph has serif
    const footWidth = xFootMax - xFootMin, stemWidth = stemEdges[1].x - stemEdges[0].x, 
          footRat = footWidth / stemWidth, hasSerif = footRat > 1.5;
    
    // Identifying the geometry of the serif with the tip anchor and the adjacent anchors
    if (hasSerif) {
      let serifTip = {h: tips[tips.length - 1].y - tips[0].y};
      const hasCurvedJoint = serifDepartures.filter(s => s.type == 'curve').length > 0,
            hasConstantHeight = serifDepartures[0].y / tips[0].y == 1,
            serifWidth = (footWidth - stemWidth) / 2,
            tipIndex = anchors.findIndex(l => l == tips[0]),
            tipPattern = [tipIndex == 0 ? anchors.length - 1 : tipIndex - 1,
                          tipIndex, 
                          tipIndex + 1 == anchors.length ? 0 : tipIndex + 1].map(v => anchors[v]), 
            hasCurvedTips = tipPattern.filter((v, i, a) => a[i + 1] 
                                                        && a[i + 1].type == v.type && v.type == 'curve').length > 0 
                                                        && tips.length < 4 && tips[0].y / BBox.y2 < 1;
                                                        
      if (hasCurvedTips) {
        serifTip = [BBox.x + serifWidth/3, BBox.x2 - serifWidth/3]
          .map(v => v = intersect(shape("line", {x1:v, y1:BBox.cy, x2:v, y2:BBox.y2}), shape("path", {d: d}))
          .points.sort((a, b) => a.y - b.y)).map(v => {
            let h = v.length ? v.reduce((first, last) => last.y - first.y) : 0;
            v.map((v,i) => {
              i == 0 && h ? paper.path(`M ${v.x}, ${v.y + .45} L ${v.x}, ${v.y + h - .45}`).attr(aux) : '';
              pointer(v.x, v.y, .45, 'none', '', ether, .1, .8);
            });
            return {h: h, hasRectJoint: ((serifDepartures[0].y + h) / BBox.y2) > .98};
          }).sort((a, b) => a.h - b.h)[0];  
      }
                                      
      const hasAsymmetrical = serifTip.h == 0 && tips.length == 2 && (tips[1].y - tips[0].y) / stemWidth > .7,
            hasThin = !hasAsymmetrical && (hasCurvedTips || hasConstantHeight) && serifTip.h / stemWidth < .3, 
            hasOval = hasCurvedTips && (serifTip.h / serifWidth >= .5 || serifTip.hasRectJoint),
            hasTriangle = !hasCurvedJoint && !hasConstantHeight && !hasCurvedTips,
            hasSquareCove = tips.length >=4 && hasCurvedJoint && serifTip.h / stemWidth > .25,
            hasSquare = hasConstantHeight && !hasThin; console.log(tips, stemWidth);
            
      // Classifying the Panose proportion numbers
      panoseNumber = hasTriangle ? 10 : hasAsymmetrical ? 9 : hasOval ? 8 : hasThin ? 7 : hasSquare ? 6 : hasSquareCove ? 4 : hasCurvedJoint ? 2 : 1;     
    }

    if (!hasSerif) {
      // Retrieving the serif bottom which is the anchor closest to the baseline
      const ys = lowAnchors.map(v => v.y),
            serifBottom = lowAnchors.filter(a => a.y == Math.max(...ys)),
            ronRat = Snap.len(serifBottom[0].x, serifBottom[0].y, tips[0].x, tips[0].y) / stemWidth;
            
      const hasRounded = serifBottom.filter(v => v.type == 'curve').length > 0 && ronRat >= .2, 
            hasFlared = footRat > 1.05 && !hasRounded;
    
      panoseNumber = hasRounded ? 15 : hasFlared ? 14 : 11;
      serifBottom.map(v => pointer(v.x, v.y, .45, ether, .54)); 
    }
  
    // Labels for Serif Style Meaning
    const serifStyleArray = ['No Fit', 'Cove Serif', '', 'Square Cove Serif', '', 'Square Serif', 'Thin Serif', 'Oval Serif', 'Exaggerated', 'Triangle Serif',
                             'Normal Sans', '', '', 'Flared Sans', 'Rounded Sans'];

    panoseMeaning = serifStyleArray[panoseNumber - 1];

    // Increasing padding to show measurements and printing the footRat calculation
    id('SVG').style.padding = '.9em 1.5em 3.7em';
    id('panoseSubstitution').innerHTML = `${footWidth.toFixed(1)} / ${stemWidth.toFixed(1)} = ${footRat.toFixed(2)} ≙`;

    // Printing panoseMeaning and panoseNumber
    id('panoseMeaning').innerHTML = panoseMeaning;  
    id('panoseNumber').value = panoseNumber;

    // Setting line styles
    const dimensionLineStyle = {'stroke': ether, 'stroke-width':.12, 'stroke-opacity':.7},
          measuringLineStyle =  {'stroke': seafoam, 'stroke-width':.18, 'stroke-opacity':1}; 

    // Drawing Mid-horizontal line and Angled auxlines Crossing the Stem
    paper.path(`M ${BBox.x}, ${BBox.cy} L ${stemEdges[1].x}, ${stemEdges[1].y}`).attr(aux);      
    paper.path(`M ${BBox.x}, ${BBox.cy} L ${BBox.x2}, ${BBox.y}`).attr(aux);
    paper.path(`M ${BBox.x}, ${BBox.cy} L ${BBox.x2}, ${BBox.y2}`).attr(aux);

    // Drawing serif departure anchors
    serifDepartures.map(v => pointer(v.x, v.y, .45, ether, .54));

    // Drawing Foot Edge Measuring Lines and Pointers
    tips.map(v => {
      paper.path(`M ${v.x}, ${v.y} L ${v.x}, ${BBox.y2 + 5.5}`).attr(dimensionLineStyle);
      pointer(v.x, v.y, .4, grape, 1);
      pointer(v.x, BBox.y2 + 5.5, .4, grape, 1);
    });

    // Setting the range for drawing the distance from the center
    const offsetX = footWidth / 2, midFootX = xFootMin + footWidth / 2;

    // Drawing the distance with the min and Max Tips    
    const drawDistance = offsetX => {
      // Parsing to avoid concatenation and removing previous pointers
      x = parseFloat(offsetX);
      remove(document.querySelectorAll(".userCreated"));
      
      // Printing Width
      const width = 2 * x;
      id('lengthOutput').value = width.toFixed(1);

      // The live measurements are rendered with the current x and y slider values
        const px1 = midFootX + x , px2 = midFootX - x, py = BBox.y2 + 5.5;

      // Draw the line between the live pointers
      paper.path(`M ${px1}, ${py} L ${px2}, ${py}`).attr(measuringLineStyle).addClass('userCreated');


      // Drawing Stem Width Measuring Lines and Pointers
      stemEdges.map(v => {
        paper.path(`M ${v.x}, ${BBox.cy} L ${v.x}, ${py}`).attr(dimensionLineStyle).addClass('userCreated');
        pointer(v.x, v.y, .4, seafoam, 1).addClass('userCreated');
        pointer(v.x, v.y, 1, 'none', '', ether, .1, .8).addClass('userCreated'); 
        pointer(v.x, py, 1, 'white', 1, ether, .1, .8).addClass('userCreated');
        pointer(v.x, py, .4, seafoam, 1).addClass('userCreated');  
      });

      if (x > 0) {
        pointer(px1, py, .4, grape, 1).addClass('userCreated');
        pointer(px2, py, .4, grape, 1).addClass('userCreated');
      }
    }

    // Drawing stem width and set slider attributes accordingly
    id('measurement').innerText = 'Width';
    id('lengthInput').setAttribute('step', 'any');
    id('lengthInput').setAttribute('value', 0);
    id('lengthInput').setAttribute('max', offsetX);   
    drawDistance(id('lengthInput').getAttribute('value'));

    // Fetching Values
    id('lengthInput').oninput = e => drawDistance(e.target.value);
  }

  /***************************
    Use and Render Functions 
  ****************************/
  id('use').onclick = e => {
    pluginCall('use', [ id("fontDropdown").selectedIndex - 1, panoseNumber, panoseMeaning ]);
    e.target.blur();
  }    

  id('render').onclick = e => {
    pluginCall('render', id("viewer").innerHTML);
    e.target.blur();
  }
}

//id('use').innerText = fontIndex; //Print decimal values and contrast!!!!   Write Max min seafoam legends
// Drawing the center of the letter pointer(outerBox.cx, outerBox.cy, .7, seafoam, .9) pointer(outerBox.cx, outerBox.cy, 2, 'none', '', seafoam);      
// Fetching Aux Bounding Boxes const HBoxPath = auxPath(HBox.path, seafoam), xBoxPath = auxPath(xBox.path, seafoam);

// Disable the context menu to have a more native feel. Disable to inspect the webview!!!
//document.addEventListener("contextmenu", function(e) {
//  e.preventDefault();
//});