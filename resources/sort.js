let svgIntersections = require('svg-intersections'), intersect = svgIntersections.intersect, shape = svgIntersections.shape;
import Snap from 'imports-loader?this=>window,fix=>module.exports=0!snapsvg/dist/snap.svg.js';
import pluginCall from 'sketch-module-web-view/client';

// Paper, colors, and aux functions 
const paper = Snap("svg"), ether='#9EB6B8', id = id => document.getElementById(id), remove = elms => [...elms].map(el => el.remove()), 
      flatten = a => Array.prototype.concat(...a), classDropdown = id('classDropdown'), panoseDropdown = id('panoseDropdown'),
      getAnchors = d => Snap.path.toAbsolute(d).filter(v => /[MLC]/.test(v))
        .map(v => v = v.length == 3 ? {x:v[1], y:v[2], type:'rect'} : {x:v[5], y:v[6], type:'curve'}); 
      
let panoseNumber, panoseMeaning, fontIndex, font, fontsL, viewBox, selectedClass;

// Function to render the glyph cell with the font name and corresponding panose measurement and anchor points
const render = (v, d, viewBox, font, panoseMeaning) => {
  id('thread-anchor').innerText += `.`;
  const glyphCell = document.createElement('div'); glyphCell.className = 'glyphCell'; 
  const glyphView = document.createElementNS (xmlns, 'svg');  glyphView.classList.add('glyphView'); glyphView.setAttribute('viewBox', viewBox);
  const glyphPath = document.createElementNS (xmlns, 'path'); glyphPath.classList.add('glyphPath'); glyphPath.setAttribute('d', d); 
  const glyphFace = document.createElement('div'); glyphFace.className = 'glyphFace'; glyphFace.innerText = font;
  const glyphClass = document.createElement('div'); glyphClass.className = 'glyphClass'; 
  
  glyphClass.innerHTML = `${v} <span class="arrow">→</span> ${panoseMeaning}`;
  glyphPath.setAttribute('data-i', fontIndex); glyphPath.setAttribute('data-m', panoseMeaning); 

  glyphCell.appendChild(glyphView); glyphView.appendChild(glyphPath);
  glyphCell.appendChild(glyphFace); glyphFace.appendChild(glyphClass); id('viewer').appendChild(glyphCell);

  getAnchors(d).map(v => Snap(glyphView).circle(v.x,v.y, .8).attr({'fill':ether,'fill-opacity':.7}));    
}

const classes = {
  contrast : ['No Fit', 'No Contrast', 'Very Low', 'Low', 'Medium Low', 'Medium', 'Medium High', 'High', 'Very High'],
  xHeight : ['No Fit', 'Small', 'Standard', 'High'],
  proportion : ['No Fit', 'Even Width', 'Extended', 'Condensed', 'Very Extended', 'Very Condensed'],
  weight : ['No Fit', 'Very Light', 'Light', 'Thin', 'Book', 'Medium', 'Demi', 'Bold', 'Heavy', 'Black', 'Extra Black'],
  serif : ['No Fit', 'Cove Serif', 'Square Cove', 'Square Serif', 'Thin Serif', 'Oval Serif', 'Exaggerated', 'Triangle Serif',
           'Normal Sans', 'Flared Sans', 'Rounded Sans']
} 
      
class PanoseLog { constructor(d, viewBox, index, font, type, value, number, meaning) {
  this.d = d;
  this.viewBox = viewBox;
  this.index = index;
  this.font = font;
  this.type = type;
  this.value = value;
  this.number = number;
  this.meaning = meaning;
}}         
window.panoseDataBase = {
  serif : { attempts:0, values:[] },
  weight : { attempts:0, values:[] },
  proportion : { attempts:0, values:[] },
  contrast : { attempts:0, values:[] },
  xHeight : { attempts:0, values:[] },
}

let panoseType = 'contrast';    
   
panoseDropdown.addEventListener('change', e => {
  remove(document.querySelectorAll('.glyphCell')); 
  panoseType = e.target.value;

  classDropdown.options.length = 2;
  classes[panoseType].map((v, i) => classDropdown[i + 2] = new Option(v));
  classDropdown[1].selected = true;
  
  panoseDataBase[panoseType].attempts < fontsL ? pluginCall('initFontQuery') : 
  panoseDataBase[panoseType].values.map(v => setTimeout(() => render(v.value, v.d, v.viewBox, v.font, v.meaning)));
});

classDropdown.addEventListener('change', e => {
  remove(document.querySelectorAll('.glyphCell'));
  panoseType = panoseDropdown[panoseDropdown.selectedIndex].value;
  selectedClass = e.target.value;

  panoseDataBase[panoseType].attempts < fontsL ? pluginCall('initFontQuery') : 
  panoseDataBase[panoseType].values.map(v => v.meaning == selectedClass || selectedClass == 'No Filter' ? 
    setTimeout(() => render(v.value, v.d, v.viewBox, v.font, v.meaning)) : '');
});

window.sortGlyphs = v => {
  for (let i = 0 ; i < v; i++) {
    setTimeout(() => pluginCall('getBezier', [i, panoseType]));
  }
  fontsL = v; 
};  

window.setFont = indexNFont => {
  let bit = indexNFont.split(', ')
  font = bit[0]
  fontIndex = bit[1]
};

 window.setOViewBox = v => viewBox = v;
  const xmlns = "http://www.w3.org/2000/svg";
/****************************************************
The Received Description Triggers the Font Inspection 
*****************************************************/
window.setODescription = (d) => {
  panoseDataBase[panoseType].attempts = panoseDataBase[panoseType].attempts == fontsL - 2 ? fontsL : fontIndex;
  anchors = getAnchors(d); let pd = d;

  const BBox = Snap.path.getBBox(d);
  // Fetching Outer and Inner Path Descriptions OR First and Second Letter. Pending to change it for 4 letters if needed
  let outerDef = d.replace(/Z.*/, 'Z'),   //erases the last path with the Z of the previous path, so that Z is restored
      innerDef = d.replace(/.*Z M/, 'M'); //erases the first path with the M of the following path, so that M is restored
  
  /************************
    Contrast Measurements 
  *************************/
  if (panoseType == 'contrast') {
    // Calculating maxDistance, minDistance and Contrast with the Inner Distance between anchors
    const d = Snap.path.toAbsolute(outerDef).filter(v => /C/.test(v)).map(v => v = Snap.closestPoint(paper.path(innerDef), v[5], v[6]).distance),
          v = (Math.min(...d.map(v => v)) / Math.max(...d.map(v => v))).toFixed(2);
    
    // Classifying Panose Contrast Numbers 
    panoseNumber = v>.8 ? 2 : v<=.8 && v>.65 ? 3 : v<=.65 && v>.48 ? 4 : v<=.48 && v>.3 ? 5 : v<=.3 
                && v>.2 ? 6 : v<=.2 && v>.15 ? 7 : v<=.15 && v>.08 ? 8 : v<=.08 && v > 0 ? 9 : 1;

    panoseMeaning = classes[panoseType][panoseNumber - 1];

    const selectedClass = classDropdown[classDropdown.selectedIndex].value;
    panoseMeaning == selectedClass || selectedClass == 'No Filter' ? render(v, pd, viewBox, font, panoseMeaning) : '';

    // Push path description, viewbox, index, font, type, value, number and meaning to the Panose Database 
    panoseDataBase.contrast.values.filter(v => v.font == font).length == 0 
      ? panoseDataBase.contrast.values.push(new PanoseLog(pd, viewBox, fontIndex, font, panoseType, v, panoseNumber, panoseMeaning)) : '';
  }

  /************************
    X-Height Measurements 
  *************************/ 
  if (panoseType == 'xHeight') {     
    // Fetching H and x Bounding Boxes to calculate the x-Tall from the H baseline to the upper edge of the x Bounding Box
    const HBox = Snap.path.getBBox(outerDef), xBox = Snap.path.getBBox(innerDef);
    const xTall = Snap.path.getTotalLength(paper.path(`M ${xBox.x}, ${HBox.y2} L ${xBox.x}, ${xBox.y}`)); 
    const HTall = Snap.path.getTotalLength(paper.path(`M ${xBox.x}, ${HBox.y2} L ${xBox.x}, ${HBox.y}`))

    // Calculating the x-Ratio
    const v = (xTall / HTall).toFixed(2);
      
    // Classifying Panose X-Height Numbers
    panoseNumber = v<=.50 ? 2 : v>.50 && v<=.66 ? 3 : v>.66 ? 4 : 1;

    panoseMeaning = classes[panoseType][panoseNumber - 1];

    const selectedClass = classDropdown[classDropdown.selectedIndex].value;
    panoseMeaning == selectedClass || selectedClass == 'No Filter' ? render(v, pd, viewBox, font, panoseMeaning) : '';
    
    // Push path description, viewbox, index, font, type, value, number and meaning to the Panose Database 
    panoseDataBase.xHeight.values.filter(v => v.font == font).length == 0 
      ? panoseDataBase.xHeight.values.push(new PanoseLog(pd, viewBox, fontIndex, font, panoseType, v, panoseNumber, panoseMeaning)) : '';

    // For labeling the Sketch Layers when the Use Function is called
    panoseMeaning = `${panoseMeaning} X-Height`;
  }

  /************************
    Proportion Measurements 
  *************************/
 if (panoseType == 'proportion') {
  // If necessary checks if the outerDef is really the outerDef, otherwise swaps defs to have the right outerDef
  if (Snap.path.getBBox(outerDef).vb != BBox.vb) outerDef = d.replace(/.*Z M/, 'M'); innerDef = d.replace(/Z.*/, 'Z');
    
  // Calculating the proportion (height/width) 
  const v = (BBox.h / BBox.w).toFixed(2);
  
  // Classifying the Panose proportion numbers
  panoseNumber = v>.92 && v <=1.27 ? 4 : v>.9 && v<=.92 ? 5 : v>1.27 && v<=2.1 ? 6 : v<.9 ? 7 : v>=2.1 ? 8 : 3;

  panoseMeaning = classes[panoseType][panoseNumber - 3];

  /Ornaments/.test(font) ? panoseMeaning = 'No Fit' : '';

  const selectedClass = classDropdown[classDropdown.selectedIndex].value;
  panoseMeaning == selectedClass || selectedClass == 'No Filter' ? render(v, pd, viewBox, font, panoseMeaning) : '';

  // Push path description, viewbox, index, font, type, value, number and meaning to the Panose Database 
  panoseDataBase.proportion.values.filter(v => v.font == font).length == 0 
    ? panoseDataBase.proportion.values.push(new PanoseLog(pd, viewBox, fontIndex, font, panoseType, v, panoseNumber, panoseMeaning)) : '';
 }

  /************************
    Weight Measurements
  *************************/
  if (panoseType == 'weight') { 
    // Intersecting midlines with E to find stem edge points
    const stemEdgeW = intersect(shape("line", {x1:BBox.x ,y1:BBox.cy, x2:BBox.x2 ,y2:BBox.cy}), 
                                shape("path", {d: d})).points.sort((a, b) => a.x - b.x)[0];
          
    const stemEdgeNE = intersect(shape("line", {x1:BBox.x ,y1:BBox.cy, x2:BBox.x2 ,y2:BBox.y}),
                                 shape("path", {d: d})).points.sort((a, b) => a.x - b.x)[1];

    const stemEdgeSE = intersect(shape("line", {x1:BBox.x ,y1:BBox.cy, x2:BBox.x2 ,y2:BBox.y2}), 
                                 shape("path", {d: d})).points.sort((a, b) => a.x - b.x)[1];
                              
    const stemEdgeE = intersect(shape("line", {x1:BBox.x ,y1:BBox.cy, x2:BBox.x2 ,y2:BBox.cy}), 
                                shape("line", {x1:stemEdgeNE.x ,y1:stemEdgeNE.y, x2:stemEdgeSE.x ,y2:stemEdgeSE.y})).points[0];

    // Calculating the stem-Width and weight (BBox-Height / stem-Width) 
    const v = (BBox.h / (stemEdgeE.x - stemEdgeW.x)).toFixed(2);
            
    // Classifying the Panose weight numbers
    panoseNumber = v>=35 ? 2 : v<35 && v>=18 ? 3 : v<18 && v>=10 ? 4 : v<10 && v>=7.5 ? 5 : v<7.5 && v>=5.5 ? 6 
                 : v<5.5 && v>=4.5 ? 7 : v<4.5 && v>=3.5 ? 8 : v<3.5 && v>=2.5 ? 9 : v<2.5 && v>=2 ? 10 : v<2 ? 11 : '';

    panoseMeaning = classes[panoseType][panoseNumber - 1];

    const selectedClass = classDropdown[classDropdown.selectedIndex].value;
    panoseMeaning == selectedClass || selectedClass == 'No Filter' ? render(v, pd, viewBox, font, panoseMeaning) : '';
  
    // Push path description, viewbox, index, font, type, value, number and meaning to the Panose Database 
    panoseDataBase.weight.values.filter(v => v.font == font).length == 0 
      ? panoseDataBase.weight.values.push(new PanoseLog(pd, viewBox, fontIndex, font, panoseType, v, panoseNumber, panoseMeaning)) : '';
  }

  /***************************
    Serif Style Measurements
  ***************************/
  if (panoseType == 'serif') {
    pd = pd.replace(/, NaN/g,'');
    // Finds the closest value To the Match In a given Array
    const closestToIn = (match, arr) => arr.reduce((acc, v) => (Math.abs(v - match) <= Math.abs(acc - match) ? v : acc));  
    
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
          v = (footWidth / stemWidth).toFixed(2), hasSerif = v > 1.5;
    
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
            return {h: h, hasRectJoint: ((serifDepartures[0].y + h) / BBox.y2) > .98};
          }).sort((a, b) => a.h - b.h)[0];  
      }
                                      
      const hasAsymmetrical = serifTip.h == 0 && tips.length == 2 && (tips[1].y - tips[0].y) / stemWidth > .7,
            hasThin = !hasAsymmetrical && (hasCurvedTips || hasConstantHeight) && serifTip.h / stemWidth < .3, 
            hasOval = hasCurvedTips && (serifTip.h / serifWidth >= .5 || serifTip.hasRectJoint),
            hasTriangle = !hasCurvedJoint && !hasConstantHeight && !hasCurvedTips,
            hasSquareCove = tips.length >=4 && hasCurvedJoint && serifTip.h / stemWidth > .25,
            hasSquare = hasConstantHeight && !hasThin; 
            
      // Classifying the Panose proportion numbers
      panoseNumber = hasTriangle ? 8 : hasAsymmetrical ? 7 : hasOval ? 6 : hasThin ? 5 : hasSquare ? 4 : hasSquareCove ? 3 : hasCurvedJoint ? 2 : 1;     
    }

    if (!hasSerif) {
      // Retrieving the serif bottom which is the anchor closest to the baseline
      const ys = lowAnchors.map(v => v.y),
            serifBottom = lowAnchors.filter(a => a.y == Math.max(...ys)),
            ronRat = Snap.len(serifBottom[0].x, serifBottom[0].y, tips[0].x, tips[0].y) / stemWidth;
            
      const hasRounded = serifBottom.filter(v => v.type == 'curve').length > 0 && ronRat >= .2, 
            hasFlared = v > 1.05 && !hasRounded;  // v is FootRat 
    
      panoseNumber = hasRounded ? 11 : hasFlared ? 10 : 9;
    }

    panoseMeaning = classes[panoseType][panoseNumber - 1];

    const selectedClass = classDropdown[classDropdown.selectedIndex].value;
    panoseMeaning == selectedClass || selectedClass == 'No Filter' ? render(v, pd, viewBox, font, panoseMeaning) : '';

    // Push path description, viewbox, index, font, type, value, number and meaning to the Panose Database 
    panoseDataBase.serif.values.filter(v => v.font == font).length == 0 
      ? panoseDataBase.serif.values.push(new PanoseLog(pd, viewBox, fontIndex, font, panoseType, v, panoseNumber, panoseMeaning)) : '';
  }
  remove(document.querySelectorAll("#SVG *:not(:first-child)"));
  /***************************
          Use Function
  ****************************/
  let cells = document.getElementsByClassName("glyphCell");
  Array.from(cells).map(v => {
    v.onmousedown = () => id('use').style.backgroundColor = 'lavender';
    
    v.onmouseup = e => {
      id('use').style.backgroundColor = 'transparent';

      const dataI = e.target.getAttribute('data-i'),
            dataM = e.target.getAttribute('data-m');

      pluginCall('use', [ dataI, dataM ]); 
      e.target.blur();     
    }
  }) 
}

pluginCall('initFontQuery'); // Measure in Real Time the First Time!
console.log(panoseDataBase);