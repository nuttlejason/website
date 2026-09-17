'use strict';
(() => {
// Seven rigid tangram pieces: two large triangles, one medium triangle,
// two small triangles, one square and one parallelogram. Areas: 4,4,2,1,2,1,2.
const square=[[[0,0],[4,0],[2,2]],[[0,0],[2,2],[0,4]],[[4,2],[4,4],[2,4]],[[4,0],[4,2],[3,1]],[[2,2],[3,1],[4,2],[3,3]],[[2,2],[3,3],[1,3]],[[0,4],[1,3],[3,3],[2,4]]];
const r=Math.SQRT2,h=r/2,t=r-1;
// Reconstructed from the supplied book references, using exact tangram lengths.
// Reference coordinates use a unit square; scale once to the existing piece set.
const referenceShapes=[
  {name:'BIRD',reference:51,pieces:[
    [[0,0],[2,0],[2,2]],[[2,0],[4,0],[2,2]],
    [[4,0],[4,-r],[4-r,0]],
    [[1,-1],[1-r,-1],[1-h,-1-h]],
    [[0,0],[1,0],[1,-1],[0,-1]],
    [[2,2],[2-r,2],[2-h,2-h]],
    [[2,2],[3,1],[3,2],[2,3]]
  ]},
  {name:'CAT',reference:43,pieces:[
    [[0,-2],[r,-2-r],[r,-2+r]],[[0,0],[2,0],[0,-2]],
    [[r,-2-r],[r+1,-1-r],[r,-r]],
    [[r,-3-r],[r,-3-2*r],[r+h,-3-r-h]],
    [[r,-3-r],[r+h,-3-r-h],[2*r,-3-r],[r+h,-3-r+h]],
    [[r+h,-3-r-h],[2*r,-3-2*r],[2*r,-3-r]],
    [[r,-2-r],[r,-3-r],[r+1,-2-r],[r+1,-1-r]]
  ]},
  {name:'DOLPHIN',reference:84,pieces:[
    [[0,0],[2,0],[0,2]],[[2,0],[2+r,r],[2-r,r]],
    [[-2,-.25],[-2-r,-.25],[-2,-.25-r]],
    [[-.5,0],[.5,0],[-.5,-1]],
    [[0,0],[0,1],[-1,1],[-1,0]],
    [[2-r,r],[2,r],[2-h,r+h]],
    [[-1,0],[-2,-1],[-2,0],[-1,1]]
  ]},
  {name:'J',reference:10,pieces:[
    [[0,0],[2,0],[2,2]],[[2,4],[2-2*r,4],[2-r,4+r]],
    [[1,2],[2,3],[1,4]],
    [[0,0],[0,1],[1,1]],
    [[2,0],[3,0],[3,1],[2,1]],
    [[1,4],[2,3],[2,4]],
    [[1,1],[2,2],[2,3],[1,2]]
  ]},
  {name:'DOG',reference:42,pieces:[
    [[0,0],[-r,r],[r,r]],[[1,1],[1+r,1-r],[1+2*r,1]],
    [[0,0],[2,0],[1,1]],
    [[1+r,1-r],[1+h,1-r-h],[1+r+h,1-r-h]],
    [[1+r,1-r],[1+r+h,1-r-h],[1+2*r,1-r],[1+r+h,1-r+h]],
    [[1+r+h,1-r-h],[1+2*r,1-2*r],[1+2*r,1-r]],
    [[-r,r],[-r-1,r],[-r,r-1],[-r+1,r-1]]
  ]},
  {name:'HORSE',reference:74,pieces:[
    [[0,0],[-r,r],[r,r]],[[t,t],[t+2,t],[t+2,t+2]],
    [[-h,-h],[-h-r,-h],[-h-r,h]],
    [[r-2,r],[r-2,r+1],[r-1,r]],
    [[-h,-h],[0,0],[-h,h],[-r,0]],
    [[r-1,r],[r-1,r+1],[r,r]],
    [[t+2,t],[t+3,t],[t+4,t+1],[t+3,t+1]]
  ]}
].map(shape=>({...shape,pieces:shape.pieces.map(p=>p.map(([x,y])=>[x*r,y*r]))}));
const shapes=[{name:'SQUARE',pieces:square},...referenceShapes.slice(0,2),
  {name:'DIAMOND',pieces:square.map(p=>p.map(([x,y])=>[(x-y)/r,(x+y)/r]))},
  ...referenceShapes.slice(2)];
const a=2-r-h,b=2+h,bunnyX=2-r,bunnyY=-2-r;
const turn=(p,degrees,origin)=>{const angle=degrees*Math.PI/180;return p.map(([x,y])=>[origin[0]+x*Math.cos(angle)-y*Math.sin(angle),origin[1]+x*Math.sin(angle)+y*Math.cos(angle)]);};
const additions=[
  {name:'SNAKE',reference:22,pieces:[
    [[0,0],[2,0],[2,2]],[[a,b],[a,b+2],[a+2,b+2]],
    [[0,0],[1,1],[0,2]],
    [[2,2],[2-h,2+h],[2-h,2-h]],
    [[2-r,2],[a,b],[2-r,2+r],[2-h,2+h]],
    [[2-h,2+h],[2-h,2-h],[2-r,2]],
    [[a+1,b+1],[a+2,b+1],[a+3,b+2],[a+2,b+2]]
  ]},
  {name:'SHIP',reference:171,pieces:[
    [[-1,0],[1,0],[1,-2]],[[1,0],[3,0],[3,-2]],
    turn([[0,0],[0,-r],[r,0]],-15,[3.4,0]),
    [[1,0],[2,0],[2,1]],
    [[2,0],[3,0],[3,1],[2,1]],
    [[3,0],[4,0],[3,1]],
    [[0,0],[1,0],[2,1],[1,1]]
  ]},
  {name:'BUNNY',reference:201,pieces:[
    [[0,0],[2,0],[2,-2]],[[2,-2],[2-r,-2-r],[2-r,-2+r]],
    [[bunnyX,bunnyY],[bunnyX,bunnyY-2],[bunnyX+1,bunnyY-1]],
    [[bunnyX,bunnyY+1.5],[bunnyX-1,bunnyY+1.5],[bunnyX,bunnyY+.5]],
    [[bunnyX,bunnyY+.5],[bunnyX-1,bunnyY+.5],[bunnyX-1,bunnyY-.5],[bunnyX,bunnyY-.5]],
    [[bunnyX-1,bunnyY+1.5],[bunnyX-1,bunnyY+2.5],[bunnyX-2,bunnyY+1.5]],
    [[bunnyX-.25,bunnyY-.5],[bunnyX-1.25,bunnyY-1.5],[bunnyX-1.25,bunnyY-2.5],[bunnyX-.25,bunnyY-1.5]]
  ]},
  {name:'FOX',reference:210,pieces:[
    [[0,0],[2,0],[2,2]],[[3,0],[5,0],[5,2]],
    [[5,1],[5,1-r],[5+r,1]],
    [[h,h],[h,h+r],[r,r]],
    [[2,0],[3,0],[3,1],[2,1]],
    [[3,0],[3,1],[4,1]],
    [[.4,0],[-.6,0],[-1.6,-1],[-.6,-1]]
  ]},
  {name:'CANDLE',reference:284,pieces:[
    [[r,0],[r,2*r],[0,r]],[[0,r],[0,3*r],[r,2*r]],
    [[0,3*r],[r,3*r],[r,2*r]],
    [[0,0],[r,0],[h,h]],
    [[(r-1)/2,-1],[(r+1)/2,-1],[(r+1)/2,0],[(r-1)/2,0]],
    [[0,0],[h,h],[0,r]],
    turn([[0,0],[1,0],[2,1],[1,1]],-112.5,[h,-1])
  ]}
].map(shape=>({...shape,pieces:shape.pieces.map(p=>p.map(([x,y])=>[x*r,y*r]))}));
shapes.splice(1,0,additions[0]); // Snake is always design 02.
shapes.push(...additions.slice(1));

// Additional book references. Unit-square coordinates preserve the same
// seven rigid pieces; all edges use horizontal, vertical, or 45° directions.
const bookAdditions=[
  {name:'GOAT',reference:36,pieces:[
    [[0,0],[-r,r],[r,r]],
    [[t,t],[t+2,t],[t+2,t+2]],
    [[-h,-h],[-h-r,-h],[-h-r,h]],
    [[-.5,r],[.5,r],[-.5,r+1]],
    [[-h,-h],[0,0],[-h,h],[-r,0]],
    [[t+2,t+.4],[t+2,t+.4-r],[t+2+h,t+.4-h]],
    [[-h-r,-h],[-h-r+1,-h],[-h-r+2,-h-1],[-h-r+1,-h-1]]
  ]},
  {name:'SHRIMP',reference:83,pieces:[
    [[-2*r,0],[0,0],[-r,r]],
    [[0,0],[0,2],[-2,2]],
    [[1,.5],[2,1.5],[1,2.5]],
    [[0,3.5],[1,2.5],[1,3.5]],
    [[0,.5],[1,.5],[1,1.5],[0,1.5]],
    [[0,3.5],[-h,3.5-h],[h,3.5-h]],
    [[1,2.5],[2,1.5],[2,2.5],[1,3.5]]
  ]},
  {name:'TEAPOT',reference:261,pieces:[
    [[0,0],[2,0],[2,2]],
    [[0,0],[2,2],[0,2]],
    [[0,0],[2,0],[1,-1]],
    [[-1,0],[-2,0],[-1,1]],
    [[3,1.5],[3+h,1.5-h],[3,1.5-r],[3-h,1.5-h]],
    [[2,.5],[2,1.5],[3,1.5]],
    [[-1,0],[0,1],[0,2],[-1,1]]
  ]},
  {name:'POLAR BEAR',reference:37,pieces:[
    [[1,0],[3,0],[3,2]],
    [[3,0],[3+r,r],[3,2*r]],
    [[1,0],[1,r],[1+r,r]],
    [[-1,1],[0,0],[0,1]],
    [[0,0],[1,0],[1,1],[0,1]],
    [[3+h,2*r-h],[3+h,2*r-h+1],[2+h,2*r-h+1]],
    [[1,r],[2,r],[1,r+1],[0,r+1]]
  ]},
  {name:'GIRAFFE',reference:38,pieces:[
    [[0,0],[0,2*r],[r,r]],
    [[r,0],[r,2*r],[2*r,r]],
    [[0,-2*r-.5],[0,-r-.5],[-r,-r-.5]],
    [[0,-r],[h,-r-h],[0,-2*r]],
    [[0,0],[h,-h],[r,0],[h,h]],
    [[h,h],[r,0],[r,r]],
    [[0,0],[0,-r],[h,-r-h],[h,-h]]
  ]}
];
shapes.push(...bookAdditions.map(shape=>({...shape,pieces:shape.pieces.map(p=>p.map(([x,y])=>[x*r,y*r]))})));

window.TangramShapes=shapes;
})();
