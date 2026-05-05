import { useState, useCallback, useRef, useEffect } from "react";

// ══════════════════════════════════════════════════════
//  AUDIO ENGINE
// ══════════════════════════════════════════════════════
function useAudio() {
  const ctxRef = useRef(null);
  const musicRef = useRef(null);
  const musicOnRef = useRef(true);
  const sfxOnRef = useRef(true);
  const unlockedRef = useRef(false);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [audioReady, setAudioReady] = useState(false);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const tone = (freq, type, t0, dur, vol, ctx, dest) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(dest);
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.02);
  };

  const stopMusic=useCallback(()=>{
    if(musicRef.current){
      try { musicRef.current.stop(); } catch {}
      musicRef.current=null;
    }
  },[]);

  const startMusic = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state !== "running") return;
    if (musicRef.current) { try { musicRef.current.stop(); } catch {} }

    const BPM = 118, b = 60 / BPM;
    const mel = [
      [523,1],[659,.5],[784,.5],[880,1],[784,.5],[659,.5],
      [523,1],[392,.5],[440,.5],[523,2],
      [659,1],[784,.5],[880,.5],[1047,1],[880,.5],[784,.5],
      [659,1],[523,.5],[440,.5],[392,2],
      [523,.5],[659,.5],[784,.5],[880,.5],[1047,.5],[880,.5],[784,.5],[659,.5],
      [523,2],[392,1],[523,1],
    ];
    const bass = [130,130,165,165,196,196,175,175,130,130,165,175];
    const loopDur = mel.reduce((sum,[,d])=>sum+d*b,0);

    const schedule = (t0) => {
      const m = ctx.createGain();
      m.gain.setValueAtTime(0.08,t0); // volumen más suave para celular
      m.connect(ctx.destination);
      let t=t0;
      mel.forEach(([f,d])=>{
        [1,2,3].forEach((h,i)=>tone(f*h,"sine",t,d*b*.82,[.38,.09,.025][i],ctx,m));
        t+=d*b;
      });
      bass.forEach((f,i)=>tone(f,"sine",t0+i*b*2,b*1.7,.14,ctx,m));
      for(let i=0;i<10;i++) tone([1568,1760,2093,2349][i%4],"sine",t0+i*b*2.4+b*.6,.18,.035,ctx,m);
    };

    let next=ctx.currentTime+.08, timer=null, stopped=false;
    const loop=()=>{
      if(stopped || !musicOnRef.current || ctx.state !== "running") return;
      schedule(next);
      next+=loopDur;
      timer=setTimeout(loop,Math.max(1000,(loopDur-.4)*1000));
    };
    loop();
    musicRef.current={stop:()=>{stopped=true; if(timer) clearTimeout(timer);}};
  },[]);

  // IMPORTANTE PARA CELULARES:
  // Safari/Chrome móvil bloquean audio hasta que el usuario toca la pantalla.
  // Esta función debe llamarse desde un click/touch real: botón "Comenzar", primer toque, etc.
  const initAudio=useCallback(async()=>{
    const c=getCtx();
    try {
      if(c.state === "suspended") await c.resume();
    } catch {}
    unlockedRef.current = true;
    setAudioReady(c.state === "running");
    if(musicOnRef.current && !musicRef.current && c.state === "running") startMusic();
  },[startMusic]);

  const ensureAudio = useCallback(() => {
    if (!unlockedRef.current || getCtx().state !== "running") initAudio();
  }, [initAudio]);

  const playCorrect=useCallback(()=>{
    if(!sfxOnRef.current)return;
    ensureAudio();
    const ctx=getCtx(); if(ctx.state !== "running") return;
    const g=ctx.createGain(); g.connect(ctx.destination);
    [[523,0],[659,.1],[784,.2],[1047,.32]].forEach(([f,d])=>{ tone(f,"sine",ctx.currentTime+d,.38,.35,ctx,g); tone(f*2,"sine",ctx.currentTime+d,.2,.05,ctx,g); });
    [1568,2093,2637].forEach((f,i)=>tone(f,"sine",ctx.currentTime+.45+i*.07,.15,.07,ctx,g));
  },[ensureAudio]);

  const playWrong=useCallback(()=>{
    if(!sfxOnRef.current)return;
    ensureAudio();
    const ctx=getCtx(); if(ctx.state !== "running") return;
    const g=ctx.createGain(); g.connect(ctx.destination);
    const o=ctx.createOscillator(),gn=ctx.createGain(); o.connect(gn); gn.connect(g);
    o.type="sine"; o.frequency.setValueAtTime(380,ctx.currentTime); o.frequency.exponentialRampToValueAtTime(140,ctx.currentTime+.42);
    gn.gain.setValueAtTime(.22,ctx.currentTime); gn.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.42);
    o.start(ctx.currentTime); o.stop(ctx.currentTime+.45);
  },[ensureAudio]);

  const playClick=useCallback(()=>{
    if(!sfxOnRef.current)return;
    ensureAudio();
    const ctx=getCtx(); if(ctx.state !== "running") return;
    const g=ctx.createGain(); g.connect(ctx.destination); tone(900,"sine",ctx.currentTime,.07,.12,ctx,g);
  },[ensureAudio]);

  const playConnect=useCallback(()=>{
    if(!sfxOnRef.current)return;
    ensureAudio();
    const ctx=getCtx(); if(ctx.state !== "running") return;
    const g=ctx.createGain(); g.connect(ctx.destination); [600,800].forEach((f,i)=>tone(f,"sine",ctx.currentTime+i*.08,.15,.18,ctx,g));
  },[ensureAudio]);

  const playLetter=useCallback(()=>{
    if(!sfxOnRef.current)return;
    ensureAudio();
    const ctx=getCtx(); if(ctx.state !== "running") return;
    const g=ctx.createGain(); g.connect(ctx.destination); [523,659,784].forEach((f,i)=>tone(f,"sine",ctx.currentTime+i*.12,.2,.25,ctx,g));
  },[ensureAudio]);

  const toggleMusic=useCallback(()=>{
    setMusicOn(prev=>{
      const n=!prev;
      musicOnRef.current=n;
      if(n){ initAudio(); setTimeout(()=>startMusic(),80); }
      else stopMusic();
      return n;
    });
  },[initAudio,startMusic,stopMusic]);

  const toggleSfx=useCallback(()=>{
    setSfxOn(prev=>{ const n=!prev; sfxOnRef.current=n; return n; });
  },[]);

  return {playCorrect,playWrong,playClick,playConnect,playLetter,toggleMusic,toggleSfx,musicOn,sfxOn,audioReady,initAudio};
}

// ══════════════════════════════════════════════════════
//  NUMBERBLOCK COMPONENT
// ══════════════════════════════════════════════════════
const COLORS={1:"#FF4136",2:"#FF8C00",3:"#FFD700",4:"#2ECC40",5:"#0074D9",6:"#9B59B6",7:"#FF69B4",8:"#00CED1",9:"#FF6347",10:"#FFD700"};
const gc=n=>COLORS[n]||"#888";

function NumberBlock({value,size=48,animate=false}){
  const color=gc(value),cols=value<=5?1:2,rows=Math.ceil(value/cols);
  return(
    <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",animation:animate?"popIn .4s cubic-bezier(.175,.885,.32,1.275)":"none"}}>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},${size}px)`,gridTemplateRows:`repeat(${rows},${size}px)`,filter:"drop-shadow(3px 4px 0 rgba(0,0,0,.3))"}}>
        {Array.from({length:value}).map((_,i)=>(
          <div key={i} style={{width:size,height:size,background:color,border:"2px solid rgba(0,0,0,.18)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",boxSizing:"border-box"}}>
            {i===0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <div style={{display:"flex",gap:size*.18}}>
                {[0,1].map(e=><div key={e} style={{width:size*.14,height:size*.18,background:"white",borderRadius:"50%",border:"1.5px solid #333",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:size*.07,height:size*.07,background:"#222",borderRadius:"50%"}}/></div>)}
              </div>
              <div style={{width:size*.3,height:size*.12,borderBottom:"2px solid #333",borderRadius:"0 0 30px 30px"}}/>
            </div>}
            <div style={{position:"absolute",top:3,left:3,width:size*.25,height:size*.12,background:"rgba(255,255,255,.38)",borderRadius:3}}/>
          </div>
        ))}
      </div>
      <div style={{marginTop:5,fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:size*.38,color,textShadow:"1px 2px 0 rgba(0,0,0,.15)"}}>{value}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  STAR BURST
// ══════════════════════════════════════════════════════
function StarBurst({show}){
  if(!show)return null;
  return(<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:200}}>
    {["⭐","🌟","✨","💫","⭐","🌟","✨","💥"].map((s,i)=>(
      <div key={i} style={{position:"absolute",fontSize:28+(i%3)*8,animation:`starfly${i%4} .9s ease-out forwards`,animationDelay:`${i*.05}s`,top:`${40+Math.sin(i*.9)*25}%`,left:`${35+Math.cos(i*.9)*30}%`}}>{s}</div>
    ))}
  </div>);
}

// ══════════════════════════════════════════════════════
//  DATA
// ══════════════════════════════════════════════════════
const LETTERS=[
  {letter:"A",word:"Árbol",emoji:"🌳"},{letter:"B",word:"Barco",emoji:"⛵"},{letter:"C",word:"Casa",emoji:"🏠"},
  {letter:"D",word:"Dado",emoji:"🎲"},{letter:"E",word:"Elefante",emoji:"🐘"},{letter:"F",word:"Flor",emoji:"🌸"},
  {letter:"G",word:"Gato",emoji:"🐱"},{letter:"H",word:"Helado",emoji:"🍦"},{letter:"I",word:"Isla",emoji:"🏝️"},
  {letter:"J",word:"Jirafa",emoji:"🦒"},{letter:"K",word:"Kiwi",emoji:"🥝"},{letter:"L",word:"Luna",emoji:"🌙"},
  {letter:"M",word:"Manzana",emoji:"🍎"},{letter:"N",word:"Nube",emoji:"☁️"},{letter:"O",word:"Oso",emoji:"🐻"},
  {letter:"P",word:"Perro",emoji:"🐶"},{letter:"Q",word:"Queso",emoji:"🧀"},{letter:"R",word:"Ratón",emoji:"🐭"},
  {letter:"S",word:"Sol",emoji:"☀️"},{letter:"T",word:"Tigre",emoji:"🐯"},{letter:"U",word:"Uva",emoji:"🍇"},
  {letter:"V",word:"Vaca",emoji:"🐄"},{letter:"W",word:"WiFi",emoji:"📶"},{letter:"X",word:"Xilófono",emoji:"🎵"},
  {letter:"Y",word:"Yate",emoji:"🛥️"},{letter:"Z",word:"Zorro",emoji:"🦊"},
];const WORD_QUIZ=[
  {emoji:"🌳",word:"ÁRBOL",options:["ÁRBOL","CASA","FLOR","NUBE"]},
  {emoji:"⛵",word:"BARCO",options:["AUTO","BARCO","TREN","AVIÓN"]},
  {emoji:"🏠",word:"CASA",options:["CASA","ESCUELA","TIENDA","PARQUE"]},
  {emoji:"🎲",word:"DADO",options:["DADO","CUBO","PELOTA","CAJA"]},
  {emoji:"🐘",word:"ELEFANTE",options:["ELEFANTE","JIRAFA","TIGRE","MONO"]},
  {emoji:"🌸",word:"FLOR",options:["ÁRBOL","HOJA","FLOR","PASTO"]},
  {emoji:"🐱",word:"GATO",options:["PERRO","GATO","RATÓN","PÁJARO"]},
  {emoji:"🍦",word:"HELADO",options:["HELADO","TORTA","PAN","DULCE"]},
  {emoji:"🏝️",word:"ISLA",options:["ISLA","PLAYA","MONTAÑA","RÍO"]},
  {emoji:"🦒",word:"JIRAFA",options:["JIRAFA","CEBRA","LEÓN","OSO"]},
  {emoji:"🥝",word:"KIWI",options:["KIWI","UVA","PERA","MELÓN"]},
  {emoji:"🌙",word:"LUNA",options:["SOL","LUNA","NUBE","ESTRELLA"]},
  {emoji:"🍎",word:"MANZANA",options:["MANZANA","NARANJA","UVA","PERA"]},
  {emoji:"☁️",word:"NUBE",options:["LLUVIA","NUBE","SOL","VIENTO"]},
  {emoji:"🐻",word:"OSO",options:["OSO","LOBO","LEÓN","GATO"]},
  {emoji:"🐶",word:"PERRO",options:["GATO","PERRO","PATO","OSO"]},
  {emoji:"🧀",word:"QUESO",options:["QUESO","PAN","LECHE","HUEVO"]},
  {emoji:"🐭",word:"RATÓN",options:["RATÓN","GATO","CONEJO","PERRO"]},
  {emoji:"☀️",word:"SOL",options:["LUNA","SOL","ESTRELLA","NUBE"]},
  {emoji:"🐯",word:"TIGRE",options:["TIGRE","LEÓN","GATO","OSO"]},
  {emoji:"🍇",word:"UVA",options:["UVA","KIWI","LIMÓN","FRESA"]},
  {emoji:"🐄",word:"VACA",options:["CABALLO","OVEJA","VACA","CABRA"]},
  {emoji:"🎵",word:"XILÓFONO",options:["PIANO","TAMBOR","XILÓFONO","GUITARRA"]},
  {emoji:"🛥️",word:"YATE",options:["YATE","BARCO","AUTO","AVIÓN"]},
  {emoji:"🦊",word:"ZORRO",options:["ZORRO","PERRO","LOBO","GATO"]},
];

// Match sets — each round picks one set
const MATCH_SETS = [
  { title:"Número → Emoji", pairs:[{left:"1",right:"🍎"},{left:"2",right:"🐶"},{left:"3",right:"⭐"},{left:"4",right:"🚗"},{left:"5",right:"🌈"}] },
  { title:"Letra → Palabra", pairs:[{left:"A",right:"ÁRBOL"},{left:"B",right:"BARCO"},{left:"C",right:"CASA"},{left:"D",right:"DADO"},{left:"E",right:"ELEFANTE"}] },
  { title:"Número → Palabra", pairs:[{left:"1",right:"UNO"},{left:"2",right:"DOS"},{left:"3",right:"TRES"},{left:"4",right:"CUATRO"},{left:"5",right:"CINCO"}] },
  { title:"Animal → Emoji", pairs:[{left:"PERRO",right:"🐶"},{left:"GATO",right:"🐱"},{left:"PÁJARO",right:"🐦"},{left:"PEZ",right:"🐠"},{left:"RANA",right:"🐸"}] },
  { title:"Fruta → Emoji", pairs:[{left:"MANZANA",right:"🍎"},{left:"NARANJA",right:"🍊"},{left:"UVA",right:"🍇"},{left:"FRESA",right:"🍓"},{left:"LIMÓN",right:"🍋"}] },
  { title:"Número → Bloques", pairs:[{left:"1",right:"▪️"},{left:"2",right:"▪️▪️"},{left:"3",right:"▪️▪️▪️"},{left:"4",right:"▪️▪️▪️▪️"},{left:"5",right:"▪️▪️▪️▪️▪️"}] },
  { title:"Suma → Resultado", pairs:[{left:"1+1",right:"2"},{left:"2+1",right:"3"},{left:"3+1",right:"4"},{left:"2+2",right:"4"},{left:"3+2",right:"5"}] },
  { title:"Letra → Emoji", pairs:[{left:"F",right:"🌸"},{left:"L",right:"🌙"},{left:"M",right:"🍎"},{left:"S",right:"☀️"},{left:"T",right:"🐯"}] },
];

// ══════════════════════════════════════════════════════
//  SHARED UI
// ══════════════════════════════════════════════════════
const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');
  *{box-sizing:border-box;}
  body{margin:0;background:#1a1a2e;}
  @keyframes popIn{0%{transform:scale(0) rotate(-10deg);opacity:0}80%{transform:scale(1.1) rotate(2deg)}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-8px)}80%{transform:translateX(8px)}}
  @keyframes fadeSlide{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes correctPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.25)}100%{transform:scale(1);opacity:1}}
  @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,.5)}50%{box-shadow:0 0 0 14px rgba(255,215,0,0)}}
  @keyframes starfly0{to{transform:translate(-130px,-110px) scale(0);opacity:0}}
  @keyframes starfly1{to{transform:translate(120px,-120px) scale(0);opacity:0}}
  @keyframes starfly2{to{transform:translate(-90px,110px) scale(0);opacity:0}}
  @keyframes starfly3{to{transform:translate(100px,90px) scale(0);opacity:0}}
  @keyframes letterPop{0%{transform:scale(0) rotate(-15deg);opacity:0}70%{transform:scale(1.15) rotate(3deg)}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes lineDraw{from{stroke-dashoffset:300}to{stroke-dashoffset:0}}
  @keyframes completePop{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes lineDraw{from{stroke-dashoffset:300}to{stroke-dashoffset:0}}
  @keyframes matchPop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
  @keyframes completePop{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0);opacity:1}}
`;

function ScoreBar({score,streak}){
  return(
    <div style={{display:"flex",gap:14,marginBottom:14}}>
      {[{e:"⭐",v:score,c:"#FFD700"},{e:"🔥",v:streak,c:"#FF8C00"}].map(({e,v,c})=>(
        <div key={e} style={{background:"rgba(255,255,255,.09)",borderRadius:14,padding:"6px 16px",color:c,fontWeight:900,fontSize:19,border:`2px solid ${c}44`}}>{e} {v}</div>
      ))}
    </div>
  );
}

function SoundBar({audio}){
  return(
    <div style={{display:"flex",gap:8,marginBottom:12,alignSelf:"flex-end"}}>
      {[{lbl:audio.musicOn?"🎵":"🔇",on:audio.musicOn,fn:()=>{audio.playClick();audio.toggleMusic();}},
        {lbl:audio.sfxOn?"🔊":"🔕",on:audio.sfxOn,fn:audio.toggleSfx}].map(({lbl,on,fn},i)=>(
        <button key={i} onClick={fn} style={{background:on?"rgba(255,215,0,.18)":"rgba(255,255,255,.06)",border:`2px solid ${on?"#FFD700":"rgba(255,255,255,.12)"}`,borderRadius:10,padding:"4px 12px",cursor:"pointer",color:on?"#FFD700":"rgba(255,255,255,.3)",fontSize:18,transition:"all .2s",fontFamily:"'Nunito',sans-serif"}}>{lbl}</button>
      ))}
    </div>
  );
}

function BackBtn({onClick}){
  return(
    <button onClick={onClick} style={{position:"absolute",top:16,left:16,background:"rgba(255,255,255,.1)",border:"2px solid rgba(255,255,255,.2)",borderRadius:12,padding:"6px 14px",color:"rgba(255,255,255,.7)",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,transition:"all .2s",zIndex:10}}>
      ← Menú
    </button>
  );
}

function FeedbackMsg({correct,answer}){
  return(
    <div style={{fontSize:21,fontWeight:900,color:correct?"#2ECC40":"#FF4136",textShadow:"1px 2px 0 rgba(0,0,0,.2)",animation:"correctPop .35s ease",textAlign:"center"}}>
      {correct?"🎉 ¡Muy bien!":answer!==undefined?`❌ Era: ${answer}`:"❌ ¡Inténtalo!"}
    </div>
  );
}

const BG="linear-gradient(160deg,#0f0c29,#302b63,#24243e)";
const CARD={background:"rgba(255,255,255,.07)",borderRadius:28,backdropFilter:"blur(14px)",border:"2px solid rgba(255,255,255,.1)",boxShadow:"0 20px 60px rgba(0,0,0,.4)"};

// ══════════════════════════════════════════════════════
//  MODE: MATCH LINES (drag to connect)
// ══════════════════════════════════════════════════════
const PAIR_COLORS=["#FF4136","#FF8C00","#FFD700","#2ECC40","#0074D9"];

function MatchLinesMode({audio,onBack,onScore}){
  const [setIdx,setSetIdx]=useState(()=>Math.floor(Math.random()*MATCH_SETS.length));
  const [score,setScore]=useState(0);
  const [round,setRound]=useState(0);
  const [burst,setBurst]=useState(false);

  const matchSet=MATCH_SETS[setIdx];

  // shuffle right column
  const [rightOrder,setRightOrder]=useState(()=>[...matchSet.pairs].map((_,i)=>i).sort(()=>Math.random()-.5));
  const [connections,setConnections]=useState({}); // leftIdx -> rightIdx
  const [wrongPair,setWrongPair]=useState(null);   // {l,r} flashing wrong
  const [completed,setCompleted]=useState(false);
  const [dragging,setDragging]=useState(null);     // leftIdx being dragged
  const [dragPos,setDragPos]=useState({x:0,y:0});  // current mouse/touch pos
  const [allCorrect,setAllCorrect]=useState(false);

  const leftRefs=useRef([]);
  const rightRefs=useRef([]);
  const containerRef=useRef(null);
  const svgRef=useRef(null);

  // reset when set changes
  const loadSet=(idx)=>{
    const s=MATCH_SETS[idx];
    setRightOrder([...s.pairs].map((_,i)=>i).sort(()=>Math.random()-.5));
    setConnections({});
    setWrongPair(null);
    setCompleted(false);
    setAllCorrect(false);
    setDragging(null);
    setSetIdx(idx);
  };

  const nextSet=()=>{
    let ni; do{ni=Math.floor(Math.random()*MATCH_SETS.length);}while(ni===setIdx);
    setRound(r=>r+1);
    loadSet(ni);
  };

  // get center of a ref element relative to container
  const getCenter=(ref)=>{
    if(!ref||!containerRef.current)return{x:0,y:0};
    const cr=containerRef.current.getBoundingClientRect();
    const er=ref.getBoundingClientRect();
    return{x:er.left-cr.left+er.width/2, y:er.top-cr.top+er.height/2};
  };

  const getPointer=(e)=>{
    const cr=containerRef.current.getBoundingClientRect();
    if(e.touches){ return{x:e.touches[0].clientX-cr.left, y:e.touches[0].clientY-cr.top}; }
    return{x:e.clientX-cr.left, y:e.clientY-cr.top};
  };

  const startDrag=(e,li)=>{
    e.preventDefault();
    // remove existing connection from this left item
    setConnections(c=>{ const n={...c}; delete n[li]; return n; });
    setDragging(li);
    setDragPos(getPointer(e));
    audio.playClick();
  };

  const onMove=(e)=>{
    if(dragging===null)return;
    e.preventDefault();
    setDragPos(getPointer(e));
  };

  const onRelease=(e)=>{
    if(dragging===null)return;
    e.preventDefault();
    // find which right item we're over
    const ptr=getPointer(e);
    let hit=null;
    rightRefs.current.forEach((ref,i)=>{
      if(!ref)return;
      const cr=containerRef.current.getBoundingClientRect();
      const er=ref.getBoundingClientRect();
      const rx=er.left-cr.left, ry=er.top-cr.top;
      if(ptr.x>=rx&&ptr.x<=rx+er.width&&ptr.y>=ry&&ptr.y<=ry+er.height) hit=i;
    });

    if(hit!==null){
      const leftIdx=dragging;
      const rightSlot=hit; // index in rightOrder
      const rightPairIdx=rightOrder[rightSlot];
      const correct=rightPairIdx===leftIdx;

      // remove any existing connection to this right slot
      const newConns={...connections};
      Object.keys(newConns).forEach(k=>{ if(newConns[k]===rightSlot) delete newConns[k]; });
      newConns[leftIdx]=rightSlot;
      setConnections(newConns);

      if(correct){
        audio.playConnect();
        // check if all matched
        const allMatched=matchSet.pairs.every((_,i)=>{
          const slot=newConns[i];
          return slot!==undefined && rightOrder[slot]===i;
        });
        if(allMatched){
          audio.playCorrect();
          setScore(s=>s+1);
          onScore&&onScore(2);
          setBurst(true); setTimeout(()=>setBurst(false),900);
          setAllCorrect(true);
          setTimeout(()=>setCompleted(true),600);
        }
      } else {
        audio.playWrong();
        setWrongPair({l:leftIdx,r:rightSlot});
        setTimeout(()=>setWrongPair(null),600);
      }
    }
    setDragging(null);
  };

  // build SVG lines
  const [lineData,setLineData]=useState([]);
  useEffect(()=>{
    if(!containerRef.current)return;
    const lines=[];
    Object.entries(connections).forEach(([li,ri])=>{
      const leftIdx=parseInt(li);
      const rightSlot=parseInt(ri);
      const rightPairIdx=rightOrder[rightSlot];
      const correct=rightPairIdx===leftIdx;
      const isWrong=wrongPair&&wrongPair.l===leftIdx&&wrongPair.r===rightSlot;
      const lc=getCenter(leftRefs.current[leftIdx]);
      const rc=getCenter(rightRefs.current[rightSlot]);
      lines.push({x1:lc.x,y1:lc.y,x2:rc.x,y2:rc.y,color:correct?PAIR_COLORS[leftIdx%5]:"#FF4136",correct,isWrong,key:`${li}-${ri}`});
    });
    // dragging line
    if(dragging!==null){
      const lc=getCenter(leftRefs.current[dragging]);
      lines.push({x1:lc.x,y1:lc.y,x2:dragPos.x,y2:dragPos.y,color:"rgba(255,255,255,.6)",dragging:true,key:"drag"});
    }
    setLineData(lines);
  },[connections,dragging,dragPos,rightOrder,wrongPair]);

  const curSet=MATCH_SETS[setIdx];

  return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16,fontFamily:"'Nunito',sans-serif",position:"relative",userSelect:"none"}}>
      <StarBurst show={burst}/>
      <BackBtn onClick={onBack}/>
      <SoundBar audio={audio}/>

      <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:6,letterSpacing:2}}>🔗 UNE CON LÍNEAS</div>
      <ScoreBar score={score} streak={0}/>

      <div style={{...CARD,padding:"22px 18px",width:"100%",maxWidth:440,animation:"fadeSlide .35s ease-out"}}>
        <div style={{textAlign:"center",fontWeight:900,fontSize:16,color:"#FFD700",marginBottom:16}}>{curSet.title}</div>

        {/* Main matching area */}
        <div
          ref={containerRef}
          style={{position:"relative",width:"100%"}}
          onMouseMove={onMove} onMouseUp={onRelease}
          onTouchMove={onMove} onTouchEnd={onRelease}
        >
          {/* SVG overlay for lines */}
          <svg ref={svgRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"visible",zIndex:5}}>
            {lineData.map(l=>(
              <g key={l.key}>
                {/* shadow */}
                <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke="rgba(0,0,0,.3)" strokeWidth={7} strokeLinecap="round"/>
                <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={l.color} strokeWidth={l.dragging?4:5} strokeLinecap="round"
                  strokeDasharray={l.dragging?"8 5":"none"}
                  style={{
                    animation:l.correct&&!l.dragging?"lineDraw .3s ease-out":"none",
                    opacity:l.isWrong?0.4:1,
                    transition:"opacity .2s",
                  }}
                />
                {/* dot at endpoints */}
                {!l.dragging&&<>
                  <circle cx={l.x1} cy={l.y1} r={6} fill={l.color}/>
                  <circle cx={l.x2} cy={l.y2} r={6} fill={l.color}/>
                </>}
              </g>
            ))}
          </svg>

          {/* Two columns */}
          <div style={{display:"flex",justifyContent:"space-between",gap:12,position:"relative",zIndex:6}}>
            {/* LEFT column */}
            <div style={{display:"flex",flexDirection:"column",gap:10,flex:1}}>
              {curSet.pairs.map((pair,li)=>{
                const isConnected=connections[li]!==undefined;
                const connSlot=connections[li];
                const correct=isConnected&&rightOrder[connSlot]===li;
                const isWrong=wrongPair&&wrongPair.l===li;
                const isDraggingThis=dragging===li;
                return(
                  <div key={li}
                    ref={el=>leftRefs.current[li]=el}
                    onMouseDown={e=>startDrag(e,li)}
                    onTouchStart={e=>startDrag(e,li)}
                    style={{
                      background:correct?"rgba(46,204,64,.25)":isWrong?"rgba(255,65,54,.25)":isDraggingThis?"rgba(255,215,0,.2)":"rgba(255,255,255,.1)",
                      border:`3px solid ${correct?PAIR_COLORS[li%5]:isWrong?"#FF4136":isDraggingThis?"#FFD700":"rgba(255,255,255,.25)"}`,
                      borderRadius:16,padding:"13px 14px",
                      cursor:"grab",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:20,
                      color:"white",textShadow:"1px 2px 0 rgba(0,0,0,.3)",
                      transition:"all .2s",
                      animation:correct?"matchPop .3s ease":isWrong?"shake .4s ease":"none",
                      boxShadow:correct?`0 0 16px ${PAIR_COLORS[li%5]}66`:"none",
                      minHeight:52,
                    }}>
                    {correct&&<span style={{marginRight:6,fontSize:16}}>✅</span>}
                    {pair.left}
                  </div>
                );
              })}
            </div>

            {/* Spacer for lines */}
            <div style={{width:60,flexShrink:0}}/>

            {/* RIGHT column */}
            <div style={{display:"flex",flexDirection:"column",gap:10,flex:1}}>
              {rightOrder.map((pairIdx,slot)=>{
                const pair=curSet.pairs[pairIdx];
                // find if any left is connected to this slot
                const connLeft=Object.entries(connections).find(([,s])=>parseInt(s)===slot);
                const isConnected=!!connLeft;
                const correct=isConnected&&parseInt(connLeft[0])===pairIdx;
                const isWrong=wrongPair&&wrongPair.r===slot;
                return(
                  <div key={slot}
                    ref={el=>rightRefs.current[slot]=el}
                    style={{
                      background:correct?"rgba(46,204,64,.25)":isWrong?"rgba(255,65,54,.25)":"rgba(255,255,255,.1)",
                      border:`3px solid ${correct?PAIR_COLORS[pairIdx%5]:isWrong?"#FF4136":"rgba(255,255,255,.25)"}`,
                      borderRadius:16,padding:"13px 14px",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:20,
                      color:"white",textShadow:"1px 2px 0 rgba(0,0,0,.3)",
                      transition:"all .2s",
                      animation:correct?"matchPop .3s ease":isWrong?"shake .4s ease":"none",
                      boxShadow:correct?`0 0 16px ${PAIR_COLORS[pairIdx%5]}66`:"none",
                      minHeight:52,
                    }}>
                    {pair.right}
                    {correct&&<span style={{marginLeft:6,fontSize:16}}>✅</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Completed celebration */}
        {allCorrect&&(
          <div style={{textAlign:"center",marginTop:20,animation:"completePop .5s ease"}}>
            <div style={{fontSize:36}}>🎉🌟🎉</div>
            <div style={{fontWeight:900,fontSize:22,color:"#FFD700",marginTop:6}}>¡Todo correcto!</div>
          </div>
        )}

        {/* Instruction */}
        {!allCorrect&&(
          <div style={{textAlign:"center",marginTop:14,color:"rgba(255,255,255,.45)",fontSize:13,fontWeight:700}}>
            Arrastra de izquierda → derecha para unir ✏️
          </div>
        )}
      </div>

      <button onClick={()=>{audio.playClick();nextSet();}} style={{marginTop:18,background:"rgba(255,255,255,.07)",border:"2px solid rgba(255,255,255,.13)",borderRadius:12,padding:"8px 22px",color:"rgba(255,255,255,.45)",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>
        Siguiente set →
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  MODE: LETTERS
// ══════════════════════════════════════════════════════
function LettersMode({audio,onBack,onScore}){
  const [idx,setIdx]=useState(()=>Math.floor(Math.random()*26));
  const [revealed,setRevealed]=useState(false);
  const [score,setScore]=useState(0);
  const [burst,setBurst]=useState(false);
  const [animKey,setAnimKey]=useState(0);
  const item=LETTERS[idx];
  const opts=useRef([]);
  if(opts.current.length===0||opts.current.findIndex(o=>o.letter===item.letter)<0){
    const pool=LETTERS.filter(l=>l.letter!==item.letter).sort(()=>Math.random()-.5).slice(0,3);
    opts.current=[item,...pool].sort(()=>Math.random()-.5);
  }
  const [selected,setSelected]=useState(null);
  const next=()=>{ let ni; do{ni=Math.floor(Math.random()*26);}while(ni===idx); setIdx(ni); setRevealed(false); setSelected(null); setAnimKey(k=>k+1); opts.current=[]; };
  const handleReveal=()=>{ audio.playLetter(); setRevealed(true); };
  const handleSelect=(letter)=>{
    if(selected)return; setSelected(letter);
    if(letter===item.letter){ audio.playCorrect(); setScore(s=>s+1); onScore&&onScore(1); setBurst(true); setTimeout(()=>setBurst(false),900); setTimeout(next,1200); }
    else { audio.playWrong(); setTimeout(next,1500); }
  };
  return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Nunito',sans-serif",position:"relative"}}>
      <StarBurst show={burst}/>
      <BackBtn onClick={onBack}/>
      <SoundBar audio={audio}/>
      <div style={{fontSize:15,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:6,letterSpacing:2}}>ABC — APRENDE LAS LETRAS</div>
      <ScoreBar score={score} streak={0}/>
      <div key={animKey} style={{...CARD,padding:"32px 28px",display:"flex",flexDirection:"column",alignItems:"center",gap:22,animation:"fadeSlide .35s ease-out",minWidth:320,maxWidth:420,width:"100%"}}>
        <div style={{fontSize:90,animation:"letterPop .5s ease",lineHeight:1}}>{item.emoji}</div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
          <div style={{fontSize:80,fontWeight:900,color:"#FFD700",textShadow:"3px 4px 0 rgba(0,0,0,.3)",lineHeight:1}}>{item.letter}</div>
          {revealed&&<div style={{fontSize:22,fontWeight:900,color:"white",textShadow:"1px 2px 0 rgba(0,0,0,.3)",animation:"correctPop .3s ease"}}>{item.word}</div>}
        </div>
        {!revealed?(
          <button onClick={handleReveal} style={{background:"linear-gradient(135deg,#FFD700,#FF8C00)",border:"none",borderRadius:20,padding:"13px 36px",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:20,color:"#222",cursor:"pointer",boxShadow:"0 5px 0 rgba(0,0,0,.25)"}}>
            ¿Qué letra es? 🔍
          </button>
        ):(
          <>
            <div style={{color:"rgba(255,255,255,.6)",fontWeight:700,fontSize:14}}>¿Cuál es la letra correcta?</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
              {opts.current.map(o=>{
                const st=selected?o.letter===item.letter?"correct":o.letter===selected?"wrong":null:null;
                return(<button key={o.letter} onClick={()=>handleSelect(o.letter)} disabled={!!selected} style={{background:st==="correct"?"#2ECC40":st==="wrong"?"#FF4136":gc(LETTERS.indexOf(o)+1)||"#5550A4",border:"3px solid rgba(0,0,0,.15)",borderRadius:16,padding:"10px 0",width:72,cursor:selected?"default":"pointer",transform:st==="correct"?"scale(1.18)":st==="wrong"?"scale(.9)":"scale(1)",transition:"all .18s cubic-bezier(.175,.885,.32,1.275)",boxShadow:st==="correct"?"0 0 22px #2ECC4090,0 4px 0 rgba(0,0,0,.2)":"0 4px 0 rgba(0,0,0,.2)",outline:"none",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:28,color:"white",textShadow:"1px 2px 0 rgba(0,0,0,.2)"}}>{o.letter}</button>);
              })}
            </div>
            {selected&&<FeedbackMsg correct={selected===item.letter} answer={item.letter}/>}
          </>
        )}
      </div>
      <button onClick={()=>{audio.playClick();next();}} style={{marginTop:18,background:"rgba(255,255,255,.07)",border:"2px solid rgba(255,255,255,.13)",borderRadius:12,padding:"8px 22px",color:"rgba(255,255,255,.45)",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>Siguiente →</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  MODE: MATH
// ══════════════════════════════════════════════════════
function genAdd(max=10){ const a=Math.ceil(Math.random()*(max-1)),b=Math.ceil(Math.random()*(max-a)),ans=a+b; const w=new Set(); while(w.size<3){const v=Math.max(1,ans+(Math.random()<.5?1:-1)*Math.ceil(Math.random()*3)); if(v!==ans&&v<=max+2)w.add(v);} return{a,b,op:"+",answer:ans,options:[...w,ans].sort(()=>Math.random()-.5)}; }
function genSub(max=10){ const a=Math.ceil(Math.random()*max),b=Math.ceil(Math.random()*a),ans=a-b; const w=new Set(); while(w.size<3){const v=Math.max(0,ans+(Math.random()<.5?1:-1)*Math.ceil(Math.random()*3)); if(v!==ans&&v<=max)w.add(v);} return{a,b,op:"-",answer:ans,options:[...w,ans].sort(()=>Math.random()-.5)}; }

function MathMode({mode,audio,onBack,onScore}){
  const [level,setLevel]=useState(5);
  const [q,setQ]=useState(()=>mode==="add"?genAdd(5):genSub(5));
  const [selected,setSelected]=useState(null);
  const [score,setScore]=useState(0);
  const [streak,setStreak]=useState(0);
  const [burst,setBurst]=useState(false);
  const [shake,setShake]=useState(false);
  const [animKey,setAnimKey]=useState(0);
  const next=useCallback(()=>{ setQ(mode==="add"?genAdd(level):genSub(level)); setSelected(null); setAnimKey(k=>k+1); },[mode,level]);
  const handleAnswer=(val)=>{
    if(selected!==null)return; setSelected(val);
    if(val===q.answer){ audio.playCorrect(); setScore(s=>s+1); setStreak(s=>s+1); onScore&&onScore(1); setBurst(true); setTimeout(()=>setBurst(false),900); setTimeout(next,1200); }
    else { audio.playWrong(); setStreak(0); setShake(true); setTimeout(()=>setShake(false),500); setTimeout(next,1500); }
  };
  const accentColor=mode==="add"?"#2ECC40":"#FF69B4";
  return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16,fontFamily:"'Nunito',sans-serif",position:"relative"}}>
      <StarBurst show={burst}/><BackBtn onClick={onBack}/><SoundBar audio={audio}/>
      <div style={{fontSize:15,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:6,letterSpacing:2}}>{mode==="add"?"➕ SUMAS":"➖ RESTAS"}</div>
      <ScoreBar score={score} streak={streak}/>
      <div style={{display:"flex",gap:8,marginBottom:18,alignItems:"center"}}>
        <span style={{color:"rgba(255,255,255,.5)",fontWeight:700,fontSize:13}}>Nivel hasta:</span>
        {[5,8,10].map(l=>(<button key={l} onClick={()=>{audio.playClick();setLevel(l);}} style={{background:level===l?accentColor:"rgba(255,255,255,.09)",color:"white",border:"none",borderRadius:10,padding:"5px 14px",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:16,cursor:"pointer",transition:"all .2s"}}>{l}</button>))}
      </div>
      <div key={animKey} style={{...CARD,padding:"28px 22px",display:"flex",flexDirection:"column",alignItems:"center",gap:22,animation:"fadeSlide .35s ease-out",minWidth:310,maxWidth:400,width:"100%"}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:10,flexWrap:"wrap",justifyContent:"center",animation:shake?"shake .4s ease":"none"}}>
          <NumberBlock value={q.a} size={44} animate/>
          <div style={{fontSize:38,fontWeight:900,color:"white",textShadow:"2px 3px 0 rgba(0,0,0,.3)",paddingBottom:26,lineHeight:1}}>{q.op}</div>
          {q.b>0&&<NumberBlock value={q.b} size={44} animate/>}
          <div style={{fontSize:38,fontWeight:900,color:"white",paddingBottom:26,lineHeight:1}}>=</div>
          <div style={{width:55,height:55,borderRadius:12,border:"4px dashed rgba(255,255,255,.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:"rgba(255,255,255,.25)",marginBottom:26}}>?</div>
        </div>
        <div style={{color:"rgba(255,255,255,.65)",fontSize:15,fontWeight:700}}>¿Cuánto es {q.a} {q.op} {q.b}?</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
          {q.options.map(opt=>{ const st=selected===null?null:opt===q.answer?"correct":opt===selected?"wrong":null; const bg=st==="correct"?accentColor:st==="wrong"?"#FF4136":gc(opt)||"#5550A4"; return(<button key={opt} onClick={()=>handleAnswer(opt)} disabled={selected!==null} style={{background:bg,border:"3px solid rgba(0,0,0,.15)",borderRadius:18,padding:"10px 0",width:80,cursor:selected!==null?"default":"pointer",transform:st==="correct"?"scale(1.18) rotate(-2deg)":st==="wrong"?"scale(.9)":"scale(1)",transition:"all .18s cubic-bezier(.175,.885,.32,1.275)",boxShadow:st==="correct"?`0 0 22px ${accentColor}90,0 4px 0 rgba(0,0,0,.2)`:"0 4px 0 rgba(0,0,0,.2)",outline:"none",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:30,color:"white",textShadow:"1px 2px 0 rgba(0,0,0,.2)"}}>{opt}</button>); })}
        </div>
        {selected!==null&&<FeedbackMsg correct={selected===q.answer} answer={q.answer}/>}
      </div>
      <button onClick={()=>{audio.playClick();next();}} style={{marginTop:18,background:"rgba(255,255,255,.07)",border:"2px solid rgba(255,255,255,.13)",borderRadius:12,padding:"8px 22px",color:"rgba(255,255,255,.45)",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>Siguiente →</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  MODE: WORDS
// ══════════════════════════════════════════════════════
function WordsMode({audio,onBack,onScore}){
  const [idx,setIdx]=useState(()=>Math.floor(Math.random()*WORD_QUIZ.length));
  const [selected,setSelected]=useState(null);
  const [score,setScore]=useState(0);
  const [streak,setStreak]=useState(0);
  const [burst,setBurst]=useState(false);
  const [animKey,setAnimKey]=useState(0);
  const item=WORD_QUIZ[idx];
  const next=()=>{ let ni; do{ni=Math.floor(Math.random()*WORD_QUIZ.length);}while(ni===idx); setIdx(ni); setSelected(null); setAnimKey(k=>k+1); };
  const handleAnswer=(opt)=>{ if(selected)return; setSelected(opt); if(opt===item.word){ audio.playCorrect(); setScore(s=>s+1); setStreak(s=>s+1); onScore&&onScore(1); setBurst(true); setTimeout(()=>setBurst(false),900); setTimeout(next,1300); } else { audio.playWrong(); setStreak(0); setTimeout(next,1600); } };
  const optColors=["#FF4136","#0074D9","#2ECC40","#9B59B6"];
  return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16,fontFamily:"'Nunito',sans-serif",position:"relative"}}>
      <StarBurst show={burst}/><BackBtn onClick={onBack}/><SoundBar audio={audio}/>
      <div style={{fontSize:15,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:6,letterSpacing:2}}>🖼️ PALABRAS E IMÁGENES</div>
      <ScoreBar score={score} streak={streak}/>
      <div key={animKey} style={{...CARD,padding:"30px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:22,animation:"fadeSlide .35s ease-out",minWidth:310,maxWidth:420,width:"100%"}}>
        <div style={{width:160,height:160,borderRadius:24,background:"rgba(255,255,255,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:100,animation:"letterPop .5s ease",boxShadow:"0 8px 30px rgba(0,0,0,.3)",border:"3px solid rgba(255,255,255,.15)"}}>{item.emoji}</div>
        <div style={{color:"rgba(255,255,255,.7)",fontWeight:700,fontSize:16}}>¿Cómo se llama esto?</div>
        <div style={{display:"flex",flexDirection:"column",gap:11,width:"100%"}}>
          {item.options.map((opt,i)=>{ const st=selected?opt===item.word?"correct":opt===selected?"wrong":null:null; const bg=st==="correct"?"#2ECC40":st==="wrong"?"#FF4136":optColors[i%optColors.length]; return(<button key={opt} onClick={()=>handleAnswer(opt)} disabled={!!selected} style={{background:bg,border:"3px solid rgba(0,0,0,.15)",borderRadius:16,padding:"13px 20px",width:"100%",cursor:selected?"default":"pointer",display:"flex",alignItems:"center",gap:12,transform:st==="correct"?"scale(1.03)":st==="wrong"?"scale(.97)":"scale(1)",transition:"all .2s cubic-bezier(.175,.885,.32,1.275)",boxShadow:st==="correct"?"0 0 24px #2ECC4088,0 4px 0 rgba(0,0,0,.2)":"0 4px 0 rgba(0,0,0,.2)",outline:"none"}}><span style={{width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:15,color:"white",flexShrink:0}}>{String.fromCharCode(65+i)}</span><span style={{fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:18,color:"white",textShadow:"1px 2px 0 rgba(0,0,0,.2)",letterSpacing:.5}}>{opt}</span>{st==="correct"&&<span style={{marginLeft:"auto",fontSize:20}}>✅</span>}{st==="wrong"&&<span style={{marginLeft:"auto",fontSize:20}}>❌</span>}</button>); })}
        </div>
        {selected&&<FeedbackMsg correct={selected===item.word} answer={item.word}/>}
      </div>
      <button onClick={()=>{audio.playClick();next();}} style={{marginTop:18,background:"rgba(255,255,255,.07)",border:"2px solid rgba(255,255,255,.13)",borderRadius:12,padding:"8px 22px",color:"rgba(255,255,255,.45)",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>Siguiente →</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  MODE: TRACE LETTERS (connect dots to form the letter)
// ══════════════════════════════════════════════════════

// Each letter defined as ordered dot positions [x,y] in a 0–100 grid
// plus segments between consecutive dots
const LETTER_DOTS = {
  A:{ dots:[[50,5],[10,95],[30,55],[70,55],[90,95]], segments:[[0,1],[0,4],[2,3]], word:"Árbol", emoji:"🌳", color:"#FF4136" },
  B:{ dots:[[15,5],[15,95],[15,5],[60,5],[75,20],[60,50],[15,50],[60,50],[75,65],[60,95],[15,95]], segments:[[0,1],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10]], word:"Barco", emoji:"⛵", color:"#FF8C00" },
  C:{ dots:[[80,15],[55,5],[25,5],[10,25],[10,75],[25,95],[55,95],[80,85]], segments:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]], word:"Casa", emoji:"🏠", color:"#FFD700" },
  D:{ dots:[[15,5],[15,95],[15,5],[50,5],[75,25],[75,75],[50,95],[15,95]], segments:[[0,1],[2,3],[3,4],[4,5],[5,6],[6,7]], word:"Dado", emoji:"🎲", color:"#2ECC40" },
  E:{ dots:[[75,5],[15,5],[15,50],[60,50],[15,50],[15,95],[75,95]], segments:[[0,1],[1,2],[2,3],[3,2],[2,4],[4,5],[5,6]], word:"Estrella", emoji:"⭐", color:"#0074D9" },
  F:{ dots:[[75,5],[15,5],[15,50],[60,50],[15,50],[15,95]], segments:[[0,1],[1,2],[2,3],[3,2],[2,4],[4,5]], word:"Flor", emoji:"🌸", color:"#9B59B6" },
  G:{ dots:[[80,15],[55,5],[25,5],[10,25],[10,75],[25,95],[55,95],[80,75],[80,50],[55,50]], segments:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]], word:"Gato", emoji:"🐱", color:"#FF69B4" },
  H:{ dots:[[15,5],[15,95],[15,50],[85,50],[85,5],[85,95]], segments:[[0,1],[2,3],[4,5]], word:"Helado", emoji:"🍦", color:"#00CED1" },
  I:{ dots:[[25,5],[75,5],[50,5],[50,95],[25,95],[75,95]], segments:[[0,1],[2,3],[4,5]], word:"Isla", emoji:"🏝️", color:"#FF6347" },
  J:{ dots:[[25,5],[75,5],[65,5],[65,75],[55,92],[40,95],[25,88],[18,75],[18,62]], segments:[[0,1],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]], word:"Jirafa", emoji:"🦒", color:"#FFD700" },
  K:{ dots:[[15,5],[15,95],[15,50],[80,5],[15,50],[80,95]], segments:[[0,1],[2,3],[4,5]], word:"Kiwi", emoji:"🥝", color:"#FF4136" },
  L:{ dots:[[15,5],[15,95],[75,95]], segments:[[0,1],[1,2]], word:"Luna", emoji:"🌙", color:"#FF8C00" },
  M:{ dots:[[10,95],[10,5],[50,50],[90,5],[90,95]], segments:[[0,1],[1,2],[2,3],[3,4]], word:"Manzana", emoji:"🍎", color:"#FFD700" },
  N:{ dots:[[15,95],[15,5],[85,95],[85,5]], segments:[[0,1],[1,2],[2,3]], word:"Nube", emoji:"☁️", color:"#2ECC40" },
  O:{ dots:[[50,5],[80,20],[92,50],[80,80],[50,95],[20,80],[8,50],[20,20],[50,5]], segments:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]], word:"Oso", emoji:"🐻", color:"#0074D9" },
  P:{ dots:[[15,5],[15,95],[15,5],[55,5],[75,15],[75,42],[55,52],[15,52]], segments:[[0,1],[2,3],[3,4],[4,5],[5,6],[6,7]], word:"Perro", emoji:"🐶", color:"#9B59B6" },
  Q:{ dots:[[50,5],[80,20],[92,50],[80,80],[50,95],[20,80],[8,50],[20,20],[50,5],[60,72],[82,95]], segments:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[9,10]], word:"Queso", emoji:"🧀", color:"#FF69B4" },
  R:{ dots:[[15,5],[15,95],[15,5],[55,5],[75,15],[75,42],[55,52],[15,52],[55,52],[80,95]], segments:[[0,1],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]], word:"Robot", emoji:"🤖", color:"#00CED1" },
  S:{ dots:[[80,12],[60,5],[30,5],[12,20],[12,45],[30,55],[70,65],[88,80],[88,85],[70,95],[40,95],[15,88]], segments:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11]], word:"Sol", emoji:"☀️", color:"#FF6347" },
  T:{ dots:[[10,5],[90,5],[50,5],[50,95]], segments:[[0,1],[2,3]], word:"Tren", emoji:"🚂", color:"#FFD700" },
  U:{ dots:[[15,5],[15,72],[22,87],[35,95],[50,95],[65,95],[78,87],[85,72],[85,5]], segments:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]], word:"Uva", emoji:"🍇", color:"#FF4136" },
  V:{ dots:[[10,5],[50,95],[90,5]], segments:[[0,1],[1,2]], word:"Volcán", emoji:"🌋", color:"#FF8C00" },
  W:{ dots:[[10,5],[28,95],[50,55],[72,95],[90,5]], segments:[[0,1],[1,2],[2,3],[3,4]], word:"Wafle", emoji:"🧇", color:"#FFD700" },
  X:{ dots:[[10,5],[90,95],[50,50],[10,95],[90,5]], segments:[[0,1],[2,3],[2,4]], word:"Xilófono", emoji:"🎵", color:"#2ECC40" },
  Y:{ dots:[[10,5],[50,50],[90,5],[50,50],[50,95]], segments:[[0,1],[1,2],[3,4]], word:"Yoyó", emoji:"🪀", color:"#0074D9" },
  Z:{ dots:[[10,5],[90,5],[10,95],[90,95]], segments:[[0,1],[1,2],[2,3]], word:"Zapato", emoji:"👟", color:"#9B59B6" },
};

const LETTER_ORDER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function TraceLetterMode({ audio, onBack, onScore }) {
  const [letterIdx, setLetterIdx] = useState(0);
  const [visitedDots, setVisitedDots] = useState(new Set());
  const [drawing, setDrawing] = useState(false);
  const [currentPos, setCurrentPos] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [burst, setBurst] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const svgRef = useRef(null);

  const letter = LETTER_ORDER[letterIdx];
  const ld = LETTER_DOTS[letter];
  const CANVAS = 280;

  // Convert 0-100 grid coords to SVG pixels
  const px = (x) => (x / 100) * CANVAS;
  const py = (y) => (y / 100) * CANVAS;

  const getSVGPoint = (e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const distToPoint = (pt, dot) => {
    const dx = pt.x - dot[0], dy = pt.y - dot[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  const checkDotHit = (pt, visited) => {
    // Find closest unvisited dot within range
    let best = null, bestDist = 12; // 12 units tolerance in 0-100 space
    ld.dots.forEach((dot, i) => {
      if (visited.has(i)) return;
      const d = distToPoint(pt, dot);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const pt = getSVGPoint(e);
    if (!pt) return;
    setDrawing(true);
    setCurrentPos(pt);
    const hit = checkDotHit(pt, new Set());
    // only start if touching first dot or any dot
    if (hit !== null) {
      const nv = new Set([hit]);
      setVisitedDots(nv);
      audio.playClick();
    }
  };

  const onPointerMove = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const pt = getSVGPoint(e);
    if (!pt) return;
    setCurrentPos(pt);
    const hit = checkDotHit(pt, visitedDots);
    if (hit !== null) {
      const nv = new Set([...visitedDots, hit]);
      setVisitedDots(nv);
      audio.playConnect();
      // check completion: all dots visited
      if (nv.size === ld.dots.length) {
        setDrawing(false);
        setCompleted(true);
        setShowReveal(true);
        setBurst(true);
        setTimeout(() => setBurst(false), 1000);
        audio.playCorrect();
        setScore(s => s + 1);
        onScore && onScore(1);
      }
    }
  };

  const onPointerUp = (e) => {
    e.preventDefault();
    setDrawing(false);
    setCurrentPos(null);
  };

  const nextLetter = () => {
    const ni = (letterIdx + 1) % LETTER_ORDER.length;
    setLetterIdx(ni);
    setVisitedDots(new Set());
    setDrawing(false);
    setCurrentPos(null);
    setCompleted(false);
    setShowReveal(false);
    setAnimKey(k => k + 1);
  };

  const resetLetter = () => {
    setVisitedDots(new Set());
    setCompleted(false);
    setShowReveal(false);
    setDrawing(false);
    setCurrentPos(null);
  };

  // Build traced path from visited dots in order
  const tracedSegments = [];
  ld.segments.forEach(([a, b]) => {
    if (visitedDots.has(a) && visitedDots.has(b)) {
      tracedSegments.push([a, b]);
    }
  });

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Nunito',sans-serif", position: "relative" }}>
      <StarBurst show={burst} />
      <BackBtn onClick={onBack} />
      <SoundBar audio={audio} />

      <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 6, letterSpacing: 2 }}>✏️ TRAZA LA LETRA</div>

      <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
        <div style={{ background: "rgba(255,255,255,.09)", borderRadius: 14, padding: "6px 16px", color: "#FFD700", fontWeight: 900, fontSize: 19, border: "2px solid #FFD70044" }}>⭐ {score}</div>
        <div style={{ background: "rgba(255,255,255,.09)", borderRadius: 14, padding: "6px 16px", color: "rgba(255,255,255,.5)", fontWeight: 900, fontSize: 19, border: "2px solid rgba(255,255,255,.15)" }}>
          {letterIdx + 1} / {LETTER_ORDER.length}
        </div>
      </div>

      {/* Letter navigator */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 380 }}>
        {LETTER_ORDER.map((l, i) => (
          <button key={l} onClick={() => { audio.playClick(); setLetterIdx(i); resetLetter(); }} style={{
            width: 30, height: 30, borderRadius: 8,
            background: i === letterIdx ? ld.color : "rgba(255,255,255,.08)",
            border: `2px solid ${i === letterIdx ? ld.color : "rgba(255,255,255,.15)"}`,
            color: i === letterIdx ? "white" : "rgba(255,255,255,.4)",
            fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 13,
            cursor: "pointer", transition: "all .15s",
          }}>{l}</button>
        ))}
      </div>

      <div key={animKey} style={{ ...CARD, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, animation: "fadeSlide .35s ease-out", width: "100%", maxWidth: 360 }}>

        {/* Instruction */}
        {!completed ? (
          <div style={{ color: "rgba(255,255,255,.6)", fontWeight: 700, fontSize: 14, textAlign: "center" }}>
            🖊️ Pasa el dedo por los puntos en orden para trazar la letra
          </div>
        ) : (
          <div style={{ animation: "completePop .5s ease", textAlign: "center" }}>
            <div style={{ fontSize: 48 }}>{ld.emoji}</div>
          </div>
        )}

        {/* SVG Canvas */}
        <div style={{ position: "relative", touchAction: "none" }}>
          <svg
            ref={svgRef}
            width={CANVAS} height={CANVAS}
            viewBox={`0 0 100 100`}
            style={{ display: "block", borderRadius: 16, background: "rgba(255,255,255,.05)", border: `3px solid ${completed ? ld.color : "rgba(255,255,255,.15)"}`, cursor: "crosshair", touchAction: "none", transition: "border-color .3s" }}
            onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
          >
            {/* Ghost letter guide (very faint) */}
            {ld.segments.map(([a, b], i) => (
              <line key={`g${i}`}
                x1={ld.dots[a][0]} y1={ld.dots[a][1]}
                x2={ld.dots[b][0]} y2={ld.dots[b][1]}
                stroke="rgba(255,255,255,.08)" strokeWidth={4} strokeLinecap="round"
              />
            ))}

            {/* Traced segments */}
            {tracedSegments.map(([a, b], i) => (
              <line key={`t${i}`}
                x1={ld.dots[a][0]} y1={ld.dots[a][1]}
                x2={ld.dots[b][0]} y2={ld.dots[b][1]}
                stroke={ld.color} strokeWidth={5} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${ld.color})` }}
              />
            ))}

            {/* Live drag line */}
            {drawing && currentPos && visitedDots.size > 0 && (() => {
              const lastVisited = Math.max(...visitedDots);
              const lx = ld.dots[lastVisited][0], ly = ld.dots[lastVisited][1];
              return (
                <line x1={lx} y1={ly} x2={currentPos.x} y2={currentPos.y}
                  stroke="rgba(255,255,255,.4)" strokeWidth={3} strokeLinecap="round" strokeDasharray="4 3" />
              );
            })()}

            {/* Dot nodes */}
            {ld.dots.map((dot, i) => {
              const visited = visitedDots.has(i);
              return (
                <g key={`d${i}`}>
                  {/* outer glow when unvisited */}
                  {!visited && (
                    <circle cx={dot[0]} cy={dot[1]} r={7} fill="rgba(255,255,255,.08)" />
                  )}
                  <circle cx={dot[0]} cy={dot[1]} r={visited ? 5 : 4.5}
                    fill={visited ? ld.color : "rgba(255,255,255,.7)"}
                    stroke={visited ? "white" : ld.color}
                    strokeWidth={1.5}
                    style={{ filter: visited ? `drop-shadow(0 0 5px ${ld.color})` : "none", transition: "all .2s" }}
                  />
                  {/* dot number */}
                  <text x={dot[0]} y={dot[1] - 6} textAnchor="middle"
                    fontSize={5} fill={visited ? ld.color : "rgba(255,255,255,.4)"}
                    fontFamily="Nunito, sans-serif" fontWeight="900"
                  >{i + 1}</text>
                </g>
              );
            })}

            {/* Completion overlay */}
            {completed && (
              <text x={50} y={50} textAnchor="middle" dominantBaseline="middle"
                fontSize={70} fill={ld.color} fontFamily="Nunito, sans-serif" fontWeight="900"
                opacity={0.15}
              >{letter}</text>
            )}
          </svg>
        </div>

        {/* Reveal panel */}
        {showReveal && (
          <div style={{ animation: "completePop .5s ease", textAlign: "center", background: `${ld.color}22`, border: `3px solid ${ld.color}`, borderRadius: 20, padding: "16px 24px", width: "100%" }}>
            <div style={{ fontSize: 52, marginBottom: 4 }}>{ld.emoji}</div>
            <div style={{ fontSize: 60, fontWeight: 900, color: ld.color, textShadow: `2px 3px 0 rgba(0,0,0,.3)`, lineHeight: 1 }}>{letter}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "white", marginTop: 6 }}>"{ld.word}"</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginTop: 4 }}>¡Esa es la letra {letter}!</div>
          </div>
        )}

        {!completed && (
          <button onClick={resetLetter} style={{ background: "rgba(255,255,255,.07)", border: "2px solid rgba(255,255,255,.13)", borderRadius: 10, padding: "6px 18px", color: "rgba(255,255,255,.4)", fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            🔄 Reintentar
          </button>
        )}
      </div>

      <button onClick={() => { audio.playClick(); nextLetter(); }} style={{ marginTop: 16, background: "rgba(255,255,255,.07)", border: "2px solid rgba(255,255,255,.13)", borderRadius: 12, padding: "8px 22px", color: "rgba(255,255,255,.45)", fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        Siguiente letra →
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  MAIN MENU
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  SKILL LEVEL SYSTEM — 100 levels per subject
// ══════════════════════════════════════════════════════
const SKILL_IDS = ["letras","sumas","restas","palabras","lineas","trazos","dibujo","colorear","globos","castor","damigotchi","cuncuna","bloques"];

const SKILL_INFO = {
  letras:   { label:"Letras",      emoji:"🔤", color:"#9B59B6", shadow:"rgba(155,89,182,.5)" },
  sumas:    { label:"Sumas",       emoji:"➕", color:"#2ECC40", shadow:"rgba(46,204,64,.5)"  },
  restas:   { label:"Restas",      emoji:"➖", color:"#FF69B4", shadow:"rgba(255,105,180,.5)"},
  palabras: { label:"Palabras",    emoji:"🖼️", color:"#0074D9", shadow:"rgba(0,116,217,.5)"  },
  lineas:   { label:"Une Líneas",  emoji:"🔗", color:"#FF8C00", shadow:"rgba(255,140,0,.5)"  },
  trazos:   { label:"Trazos",      emoji:"✏️", color:"#00CED1", shadow:"rgba(0,206,209,.5)"  },
  dibujo:   { label:"Dibujo",      emoji:"🎨", color:"#E91E63", shadow:"rgba(233,30,99,.5)"   },
  colorear: { label:"Pintar",      emoji:"🐾", color:"#4CAF50", shadow:"rgba(76,175,80,.5)"    },
  globos:   { label:"Globos",      emoji:"🎈", color:"#FF4136", shadow:"rgba(255,65,54,.5)"    },
  castor:   { label:"Castor",      emoji:"🦫", color:"#8D6E63", shadow:"rgba(141,110,99,.5)"   },
  damigotchi:{ label:"Damigotchi",  emoji:"🧩", color:"#FFD700", shadow:"rgba(255,215,0,.5)"   },
  cuncuna:  { label:"Cuncuna",     emoji:"🐛", color:"#4CAF50", shadow:"rgba(76,175,80,.5)"    },
  bloques:  { label:"Constructor", emoji:"🧱", color:"#FF8C00", shadow:"rgba(255,140,0,.5)"    },
};

// XP needed per skill level (same curve as pet)
function skillXpForLevel(lvl) {
  let t = 0;
  for (let i = 1; i < lvl; i++) t += Math.floor(3 + i * 1.4);
  return t;
}
const SKILL_LEVEL_XP = Array.from({length:101}, (_,i) => skillXpForLevel(i+1));

const SKILL_LEVEL_NAMES = [
  "Principiante","Curioso","Explorador","Aprendiz","Practicante",
  "Estudioso","Dedicado","Aplicado","Constante","Avanzado",
  "Hábil","Diestro","Competente","Solvente","Capaz",
  "Experto","Maestro","Virtuoso","Brillante","Sobresaliente",
  "Prodigio","Genio","Erudito","Sabio","Iluminado",
  "Campeón","Leyenda","Mítico","Épico","Supremo",
  "Nv.31","Nv.32","Nv.33","Nv.34","Nv.35",
  "Nv.36","Nv.37","Nv.38","Nv.39","Nv.40",
  "Nv.41","Nv.42","Nv.43","Nv.44","Nv.45",
  "Nv.46","Nv.47","Nv.48","Nv.49","Nv.50",
  "Nv.51","Nv.52","Nv.53","Nv.54","Nv.55",
  "Nv.56","Nv.57","Nv.58","Nv.59","Nv.60",
  "Nv.61","Nv.62","Nv.63","Nv.64","Nv.65",
  "Nv.66","Nv.67","Nv.68","Nv.69","Nv.70",
  "Nv.71","Nv.72","Nv.73","Nv.74","Nv.75",
  "Nv.76","Nv.77","Nv.78","Nv.79","Nv.80",
  "Nv.81","Nv.82","Nv.83","Nv.84","Nv.85",
  "Nv.86","Nv.87","Nv.88","Nv.89","Nv.90",
  "Nv.91","Nv.92","Nv.93","Nv.94","Nv.95",
  "Nv.96","Nv.97","Nv.98","Nv.99","¡MAESTRO!",
];

function getSkillLevel(xp) {
  let lvl = 1;
  for (let i = 0; i < 100; i++) { if (xp >= SKILL_LEVEL_XP[i]) lvl = i + 1; else break; }
  return Math.min(100, lvl);
}
function getSkillProgress(xp) {
  const lvl = getSkillLevel(xp);
  if (lvl >= 100) return { lvl:100, name:"¡MAESTRO!", current:0, needed:0, pct:100 };
  const cur  = xp - SKILL_LEVEL_XP[lvl - 1];
  const need = SKILL_LEVEL_XP[lvl] - SKILL_LEVEL_XP[lvl - 1];
  return { lvl, name: SKILL_LEVEL_NAMES[lvl - 1], current: cur, needed: need, pct: Math.min(100, (cur/need)*100) };
}

// Total skill levels across all skills (max = 8×100 = 800)
function totalSkillLevels(skills) {
  return SKILL_IDS.reduce((s, id) => s + getSkillLevel(skills[id] || 0), 0);
}
// Total de aciertos/puntos: se usa para entregar cartas más seguido.
function totalSkillPoints(skills) {
  return SKILL_IDS.reduce((s, id) => s + (skills[id] || 0), 0);
}
function cardsFromSkills(skills) {
  const total = totalSkillPoints(skills);
  return Math.min(ALL_CARDS.length, Math.floor(total / 3)); // cada 3 aciertos = 1 carta
}

// ── Skill mini-bar component ──────────────────────────
function SkillBar({ skillId, xp, compact=false }) {
  const info = SKILL_INFO[skillId];
  const prog = getSkillProgress(xp || 0);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:compact?6:8, width:"100%" }}>
      <div style={{ fontSize:compact?14:16, flexShrink:0 }}>{info.emoji}</div>
      <div style={{ flex:1 }}>
        {!compact && (
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
            <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:11, color:"rgba(255,255,255,.6)" }}>
              {info.label}
            </span>
            <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:11, color:info.color }}>
              Nv.{prog.lvl} · {prog.name}
            </span>
          </div>
        )}
        <div style={{ height:compact?7:9, background:"rgba(255,255,255,.1)", borderRadius:6, overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${prog.pct}%`,
            background:`linear-gradient(90deg,${info.color}cc,${info.color})`,
            borderRadius:6, transition:"width .5s",
          }}/>
        </div>
        {compact && (
          <div style={{ fontSize:9, color:info.color, fontWeight:700, marginTop:1, fontFamily:"'Nunito',sans-serif" }}>
            {info.label} Nv.{prog.lvl}
          </div>
        )}
      </div>
      {!compact && (
        <div style={{ fontSize:10, color:"rgba(255,255,255,.4)", fontWeight:700, fontFamily:"'Nunito',sans-serif", width:34, textAlign:"right", flexShrink:0 }}>
          {prog.current}/{prog.needed}
        </div>
      )}
    </div>
  );
}

// ── Skills overview screen ────────────────────────────
function SkillsScreen({ skills, onBack, earnedCards }) {
  const total = totalSkillLevels(skills);
  const maxTotal = SKILL_IDS.length * 100;
  const cardsUnlocked = cardsFromSkills(skills);
  return (
    <div style={{ minHeight:"100vh", background:BG, display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 16px 32px", fontFamily:"'Nunito',sans-serif" }}>
      <BackBtn onClick={onBack}/>
      <div style={{ marginTop:52, marginBottom:6, fontWeight:900, fontSize:22, color:"white", textShadow:"2px 3px 0 rgba(0,0,0,.3)" }}>📚 Mis Materias</div>
      <div style={{ color:"rgba(255,255,255,.5)", fontWeight:700, fontSize:13, marginBottom:14, textAlign:"center" }}>
        Niveles totales: {total}/{maxTotal} · Cartas: {cardsUnlocked}/{ALL_CARDS.length}
      </div>

      {/* Global progress */}
      <div style={{ width:"100%", maxWidth:400, background:"rgba(255,255,255,.06)", borderRadius:16, padding:"12px 14px", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:12, color:"rgba(255,255,255,.5)" }}>Progreso global</span>
          <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:12, color:"#FFD700" }}>{Math.floor((total/maxTotal)*100)}%</span>
        </div>
        <div style={{ height:10, background:"rgba(255,255,255,.1)", borderRadius:6, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(total/maxTotal)*100}%`, background:"linear-gradient(90deg,#9B59B6,#2ECC40,#FFD700)", borderRadius:6, transition:"width .5s" }}/>
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:5, fontWeight:700, textAlign:"center" }}>
          Al completar todos los niveles tendrás ¡todas las cartas! 🃏
        </div>
      </div>

      {/* Each skill card */}
      {SKILL_IDS.map(id => {
        const info = SKILL_INFO[id];
        const prog = getSkillProgress(skills[id] || 0);
        const isMax = prog.lvl >= 100;
        return (
          <div key={id} style={{
            width:"100%", maxWidth:400, marginBottom:10,
            background:`linear-gradient(135deg,${info.color}22,${info.color}11)`,
            border:`2px solid ${info.color}55`, borderRadius:20, padding:"14px 16px",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ fontSize:28 }}>{info.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:16, color:"white" }}>{info.label}</div>
                <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:12, color:info.color }}>
                  {isMax ? "¡MAESTRO! 🏆" : `Nv.${prog.lvl} — ${prog.name}`}
                </div>
              </div>
              <div style={{
                background:`${info.color}33`, border:`2px solid ${info.color}`,
                borderRadius:12, padding:"4px 10px",
                fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:14, color:info.color,
              }}>
                {prog.lvl}/100
              </div>
            </div>
            {/* segmented bar */}
            <div style={{ display:"flex", gap:2, marginBottom:4 }}>
              {Array.from({length:10}, (_,i) => {
                const filled = i < Math.floor(prog.pct / 10);
                const partial = i === Math.floor(prog.pct / 10);
                return (
                  <div key={i} style={{ flex:1, height:8, borderRadius:3, background:"rgba(255,255,255,.08)", overflow:"hidden" }}>
                    <div style={{
                      height:"100%",
                      width: filled ? "100%" : partial ? `${(prog.pct%10)*10}%` : "0%",
                      background:`linear-gradient(90deg,${info.color}cc,${info.color})`,
                      transition:"width .4s",
                    }}/>
                  </div>
                );
              })}
            </div>
            {!isMax && (
              <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:10, color:"rgba(255,255,255,.4)" }}>
                {prog.current}/{prog.needed} XP para Nv.{prog.lvl+1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ══════════════════════════════════════════════════════
//  INSIGNIAS Y DIPLOMAS
// ══════════════════════════════════════════════════════
const BADGE_LEVELS = [3,5,10,15,20];
const BADGE_NAMES = ["Primer logro", "Buen avance", "Gran aprendizaje", "Experto", "Maestro Damigotchi"];

function getBadgeLevelForSkill(xp){
  const lvl = getSkillLevel(xp || 0);
  let unlocked = 0;
  BADGE_LEVELS.forEach((need, i)=>{ if(lvl >= need) unlocked = i + 1; });
  return unlocked;
}

function getDiplomaUnlocked(xp){
  return getSkillLevel(xp || 0) >= 15;
}

function BadgeIcon({skillId, level, size=62}){
  const info = SKILL_INFO[skillId] || {emoji:"🏅", color:"#FFD700"};
  const locked = level <= 0;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:locked?"rgba(255,255,255,.08)":`linear-gradient(135deg,${info.color},#FFD700)`,border:`3px solid ${locked?"rgba(255,255,255,.12)":"#FFD700"}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:locked?"none":"0 7px 0 rgba(0,0,0,.24), 0 0 22px rgba(255,215,0,.25)",filter:locked?"grayscale(1) opacity(.45)":"none",position:"relative",flexShrink:0}}>
      <span style={{fontSize:size*.42}}>{info.emoji}</span>
      {!locked && <div style={{position:"absolute",right:-5,bottom:-4,background:"#FFD700",color:"#2b2100",border:"2px solid white",borderRadius:999,padding:"1px 6px",fontSize:10,fontWeight:900}}>Nv.{level}</div>}
      {locked && <span style={{position:"absolute",fontSize:size*.32}}>🔒</span>}
    </div>
  );
}

function BadgesScreen({ skills, onBack }){
  const totalBadges = SKILL_IDS.reduce((acc,id)=>acc+getBadgeLevelForSkill(skills[id]||0),0);
  const maxBadges = SKILL_IDS.length * BADGE_LEVELS.length;
  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 14px 34px",fontFamily:"'Nunito',sans-serif"}}>
      <BackBtn onClick={onBack}/>
      <div style={{marginTop:52,fontSize:24,fontWeight:900,color:"white",textShadow:"2px 3px 0 rgba(0,0,0,.3)"}}>🏅 Mis Insignias</div>
      <div style={{color:"rgba(255,255,255,.55)",fontSize:13,fontWeight:700,marginBottom:14,textAlign:"center"}}>Gana insignias subiendo de nivel en cada materia · {totalBadges}/{maxBadges}</div>
      <div style={{width:"100%",maxWidth:430,display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
        {SKILL_IDS.map(id=>{
          const info = SKILL_INFO[id];
          const prog = getSkillProgress(skills[id]||0);
          const badgeLevel = getBadgeLevelForSkill(skills[id]||0);
          const nextNeed = BADGE_LEVELS[badgeLevel] || null;
          return (
            <div key={id} style={{background:`linear-gradient(135deg,${info.color}22,rgba(255,255,255,.06))`,border:`2px solid ${badgeLevel?info.color:"rgba(255,255,255,.12)"}`,borderRadius:20,padding:12,display:"flex",flexDirection:"column",alignItems:"center",gap:8,minHeight:190}}>
              <BadgeIcon skillId={id} level={badgeLevel}/>
              <div style={{fontSize:14,fontWeight:900,color:"white",textAlign:"center"}}>{info.label}</div>
              <div style={{fontSize:11,fontWeight:800,color:badgeLevel?"#FFD700":"rgba(255,255,255,.45)",textAlign:"center"}}>{badgeLevel?BADGE_NAMES[badgeLevel-1]:"Sin insignia aún"}</div>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.45)",textAlign:"center"}}>Materia Nv.{prog.lvl}</div>
              {nextNeed ? <div style={{width:"100%",height:6,background:"rgba(255,255,255,.12)",borderRadius:999,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(prog.lvl/nextNeed)*100)}%`,background:info.color,borderRadius:999}}/></div> : <div style={{fontSize:18}}>🏆</div>}
              {nextNeed && <div style={{fontSize:9,color:"rgba(255,255,255,.35)",fontWeight:700}}>Próxima en Nv.{nextNeed}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DiplomaPreview({ skillId, childName="Mi pequeño/a" }){
  const info = SKILL_INFO[skillId];
  return (
    <div id={`diploma-${skillId}`} style={{background:"#fff7d6",color:"#2b2100",border:"8px solid #FFD700",borderRadius:22,padding:18,textAlign:"center",boxShadow:"0 10px 0 rgba(0,0,0,.22)",maxWidth:360,margin:"0 auto"}}>
      <div style={{fontSize:44}}>🏅</div>
      <div style={{fontSize:23,fontWeight:900,color:"#8a6200"}}>Diploma Damigotchi</div>
      <div style={{fontSize:12,fontWeight:900,letterSpacing:1,color:"#a06e00",marginTop:2}}>CERTIFICADO DE APRENDIZAJE</div>
      <div style={{height:1,background:"#d6a600",margin:"10px 0"}}/>
      <div style={{fontSize:13,fontWeight:800}}>Se entrega a</div>
      <div style={{fontSize:22,fontWeight:900,margin:"4px 0",color:"#3d2d00"}}>{childName}</div>
      <p style={{fontSize:13,lineHeight:1.35,margin:"8px 0"}}>Por avanzar con alegría y esfuerzo en</p>
      <div style={{fontSize:30}}>{info.emoji}</div>
      <div style={{fontSize:20,fontWeight:900,color:info.color}}>{info.label}</div>
      <div style={{height:1,background:"#d6a600",margin:"12px 0 8px"}}/>
      <div style={{fontSize:11,fontWeight:900,color:"#8a6200"}}>🇨🇱 Creado por Ricardo Toledo Barria</div>
    </div>
  );
}

function DiplomasScreen({ skills, pet, onBack }){
  const [selected, setSelected] = useState(SKILL_IDS.find(id=>getDiplomaUnlocked(skills[id]||0)) || SKILL_IDS[0]);
  const unlockedCount = SKILL_IDS.filter(id=>getDiplomaUnlocked(skills[id]||0)).length;
  const printDiploma = () => {
    window.print();
  };
  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 14px 34px",fontFamily:"'Nunito',sans-serif"}}>
      <style>{`@media print{body *{visibility:hidden!important} #diploma-${selected}, #diploma-${selected} *{visibility:visible!important} #diploma-${selected}{position:absolute;left:0;right:0;top:20px;margin:auto!important;box-shadow:none!important}}`}</style>
      <BackBtn onClick={onBack}/>
      <div style={{marginTop:52,fontSize:24,fontWeight:900,color:"white",textShadow:"2px 3px 0 rgba(0,0,0,.3)"}}>📜 Mis Diplomas</div>
      <div style={{color:"rgba(255,255,255,.55)",fontSize:13,fontWeight:700,marginBottom:14,textAlign:"center"}}>Se desbloquean desde nivel 15 por materia · {unlockedCount}/{SKILL_IDS.length}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",maxWidth:430,marginBottom:14}}>
        {SKILL_IDS.map(id=>{
          const info=SKILL_INFO[id];
          const unlocked=getDiplomaUnlocked(skills[id]||0);
          return <button key={id} onClick={()=>setSelected(id)} style={{background:selected===id?`${info.color}33`:"rgba(255,255,255,.07)",border:`2px solid ${selected===id?info.color:"rgba(255,255,255,.12)"}`,borderRadius:12,padding:"7px 10px",color:unlocked?"white":"rgba(255,255,255,.35)",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer",filter:unlocked?"none":"grayscale(1)"}}>{unlocked?info.emoji:"🔒"} {info.label}</button>
        })}
      </div>
      {getDiplomaUnlocked(skills[selected]||0) ? <>
        <DiplomaPreview skillId={selected} childName={pet?.name || "Mi pequeño/a"}/>
        <button onClick={printDiploma} style={{marginTop:16,background:"linear-gradient(135deg,#FFD700,#FF8C00)",border:"none",borderRadius:16,padding:"12px 24px",fontFamily:"'Nunito',sans-serif",fontWeight:900,color:"#261b00",fontSize:16,cursor:"pointer",boxShadow:"0 5px 0 rgba(0,0,0,.25)"}}>🖨️ Imprimir diploma</button>
      </> : <div style={{maxWidth:380,background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.13)",borderRadius:22,padding:20,textAlign:"center",color:"rgba(255,255,255,.7)",fontWeight:800}}>🔒 Este diploma se desbloquea cuando {pet?.name || "tu Damigotchi"} llegue a nivel 15 en {SKILL_INFO[selected].label}.</div>}
    </div>
  );
}

const MODES=[
  {id:"letras",  emoji:"🔤",label:"Letras",     sub:"Aprende el abecedario",  color:"#9B59B6",shadow:"rgba(155,89,182,.5)", skill:"letras"  },
  {id:"sumas",   emoji:"➕",label:"Sumas",      sub:"Suma con bloques",        color:"#2ECC40",shadow:"rgba(46,204,64,.5)",  skill:"sumas"   },
  {id:"restas",  emoji:"➖",label:"Restas",     sub:"Resta con bloques",       color:"#FF69B4",shadow:"rgba(255,105,180,.5)",skill:"restas"  },
  {id:"palabras",emoji:"🖼️",label:"Palabras",   sub:"Lee e identifica",        color:"#0074D9",shadow:"rgba(0,116,217,.5)", skill:"palabras"},
  {id:"lineas",  emoji:"🔗",label:"Une Líneas", sub:"Arrastra y conecta",      color:"#FF8C00",shadow:"rgba(255,140,0,.5)", skill:"lineas"  },
  {id:"trazos",  emoji:"✏️",label:"Trazos",     sub:"Traza las letras",        color:"#00CED1",shadow:"rgba(0,206,209,.5)", skill:"trazos"  },
  {id:"dibujo",  emoji:"🎨",label:"Dibujo",     sub:"Dibuja y guarda",         color:"#E91E63",shadow:"rgba(233,30,99,.5)",  skill:"dibujo"  },
  {id:"colorear",emoji:"🐾",label:"Pintar animales",sub:"Colorea animalitos",       color:"#4CAF50",shadow:"rgba(76,175,80,.5)",  skill:"colorear"},
];

// ══════════════════════════════════════════════════════
//  SPLASH
// ══════════════════════════════════════════════════════
function Splash({onStart, audioReady}){
  return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:22,padding:20,fontFamily:"'Nunito',sans-serif"}}>
      {/* animated eggs */}
      <div style={{display:"flex",gap:16,justifyContent:"center"}}>
        {["#FF6B8A","#A0785A","#FF7043","#3CB371","#555","#32CD32"].map((c,i)=>(
          <div key={i} style={{animation:`bounce 1.2s ease-in-out ${i*.18}s infinite`}}>
            <svg width={44} height={52} viewBox="0 0 44 52">
              <ellipse cx={22} cy={30} rx={18} ry={22} fill={c}/>
              <ellipse cx={22} cy={30} rx={18} ry={22} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth={2} strokeDasharray="5 4"/>
              <ellipse cx={16} cy={20} rx={7} ry={5} fill="rgba(255,255,255,.2)" transform="rotate(-30,16,20)"/>
              <text x={22} y={36} textAnchor="middle" fontSize={14}>❓</text>
            </svg>
          </div>
        ))}
      </div>
      <div style={{textAlign:"center"}}>
        <h1 style={{margin:0,fontWeight:900,fontSize:36,color:"white",textShadow:"3px 5px 0 rgba(0,0,0,.3)"}}>🥚 Damigotchi</h1>
        <h1 style={{margin:"4px 0 0",fontWeight:900,fontSize:28,color:"#FFD700",textShadow:"2px 4px 0 rgba(0,0,0,.3)"}}>¡A Aprender!</h1>
        <p style={{color:"rgba(255,255,255,.55)",fontWeight:700,fontSize:14,marginTop:8,lineHeight:1.6}}>
          Adopta tu bebé · Cuídalo · Hazlo crecer<br/>
          <span style={{fontSize:12,color:"rgba(255,255,255,.35)"}}>Letras · Sumas · Restas · Palabras · Líneas · Trazos</span>
        </p>
      </div>
      <button onClick={onStart} style={{background:"linear-gradient(135deg,#FFD700,#FF8C00)",border:"none",borderRadius:26,padding:"16px 52px",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:26,color:"#222",cursor:"pointer",boxShadow:"0 7px 0 rgba(0,0,0,.25),0 0 36px rgba(255,215,0,.45)",animation:"pulse 2s infinite"}}>
        🔊 Toca para comenzar
      </button>
      <p style={{color:"rgba(255,255,255,.25)",fontSize:12,margin:0}}>🎵 El sonido se activa con este toque · 🃏 Colección de cartas · 🐣 Mascota viva</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  CARD COLLECTION DATA + ILLUSTRATED PORTRAITS
// ══════════════════════════════════════════════════════

// ── SVG character portraits ──────────────────────────

// Numberblocks: stacked colored blocks with big face on top block,
// number badge floating, arms (gloves for 5&10), accessories per character
function PortraitNumberblock({ num, size=100 }) {
  const c = gc(num);
  // layout: 1-3 single col, 4 2x2, 5 1x5, 6-10 2-col
  const cols = (num===4||num>=6) ? 2 : 1;
  const rows = Math.ceil(num/cols);
  const maxH = 76, maxW = 80;
  const bs = Math.min(maxW/cols, maxH/rows);
  const tw = cols*bs, th = rows*bs;
  const ox = (100-tw)/2, oy = 8+(72-th)/2;

  // special accessories
  const hasCrown = num===10;
  const hasSuperCape = num===5;
  const hasShades = num===6;
  const hasBowtie = num===3;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* ground shadow */}
      <ellipse cx={50} cy={96} rx={28} ry={4} fill="rgba(0,0,0,.18)"/>

      {/* blocks */}
      {Array.from({length:num}).map((_,i)=>{
        const col=i%cols, row=Math.floor(i/cols);
        const x=ox+col*bs, y=oy+row*bs;
        const isFace=i===0;
        const shade = `rgba(0,0,0,.12)`;
        return (
          <g key={i}>
            {/* block body */}
            <rect x={x+1} y={y+1} width={bs-2} height={bs-2} rx={bs*0.13} fill={c} stroke="rgba(0,0,0,.25)" strokeWidth={1.5}/>
            {/* top highlight */}
            <rect x={x+4} y={y+4} width={bs*0.35} height={bs*0.15} rx={2} fill="rgba(255,255,255,.45)"/>
            {/* bottom shade */}
            <rect x={x+1} y={y+bs*0.75} width={bs-2} height={bs*0.23} rx={bs*0.1} fill={shade}/>
            {isFace && <>
              {/* eye whites */}
              <ellipse cx={x+bs*0.33} cy={y+bs*0.44} rx={bs*0.13} ry={bs*0.15} fill="white" stroke="#222" strokeWidth={1}/>
              <ellipse cx={x+bs*0.67} cy={y+bs*0.44} rx={bs*0.13} ry={bs*0.15} fill="white" stroke="#222" strokeWidth={1}/>
              {/* pupils */}
              <circle cx={x+bs*0.35} cy={y+bs*0.46} r={bs*0.07} fill="#111"/>
              <circle cx={x+bs*0.69} cy={y+bs*0.46} r={bs*0.07} fill="#111"/>
              {/* eye shine */}
              <circle cx={x+bs*0.32} cy={y+bs*0.41} r={bs*0.03} fill="white"/>
              <circle cx={x+bs*0.66} cy={y+bs*0.41} r={bs*0.03} fill="white"/>
              {/* eyebrows */}
              <path d={`M${x+bs*0.22},${y+bs*0.31} Q${x+bs*0.33},${y+bs*0.26} ${x+bs*0.44},${y+bs*0.31}`} stroke="#333" strokeWidth={1.4} fill="none" strokeLinecap="round"/>
              <path d={`M${x+bs*0.56},${y+bs*0.31} Q${x+bs*0.67},${y+bs*0.26} ${x+bs*0.78},${y+bs*0.31}`} stroke="#333" strokeWidth={1.4} fill="none" strokeLinecap="round"/>
              {/* mouth */}
              <path d={`M${x+bs*0.32},${y+bs*0.64} Q${x+bs*0.5},${y+bs*0.76} ${x+bs*0.68},${y+bs*0.64}`} stroke="#333" strokeWidth={1.5} fill="none" strokeLinecap="round"/>
              {/* cheeks */}
              <circle cx={x+bs*0.2} cy={y+bs*0.58} r={bs*0.08} fill="rgba(255,150,150,.45)"/>
              <circle cx={x+bs*0.8} cy={y+bs*0.58} r={bs*0.08} fill="rgba(255,150,150,.45)"/>
              {/* shades for 6 */}
              {hasShades && <>
                <rect x={x+bs*0.2} y={y+bs*0.37} width={bs*0.25} height={bs*0.16} rx={bs*0.05} fill="#111" opacity={0.85}/>
                <rect x={x+bs*0.55} y={y+bs*0.37} width={bs*0.25} height={bs*0.16} rx={bs*0.05} fill="#111" opacity={0.85}/>
                <line x1={x+bs*0.45} y1={y+bs*0.44} x2={x+bs*0.55} y2={y+bs*0.44} stroke="#111" strokeWidth={1}/>
              </>}
              {/* bowtie for 3 */}
              {hasBowtie && <>
                <polygon points={`${x+bs*0.35},${y+bs*0.82} ${x+bs*0.5},${y+bs*0.88} ${x+bs*0.65},${y+bs*0.82} ${x+bs*0.5},${y+bs*0.76}`} fill="#FF4136"/>
                <circle cx={x+bs*0.5} cy={y+bs*0.82} r={bs*0.04} fill="#CC0000"/>
              </>}
            </>}
          </g>
        );
      })}

      {/* arms — gloves for 5 & 10, stubs otherwise */}
      {(num===5||num===10) ? <>
        <ellipse cx={ox-6} cy={oy+bs*0.5} rx={8} ry={6} fill="white" stroke={c} strokeWidth={1.5}/>
        <ellipse cx={ox+tw+6} cy={oy+bs*0.5} rx={8} ry={6} fill="white" stroke={c} strokeWidth={1.5}/>
      </> : <>
        <rect x={ox-5} y={oy+bs*0.35} width={6} height={bs*0.3} rx={3} fill={c} stroke="rgba(0,0,0,.2)" strokeWidth={1}/>
        <rect x={ox+tw-1} y={oy+bs*0.35} width={6} height={bs*0.3} rx={3} fill={c} stroke="rgba(0,0,0,.2)" strokeWidth={1}/>
      </>}

      {/* crown for 10 */}
      {hasCrown && <>
        <rect x={ox+tw*0.2} y={oy-10} width={tw*0.6} height={10} fill="#FFD700"/>
        <polygon points={`${ox+tw*0.2},${oy} ${ox+tw*0.33},${oy-14} ${ox+tw*0.5},${oy-8} ${ox+tw*0.67},${oy-14} ${ox+tw*0.8},${oy}`} fill="#FFD700" stroke="#FFA000" strokeWidth={1}/>
        <circle cx={ox+tw*0.33} cy={oy-14} r={2.5} fill="#FF4136"/>
        <circle cx={ox+tw*0.5} cy={oy-8} r={2} fill="#2ECC40"/>
        <circle cx={ox+tw*0.67} cy={oy-14} r={2.5} fill="#0074D9"/>
      </>}

      {/* cape for 5 */}
      {hasSuperCape && <>
        <path d={`M${ox+tw*0.15},${oy+bs*0.3} Q${ox-8},${oy+bs*1.2} ${ox+tw*0.1},${oy+th+5}`} fill="#FF4136" stroke="#CC0000" strokeWidth={1}/>
        <path d={`M${ox+tw*0.85},${oy+bs*0.3} Q${ox+tw+8},${oy+bs*1.2} ${ox+tw*0.9},${oy+th+5}`} fill="#FF4136" stroke="#CC0000" strokeWidth={1}/>
      </>}

      {/* numberling badge */}
      <circle cx={50} cy={oy-6} r={9} fill="rgba(0,0,0,.5)" stroke="rgba(255,255,255,.3)" strokeWidth={1}/>
      <text x={50} y={oy-2} textAnchor="middle" fontSize={10} fill="white" fontWeight="900" fontFamily="Nunito,sans-serif">{num}</text>

      {/* feet */}
      <rect x={ox+tw*0.15} y={oy+th} width={tw*0.28} height={8} rx={4} fill={c} stroke="rgba(0,0,0,.2)" strokeWidth={1}/>
      <rect x={ox+tw*0.57} y={oy+th} width={tw*0.28} height={8} rx={4} fill={c} stroke="rgba(0,0,0,.2)" strokeWidth={1}/>
    </svg>
  );
}

// Thomas-style trains: each has a distinct face window color, body color,
// chimney style, and unique detail (number on front, shape of cab, etc.)
function PortraitTrain({ name, bodyColor, cabinColor, windowBg="#FFFDE7", eyeExpr="happy", chimneyW=10, numColor="#FFD700", numBg="rgba(0,0,0,.4)", smokeColor="#CFD8DC", hasBuffer=true, roofStripe=null, size=100 }) {
  // expr: happy / grumpy / cheeky / worried
  const brow = eyeExpr==="grumpy" ? -4 : eyeExpr==="worried" ? 3 : 0;
  const browL = eyeExpr==="grumpy" ? [30,39,6] : eyeExpr==="cheeky" ? [30,36,-3] : [30,37,0];
  const browR = eyeExpr==="grumpy" ? [54,39,-6] : eyeExpr==="cheeky" ? [54,36,3] : [54,37,0];
  const mouthPath = eyeExpr==="grumpy"
    ? "M36,60 Q50,55 64,60"
    : eyeExpr==="worried"
    ? "M38,60 Q50,55 62,60"
    : "M37,58 Q50,67 63,58";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* rails */}
      <rect x={2} y={88} width={96} height={3} rx={1.5} fill="#5D4037"/>
      <rect x={2} y={92} width={96} height={3} rx={1.5} fill="#5D4037"/>
      {[10,24,38,52,66,80].map(x=><rect key={x} x={x} y={87} width={8} height={9} rx={1} fill="#795548"/>)}

      {/* smoke puffs */}
      {[{cx:50,cy:12,r:7},{cx:44,cy:6,r:5},{cx:56,cy:5,r:4},{cx:49,cy:1,r:3}].map((p,i)=>(
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={smokeColor} opacity={0.8-i*0.1}/>
      ))}

      {/* chimney */}
      <rect x={50-chimneyW/2} y={21} width={chimneyW} height={14} rx={2} fill={bodyColor}/>
      <rect x={50-chimneyW/2-2} y={21} width={chimneyW+4} height={4} rx={2} fill={cabinColor||bodyColor}/>

      {/* boiler / main body */}
      <rect x={6} y={55} width={88} height={30} rx={6} fill={bodyColor}/>
      <rect x={6} y={55} width={88} height={10} rx={5} fill="rgba(255,255,255,.12)"/>
      {/* boiler dome */}
      <ellipse cx={68} cy={55} rx={12} ry={9} fill={cabinColor||bodyColor}/>

      {/* cab */}
      <rect x={14} y={30} width={58} height={30} rx={8} fill={bodyColor}/>
      {roofStripe && <rect x={14} y={30} width={58} height={7} rx={5} fill={roofStripe}/>}
      {/* cab highlight */}
      <rect x={14} y={30} width={58} height={6} rx={5} fill="rgba(255,255,255,.18)"/>

      {/* face window */}
      <rect x={20} y={33} width={46} height={30} rx={7} fill={windowBg}/>
      <rect x={20} y={33} width={46} height={9} rx={5} fill="rgba(255,255,255,.4)"/>

      {/* eyes */}
      <ellipse cx={37} cy={48} rx={8} ry={9} fill="white" stroke="#222" strokeWidth={1.5}/>
      <circle cx={38.5} cy={49} r={4} fill="#111"/>
      <circle cx={37} cy={46} r={1.5} fill="white"/>
      <ellipse cx={57} cy={48} rx={8} ry={9} fill="white" stroke="#222" strokeWidth={1.5}/>
      <circle cx={58.5} cy={49} r={4} fill="#111"/>
      <circle cx={57} cy={46} r={1.5} fill="white"/>

      {/* eyebrows */}
      <path d={`M${browL[0]},${browL[1]} Q${browL[0]+7},${browL[1]+browL[2]} ${browL[0]+14},${browL[1]}`} stroke="#5D4037" strokeWidth={2.2} fill="none" strokeLinecap="round"/>
      <path d={`M${browR[0]},${browR[1]} Q${browR[0]+7},${browR[1]+browR[2]} ${browR[0]+14},${browR[1]}`} stroke="#5D4037" strokeWidth={2.2} fill="none" strokeLinecap="round"/>

      {/* cheeks */}
      <circle cx={26} cy={55} r={5} fill="rgba(255,120,120,.4)"/>
      <circle cx={68} cy={55} r={5} fill="rgba(255,120,120,.4)"/>

      {/* mouth */}
      <path d={mouthPath} stroke="#5D4037" strokeWidth={2} fill="none" strokeLinecap="round"/>

      {/* name plate on front */}
      <rect x={72} y={58} width={20} height={10} rx={3} fill={numBg}/>
      <text x={82} y={66} textAnchor="middle" fontSize={5.5} fill={numColor} fontWeight="900" fontFamily="Nunito,sans-serif">{name.slice(0,6)}</text>

      {/* buffers */}
      {hasBuffer && <>
        <rect x={3} y={68} width={5} height={8} rx={2} fill="#888"/>
        <rect x={92} y={68} width={5} height={8} rx={2} fill="#888"/>
      </>}

      {/* wheels — big drive wheel in middle */}
      {[18,50,82].map((cx,i)=>{
        const r = i===1?10:7;
        return(<g key={i}>
          <circle cx={cx} cy={87} r={r} fill="#2b2b2b" stroke="#555" strokeWidth={1.5}/>
          <circle cx={cx} cy={87} r={r*0.5} fill="#444"/>
          <circle cx={cx} cy={87} r={r*0.2} fill="#888"/>
          {/* spokes */}
          {[0,60,120,180,240,300].map(a=>(
            <line key={a} x1={cx} y1={87} x2={cx+Math.cos(a*Math.PI/180)*r*0.85} y2={87+Math.sin(a*Math.PI/180)*r*0.85} stroke="#666" strokeWidth={0.8}/>
          ))}
        </g>);
      })}

      {/* connecting rod between wheels */}
      <rect x={18} y={85} width={64} height={3} rx={1.5} fill="#555" opacity={0.6}/>
    </svg>
  );
}

// Sprunki characters: round colorful blob creatures with big heads,
// stubby legs, expressive faces and unique accessories
function PortraitSprunkiChar({ bodyColor, headColor, eyeColor="#111", accentColor, size=100,
  hasHat=false, hatColor="#222", hatBrim=false,
  hasAntenna=false, hasMask=false, maskColor="#000",
  mouthShape="smile", // smile | open | zigzag | small
  leftItem=null, rightItem=null, // "mic"|"drum"|"note"|"hand"
  eyeShape="round", // round | oval | star
  spots=[], stripes=false, glow=false,
}) {
  const mouthD = mouthShape==="open"
    ? "M39,60 Q50,70 61,60 Q50,72 39,60Z"
    : mouthShape==="zigzag"
    ? "M36,60 L41,55 L46,60 L51,55 L56,60 L61,55 L66,60"
    : mouthShape==="small"
    ? "M43,60 Q50,65 57,60"
    : "M37,59 Q50,70 63,59";

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* glow bg */}
      {glow && <circle cx={50} cy={50} r={44} fill={accentColor} opacity={0.12}/>}

      {/* BODY */}
      <ellipse cx={50} cy={76} rx={24} ry={20} fill={bodyColor}/>
      <ellipse cx={50} cy={70} rx={26} ry={22} fill={bodyColor}/>
      {stripes && [0,1,2].map(i=>(
        <ellipse key={i} cx={50} cy={67+i*5} rx={26-i*4} ry={3} fill={accentColor} opacity={0.2}/>
      ))}
      {/* body shine */}
      <ellipse cx={40} cy={63} rx={8} ry={5} fill="rgba(255,255,255,.18)" transform="rotate(-20,40,63)"/>

      {/* LEFT ARM */}
      <path d={`M26,68 Q14,65 ${leftItem?"10,75":"12,80"}`} stroke={bodyColor} strokeWidth={9} strokeLinecap="round" fill="none"/>
      {leftItem==="drum" && <ellipse cx={9} cy={80} rx={10} ry={7} fill="#8D6E63" stroke="#5D4037" strokeWidth={1.5}/>}
      {leftItem==="hand" && <circle cx={10} cy={80} r={7} fill={headColor}/>}
      {!leftItem && <circle cx={12} cy={80} r={6} fill={headColor}/>}

      {/* RIGHT ARM */}
      <path d={`M74,68 Q86,65 ${rightItem?"90,75":"88,80"}`} stroke={bodyColor} strokeWidth={9} strokeLinecap="round" fill="none"/>
      {rightItem==="mic" && <><rect x={87} y={68} width={8} height={14} rx={4} fill="#bbb"/><circle cx={91} cy={67} r={5} fill="#999"/></>}
      {rightItem==="note" && <text x={84} y={76} fontSize={16} fill={accentColor} fontWeight="900">♪</text>}
      {rightItem==="hand" && <circle cx={90} cy={80} r={7} fill={headColor}/>}
      {!rightItem && <circle cx={88} cy={80} r={6} fill={headColor}/>}

      {/* LEGS */}
      <ellipse cx={38} cy={93} rx={10} ry={6} fill={bodyColor}/>
      <ellipse cx={62} cy={93} rx={10} ry={6} fill={bodyColor}/>
      {/* feet */}
      <ellipse cx={36} cy={96} rx={9} ry={4} fill={headColor}/>
      <ellipse cx={64} cy={96} rx={9} ry={4} fill={headColor}/>

      {/* HEAD */}
      <circle cx={50} cy={42} r={30} fill={headColor}/>
      {/* head shine */}
      <ellipse cx={38} cy={28} rx={10} ry={7} fill="rgba(255,255,255,.28)" transform="rotate(-20,38,28)"/>

      {/* spots on head */}
      {spots.map((sp,i)=><circle key={i} cx={sp[0]} cy={sp[1]} r={sp[2]||4} fill={accentColor} opacity={0.5}/>)}

      {/* MASK */}
      {hasMask && <>
        <rect x={26} y={35} width={48} height={22} rx={8} fill={maskColor} opacity={0.85}/>
        <rect x={26} y={35} width={48} height={8} rx={6} fill="rgba(255,255,255,.1)"/>
        {/* mask eye holes */}
        <ellipse cx={39} cy={44} rx={7} ry={7} fill="rgba(0,0,0,.6)"/>
        <ellipse cx={61} cy={44} rx={7} ry={7} fill="rgba(0,0,0,.6)"/>
      </>}

      {/* EYES */}
      {!hasMask && <>
        {eyeShape==="oval" ? <>
          <ellipse cx={38} cy={44} rx={9} ry={10} fill="white" stroke="#222" strokeWidth={1.5}/>
          <ellipse cx={62} cy={44} rx={9} ry={10} fill="white" stroke="#222" strokeWidth={1.5}/>
        </> : <>
          <circle cx={38} cy={44} r={10} fill="white" stroke="#222" strokeWidth={1.5}/>
          <circle cx={62} cy={44} r={10} fill="white" stroke="#222" strokeWidth={1.5}/>
        </>}
        {/* irises */}
        <circle cx={39.5} cy={45} r={5.5} fill={eyeColor}/>
        <circle cx={63.5} cy={45} r={5.5} fill={eyeColor}/>
        {/* pupils */}
        <circle cx={39.5} cy={45} r={2.5} fill="#111"/>
        <circle cx={63.5} cy={45} r={2.5} fill="#111"/>
        {/* shines */}
        <circle cx={37.5} cy={42} r={2} fill="white"/>
        <circle cx={61.5} cy={42} r={2} fill="white"/>
        {/* eyebrows */}
        <path d="M29,34 Q38,29 47,34" stroke="#555" strokeWidth={2} fill="none" strokeLinecap="round"/>
        <path d="M53,34 Q62,29 71,34" stroke="#555" strokeWidth={2} fill="none" strokeLinecap="round"/>
      </>}

      {/* CHEEKS */}
      <circle cx={24} cy={54} r={7} fill={accentColor} opacity={0.35}/>
      <circle cx={76} cy={54} r={7} fill={accentColor} opacity={0.35}/>

      {/* MOUTH */}
      <path d={mouthD} stroke="#555" strokeWidth={2} fill={mouthShape==="open"?"rgba(200,100,100,.6)":"none"} strokeLinecap="round" strokeLinejoin="round"/>

      {/* ANTENNA */}
      {hasAntenna && <>
        <line x1={50} y1={13} x2={50} y2={2} stroke="#888" strokeWidth={2}/>
        <circle cx={50} cy={2} r={3} fill={accentColor}/>
      </>}

      {/* HAT */}
      {hasHat && <>
        {hatBrim && <ellipse cx={50} cy={18} rx={28} ry={7} fill={hatColor}/>}
        <rect x={32} y={2} width={36} height={18} rx={5} fill={hatColor}/>
        {/* hat band */}
        <rect x={32} y={15} width={36} height={5} rx={2} fill={accentColor} opacity={0.7}/>
        {/* hat shine */}
        <rect x={35} y={4} width={14} height={5} rx={3} fill="rgba(255,255,255,.18)"/>
      </>}
    </svg>
  );
}

function PortraitEmojiCard({ emoji, size=90 }) {
  const fontSize = Math.round(size * 0.62);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <radialGradient id={`emojiGlow${emoji.codePointAt(0)}`} cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="#FFE082" stopOpacity="0.28"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill={`url(#emojiGlow${emoji.codePointAt(0)})`} stroke="rgba(255,255,255,.7)" strokeWidth="3"/>
      <text x="50" y="58" textAnchor="middle" dominantBaseline="middle" fontSize={fontSize}>{emoji}</text>
    </svg>
  );
}

// ── Card data with portrait renderer ─────────────────
const ALL_CARDS = [
  // ── Numberblocks
  { id:"nb1",  series:"numberblocks", name:"Uno",    bg:"#FF4136", desc:"¡El primero de todos!",        rare:false, portrait:(s)=><PortraitNumberblock num={1}  size={s}/>,
    praise:["¡UNO es pequeño pero increíblemente valiente! 🌟","¡Todo comienza con el UNO! Sin ti nada existiría 💪","¡Eres tan especial como el número 1, único en el mundo! 🏆","¡Uno demuestra que uno solo puede lograr cosas grandes! ✨"] },
  { id:"nb2",  series:"numberblocks", name:"Dos",    bg:"#FF8C00", desc:"¡Doble poder naranja!",         rare:false, portrait:(s)=><PortraitNumberblock num={2}  size={s}/>,
    praise:["¡DOS sabe que juntos somos más fuertes! 🤝","¡Dos veces la diversión, dos veces la alegría! 🎉","¡Dos es el maestro de los pares, siempre listo para compartir! 💛","¡Con Dos aprendes que ayudar a los demás es lo mejor! 🌈"] },
  { id:"nb3",  series:"numberblocks", name:"Tres",  bg:"#FFD700", desc:"¡Tres con moñito!",             rare:false, portrait:(s)=><PortraitNumberblock num={3}  size={s}/>,
    praise:["¡TRES brilla como el sol con su moñito dorado! ☀️","¡Tres es el número mágico y Tres lo sabe! ✨","¡Tres demuestra que la creatividad no tiene límites! 🎨","¡Con Tres la fiesta siempre es más divertida! 🎊"] },
  { id:"nb4",  series:"numberblocks", name:"Cuatro",   bg:"#2ECC40", desc:"¡Cuadrado perfecto!",           rare:false, portrait:(s)=><PortraitNumberblock num={4}  size={s}/>,
    praise:["¡CUATRO es el cuadrado perfecto, siempre equilibrado! ⚖️","¡Cuatro tiene cuatro lados y cuatro razones para sonreír! 😄","¡Cuatro esquinas, cuatro superpoderes! 💚","¡Cuatro demuestra que la simetría es hermosa! 🔷"] },
  { id:"nb5",  series:"numberblocks", name:"Cinco",   bg:"#0074D9", desc:"¡El superhéroe con capa!",      rare:false, portrait:(s)=><PortraitNumberblock num={5}  size={s}/>,
    praise:["¡CINCO es el superhéroe de los Numberblocks! 🦸","¡Con su capa roja, Cinco vuela hacia la aventura! 🚀","¡Cinco dedos, cinco estrellas, CINCO es fantástico! ⭐","¡Cinco nos enseña que todos podemos ser héroes! 💙"] },
  { id:"nb6",  series:"numberblocks", name:"Seis",    bg:"#9B59B6", desc:"¡Seis con lentes cool!",        rare:false, portrait:(s)=><PortraitNumberblock num={6}  size={s}/>,
    praise:["¡SEIS es el más entretenido con sus lentes de sol! 😎","¡Seis lados tiene un hexágono y Seis lo ama! 🔷","¡Seis demuestra que aprender es muy entretenido! 💜","¡Con Seis cada problema tiene una solución creativa! 🌟"] },
  { id:"nb7",  series:"numberblocks", name:"Siete",  bg:"#FF69B4", desc:"¡El de los arcoíris!",          rare:true,  portrait:(s)=><PortraitNumberblock num={7}  size={s}/>,
    praise:["¡SIETE tiene los colores del arcoíris! 🌈","¡Siete colores, siete maravillas, SIETE es mágico! ✨","¡Siete nos recuerda que la vida es más bella en colores! 💖","¡Con Siete cada día es una nueva aventura arcoíris! 🎨"] },
  { id:"nb8",  series:"numberblocks", name:"Ocho",  bg:"#00CED1", desc:"¡Cubo turquesa poderoso!",      rare:true,  portrait:(s)=><PortraitNumberblock num={8}  size={s}/>,
    praise:["¡OCHO es el cubo más poderoso de todos! 💪","¡Ocho brazos como un pulpo, Ocho abraza a todos! 🐙","¡Ocho demuestra que la perseverancia da frutos! 🏆","¡Con Ocho nada es imposible, ¡todo es posible! 🌊"] },
  { id:"nb9",  series:"numberblocks", name:"Nueve",   bg:"#FF6347", desc:"¡Casi diez, casi perfecto!",    rare:true,  portrait:(s)=><PortraitNumberblock num={9}  size={s}/>,
    praise:["¡NUEVE está a un pasito de la perfección! 🌟","¡Nueve vidas tiene un gato y Nueve tiene nueve talentos! 🐱","¡Nueve nos enseña que casi llegar también es lograr! 💫","¡Con Nueve la sabiduría llega antes del diez! 🧠"] },
  { id:"nb10", series:"numberblocks", name:"Diez",    bg:"#DAA520", desc:"¡El gran Diez con corona!",     rare:true,  portrait:(s)=><PortraitNumberblock num={10} size={s}/>,
    praise:["¡DIEZ es el rey de los Numberblocks con su corona dorada! 👑","¡Diez, el número perfecto, y DIEZ lo sabe! ✨","¡Diez nos enseña que con esfuerzo se llega a lo más alto! 🏆","¡Con DIEZ se completa la primera familia de Numberblocks! 🎉"] },
  // ── Thomas
  { id:"th1",  series:"thomas", name:"Thomas",  bg:"#1565C0", desc:"¡La locomotora azul más famosa!",  rare:false, portrait:(s)=><PortraitTrain name="Thomas"  bodyColor="#1565C0" cabinColor="#0D47A1" windowBg="#FFFDE7" eyeExpr="happy"   smokeColor="#CFD8DC" roofStripe="#FFD700" size={s}/>,
    praise:["¡THOMAS es el tren más valiente y amigable! 🚂","¡Thomas siempre ayuda a sus amigos sin dudar! 💙","¡El tren azul más famoso del mundo, ¡ese eres tú también! ⭐","¡Thomas nos enseña que con esfuerzo llegas a cualquier destino! 🌟"] },
  { id:"th2",  series:"thomas", name:"Percy",   bg:"#2E7D32", desc:"¡El mejor amigo de Thomas!",       rare:false, portrait:(s)=><PortraitTrain name="Percy"   bodyColor="#388E3C" cabinColor="#2E7D32" windowBg="#F1F8E9" eyeExpr="happy"   smokeColor="#C8E6C9" size={s}/>,
    praise:["¡PERCY es el mejor amigo que cualquiera quisiera tener! 💚","¡Verde y lleno de energía, Percy nunca se rinde! 🌿","¡Percy nos demuestra que la lealtad es el tesoro más grande! 🤝","¡Con Percy aprendes que los mejores amigos están siempre! 🌈"] },
  { id:"th3",  series:"thomas", name:"Gordon",  bg:"#0D47A1", desc:"¡El tren más veloz!",               rare:false, portrait:(s)=><PortraitTrain name="Gordon"  bodyColor="#0D47A1" cabinColor="#1565C0" windowBg="#E3F2FD" eyeExpr="grumpy"  smokeColor="#BBDEFB" chimneyW={13} size={s}/>,
    praise:["¡GORDON es el tren más rápido y orgulloso de Sodor! 💨","¡Aunque parece serio, Gordon tiene un gran corazón! 💙","¡Gordon nos enseña que hay que dar siempre lo mejor! 🏆","¡El Express azul más veloz del mundo! ¡Whoooosh! 🚄"] },
  { id:"th4",  series:"thomas", name:"James",   bg:"#C62828", desc:"¡Rojo y muy orgulloso!",            rare:false, portrait:(s)=><PortraitTrain name="James"   bodyColor="#C62828" cabinColor="#B71C1C" windowBg="#FFF9C4" eyeExpr="cheeky"  smokeColor="#FFCDD2" roofStripe="#111" size={s}/>,
    praise:["¡JAMES brilla como un rubí en los rieles! 💎","¡Rojo y brillante, James siempre está listo para la acción! ❤️","¡James nos enseña que el orgullo se gana con trabajo! 🌟","¡El tren más elegante de toda la Isla de Sodor! 🎩"] },
  { id:"th5",  series:"thomas", name:"Edward",  bg:"#1976D2", desc:"¡El tren más sabio!",               rare:false, portrait:(s)=><PortraitTrain name="Edward"  bodyColor="#1976D2" cabinColor="#1565C0" windowBg="#E8EAF6" eyeExpr="happy"   smokeColor="#BBDEFB" size={s}/>,
    praise:["¡EDWARD es el más sabio y siempre da buenos consejos! 🎓","¡Con experiencia y bondad, Edward es un modelo a seguir! 💙","¡Edward nos enseña que la experiencia vale mucho! 🌟","¡El tren más gentil y amable de Sodor te desea lo mejor! 🤗"] },
  { id:"th6",  series:"thomas", name:"Henry",   bg:"#388E3C", desc:"¡Verde y muy poderoso!",            rare:false, portrait:(s)=><PortraitTrain name="Henry"   bodyColor="#2E7D32" cabinColor="#1B5E20" windowBg="#F9FBE7" eyeExpr="worried" smokeColor="#DCEDC8" chimneyW={12} size={s}/>,
    praise:["¡HENRY supera sus miedos cada día y es muy valiente! 💚","¡Verde como los bosques que tanto ama, Henry es especial! 🌲","¡Henry nos enseña que superar los obstáculos nos hace más fuertes! 💪","¡El tren más sensible de Sodor tiene el corazón más grande! 💖"] },
  { id:"th7",  series:"thomas", name:"Toby",    bg:"#6D4C41", desc:"¡El tranvía amigable!",              rare:true,  portrait:(s)=><PortraitTrain name="Toby"    bodyColor="#6D4C41" cabinColor="#5D4037" windowBg="#FFF8E1" eyeExpr="happy"   smokeColor="#D7CCC8" size={s}/>,
    praise:["¡TOBY es el tranvía más querido y amable! 🚃","¡Toby nos enseña que ser diferente es algo hermoso! 🌟","¡Con Toby aprendes que la amabilidad abre todas las puertas! 🚪","¡El viejo tranvía con el corazón más joven de todos! ❤️"] },
  { id:"th8",  series:"thomas", name:"Emily",   bg:"#00695C", desc:"¡La locomotora esmeralda!",          rare:true,  portrait:(s)=><PortraitTrain name="Emily"   bodyColor="#00695C" cabinColor="#004D40" windowBg="#E0F2F1" eyeExpr="happy"   smokeColor="#B2DFDB" roofStripe="#F48FB1" size={s}/>,
    praise:["¡EMILY es la locomotora más elegante y valiente! 💚","¡Esmeralda y brillante, Emily demuestra que las chicas son increíbles! 👑","¡Emily nos enseña que la determinación mueve montañas! ⛰️","¡La locomotora más hermosa con el espíritu más fuerte! 🌺"] },
  { id:"th9",  series:"thomas", name:"Diesel",  bg:"#37474F", desc:"¡El misterioso diesel!",             rare:true,  portrait:(s)=><PortraitTrain name="Diesel"  bodyColor="#37474F" cabinColor="#263238" windowBg="#ECEFF1" eyeExpr="grumpy"  smokeColor="#90A4AE" hasBuffer={false} size={s}/>,
    praise:["¡DIESEL guarda el misterio de los rieles oscuros! 🌙","¡Aunque parece serio, Diesel tiene sus propias virtudes! ⚡","¡Diesel nos enseña que todos merecemos una segunda oportunidad! 🌟","¡El tren más misterioso esconde una historia fascinante! 🔍"] },
  { id:"th10", series:"thomas", name:"Spencer", bg:"#757575", desc:"¡El plateado del Duque!",            rare:true,  portrait:(s)=><PortraitTrain name="Spencer" bodyColor="#9E9E9E" cabinColor="#757575" windowBg="#FAFAFA" eyeExpr="cheeky"  smokeColor="#EEEEEE" numColor="#DAA520" chimneyW={14} size={s}/>,
    praise:["¡SPENCER brilla como la plata bajo el sol! ✨","¡El tren del Duque viaja con elegancia y velocidad! 💨","¡Spencer nos enseña que la confianza viene del trabajo duro! 💪","¡Plateado y veloz, Spencer es único en todo Sodor! 🏅"] },
  // ── Sprunki
  { id:"sp1",  series:"sprunki", name:"Tunner",  bg:"#E65100", desc:"¡El beatboxer naranja!",      rare:false, portrait:(s)=><PortraitSprunkiChar bodyColor="#E65100" headColor="#FFCC80" accentColor="#FF6D00" eyeColor="#4E342E" mouthShape="open"   leftItem="drum"  rightItem="hand"  size={s}/>,
    praise:["¡TUNNER lleva el ritmo en su corazón naranja! 🥁","¡Con Tunner la música nunca para y la alegría tampoco! 🎶","¡Tunner nos enseña que el ritmo es el lenguaje del alma! 🌟","¡El mejor beatboxer del universo Sprunki te saluda! 🎵"] },
  { id:"sp2",  series:"sprunki", name:"Clukr",   bg:"#F57F17", desc:"¡Crea el ritmo base!",        rare:false, portrait:(s)=><PortraitSprunkiChar bodyColor="#F9A825" headColor="#FFFDE7" accentColor="#FFD600" eyeColor="#5D4037" mouthShape="smile"  spots={[[35,28,5],[65,25,4]]} size={s}/>,
    praise:["¡CLUKR pone los cimientos de toda gran música! 🎼","¡Amarillo como el sol, Clukr ilumina cada canción! ☀️","¡Clukr nos enseña que una buena base lo hace todo posible! 🏗️","¡El más alegre del grupo, Clukr siempre tiene una sonrisa! 😄"] },
  { id:"sp3",  series:"sprunki", name:"Brud",    bg:"#1B5E20", desc:"¡Maestro del bajo verde!",    rare:false, portrait:(s)=><PortraitSprunkiChar bodyColor="#2E7D32" headColor="#A5D6A7" accentColor="#69F0AE" eyeColor="#1B5E20" mouthShape="smile"  rightItem="note" stripes size={s}/>,
    praise:["¡BRUD hace vibrar el suelo con su bajo increíble! 🎸","¡Verde como la naturaleza, Brud es sereno y poderoso! 🌿","¡Brud nos enseña que los mejores músicos escuchan antes de tocar! 👂","¡El maestro del bajo más cool que hayas visto! 🎵"] },
  { id:"sp4",  series:"sprunki", name:"Sky",     bg:"#0D47A1", desc:"¡Melodías del cielo!",         rare:false, portrait:(s)=><PortraitSprunkiChar bodyColor="#1565C0" headColor="#BBDEFB" accentColor="#40C4FF" eyeColor="#0D47A1" mouthShape="smile"  rightItem="mic"  hasAntenna size={s}/>,
    praise:["¡SKY lleva sus melodías hasta las nubes! ☁️","¡Azul como el cielo, Sky sueña sin límites! 🌤️","¡Sky nos enseña que la imaginación vuela más alto que cualquier avión! ✈️","¡Con Sky cada nota musical es una pequeña maravilla! 🎤"] },
  { id:"sp5",  series:"sprunki", name:"Raddy",   bg:"#B71C1C", desc:"¡Ritmos rojos explosivos!",   rare:false, portrait:(s)=><PortraitSprunkiChar bodyColor="#C62828" headColor="#FFCDD2" accentColor="#FF5252" eyeColor="#B71C1C" mouthShape="open"   glow size={s}/>,
    praise:["¡RADDY explota de energía y pasión musical! 🔴","¡Rojo fuego, Raddy enciende cada actuación! 🔥","¡Raddy nos enseña que la pasión hace la diferencia! ❤️","¡El más enérgico del grupo, ¡Raddy nunca para! ⚡"] },
  { id:"sp6",  series:"sprunki", name:"Vineria", bg:"#4A148C", desc:"¡Vibraciones moradas!",        rare:false, portrait:(s)=><PortraitSprunkiChar bodyColor="#6A1B9A" headColor="#E1BEE7" accentColor="#CE93D8" eyeColor="#4A148C" mouthShape="small"  hasHat hatColor="#1A237E" hatBrim leftItem="hand" size={s}/>,
    praise:["¡VINERIA es mística y llena de sabiduría musical! 🔮","¡Morada como la magia, Vineria hace lo imposible posible! ✨","¡Vineria nos enseña que la creatividad no tiene límites! 🌙","¡La más enigmática de los Sprunki con el talento más especial! 💜"] },
  { id:"sp7",  series:"sprunki", name:"Wintuk",  bg:"#455A64", desc:"¡El fantasma musical!",        rare:true,  portrait:(s)=><PortraitSprunkiChar bodyColor="#546E7A" headColor="#ECEFF1" accentColor="#B0BEC5" eyeColor="#37474F" mouthShape="small"  eyeShape="oval" hasHat hatColor="#263238" hatBrim spots={[[50,20,6],[30,32,3],[70,30,3]]} size={s}/>,
    praise:["¡WINTUK aparece cuando la música lo llama! 👻","¡Misterioso pero inofensivo, Wintuk es fascinante! 🌫️","¡Wintuk nos enseña que lo diferente puede ser lo más hermoso! 🌟","¡El fantasma musical más amable del universo Sprunki! 💫"] },
  { id:"sp8",  series:"sprunki", name:"Garnold", bg:"#3E2723", desc:"¡Maestro del groove!",         rare:true,  portrait:(s)=><PortraitSprunkiChar bodyColor="#4E342E" headColor="#BCAAA4" accentColor="#A1887F" eyeColor="#3E2723" mouthShape="smile"  leftItem="drum" stripes size={s}/>,
    praise:["¡GARNOLD tiene el groove más profundo del universo! 🎷","¡Con Garnold cada canción se convierte en una obra maestra! 🎼","¡Garnold nos enseña que la constancia crea grandes artistas! 💪","¡El maestro de maestros, Garnold hace bailar a todos! 🕺"] },
  { id:"sp9",  series:"sprunki", name:"Mr.Fun",  bg:"#880E4F", desc:"¡Diversión sin límites!",      rare:true,  portrait:(s)=><PortraitSprunkiChar bodyColor="#AD1457" headColor="#FCE4EC" accentColor="#F48FB1" eyeColor="#880E4F" mouthShape="zigzag" hasHat hatColor="#4A148C" hatBrim rightItem="mic" glow size={s}/>,
    praise:["¡MR.FUN convierte cada momento en una fiesta! 🎪","¡Con Mr.Fun la diversión nunca termina! 🎉","¡Mr.Fun nos enseña que reír es la mejor medicina! 😂","¡El alma de la fiesta Sprunki, ¡siempre listo para divertirse! 🎭"] },
  { id:"sp10", series:"sprunki", name:"Oren",    bg:"#E65100", desc:"¡La estrella dorada!",         rare:true,  portrait:(s)=><PortraitSprunkiChar bodyColor="#FF6F00" headColor="#FFE082" accentColor="#FFD600" eyeColor="#E65100" mouthShape="open"   hasHat hatColor="#BF360C" rightItem="note" spots={[[50,18,7],[30,28,4],[70,26,4]]} glow size={s}/>,
    praise:["¡OREN brilla más que cualquier estrella del cielo! ⭐","¡Dorado como el sol, Oren ilumina todo a su alrededor! ☀️","¡Oren nos enseña que todos llevamos una estrella dentro! 💫","¡La carta más rara y más especial, ¡como tú! 🏆"] },
  // ── Damigotchi: cartas educativas frecuentes
  { id:"dg1",  series:"damigotchi", name:"Sol Feliz",         bg:"#FFB300", desc:"Una carta brillante y alegre.",       rare:false, portrait:(s)=><PortraitEmojiCard emoji="☀️" size={s}/>, praise:["¡El Sol Feliz ilumina tu aprendizaje! ☀️","¡Hoy brillaste con mucha energía! 🌟"] },
  { id:"dg2",  series:"damigotchi", name:"Luna Dormilona",    bg:"#5E35B1", desc:"Duerme tranquila entre estrellas.",   rare:false, portrait:(s)=><PortraitEmojiCard emoji="🌙" size={s}/>, praise:["¡La Luna Dormilona te cuida mientras descansas! 😴","¡Aprender también necesita descanso! 🌙"] },
  { id:"dg3",  series:"damigotchi", name:"Gatito Curioso",    bg:"#FF7043", desc:"Siempre pregunta y descubre.",       rare:false, portrait:(s)=><PortraitEmojiCard emoji="🐱" size={s}/>, praise:["¡El Gatito Curioso ama aprender contigo! 🐱","¡Preguntar es una gran forma de crecer! 💡"] },
  { id:"dg4",  series:"damigotchi", name:"Perrito Juguetón",  bg:"#795548", desc:"Corre feliz por nuevas aventuras.",  rare:false, portrait:(s)=><PortraitEmojiCard emoji="🐶" size={s}/>, praise:["¡El Perrito Juguetón celebra tus aciertos! 🐶","¡Jugar y aprender van de la mano! 🎮"] },
  { id:"dg5",  series:"damigotchi", name:"Estrella Mágica",   bg:"#FFD700", desc:"Una estrella para campeones.",       rare:false, portrait:(s)=><PortraitEmojiCard emoji="⭐" size={s}/>, praise:["¡Ganaste una Estrella Mágica por tu esfuerzo! ⭐","¡Cada acierto te hace brillar más! ✨"] },
  { id:"dg6",  series:"damigotchi", name:"Arcoíris Alegre",   bg:"#00ACC1", desc:"Tiene todos los colores felices.",   rare:true,  portrait:(s)=><PortraitEmojiCard emoji="🌈" size={s}/>, praise:["¡El Arcoíris Alegre apareció por tu gran trabajo! 🌈","¡Tus colores de aprendizaje están creciendo! 🎨"] },
  { id:"dg7",  series:"damigotchi", name:"Dragón Amistoso",   bg:"#43A047", desc:"Fuerte, tierno y muy valiente.",     rare:true,  portrait:(s)=><PortraitEmojiCard emoji="🐉" size={s}/>, praise:["¡El Dragón Amistoso protege tus sueños! 🐉","¡Tu valentía desbloqueó una carta especial! 💪"] },
  { id:"dg8",  series:"damigotchi", name:"Robot Sabio",       bg:"#546E7A", desc:"Piensa, calcula y ayuda.",          rare:false, portrait:(s)=><PortraitEmojiCard emoji="🤖" size={s}/>, praise:["¡El Robot Sabio dice que resolviste muy bien! 🤖","¡Tu mente está entrenando como una máquina feliz! 🧠"] },
  { id:"dg9",  series:"damigotchi", name:"Cohete Veloz",      bg:"#D84315", desc:"Sube directo a las estrellas.",     rare:true,  portrait:(s)=><PortraitEmojiCard emoji="🚀" size={s}/>, praise:["¡El Cohete Veloz despegó con tus aciertos! 🚀","¡Vas subiendo de nivel rapidísimo! 🌟"] },
  { id:"dg10", series:"damigotchi", name:"Corona Dorada",     bg:"#DAA520", desc:"Premio de gran campeón.",           rare:true,  portrait:(s)=><PortraitEmojiCard emoji="👑" size={s}/>, praise:["¡La Corona Dorada reconoce tu esfuerzo! 👑","¡Eres un campeón del aprendizaje! 🏆"] },
  { id:"dg11", series:"damigotchi", name:"Libro Encantado",   bg:"#6A1B9A", desc:"Guarda palabras mágicas.",          rare:false, portrait:(s)=><PortraitEmojiCard emoji="📚" size={s}/>, praise:["¡El Libro Encantado guarda todo lo aprendido! 📚","¡Cada palabra nueva abre una puerta! 🚪"] },
  { id:"dg12", series:"damigotchi", name:"Lápiz Valiente",    bg:"#F57C00", desc:"Traza letras sin miedo.",           rare:false, portrait:(s)=><PortraitEmojiCard emoji="✏️" size={s}/>, praise:["¡El Lápiz Valiente ayuda a escribir mejor! ✏️","¡Tus trazos están cada vez más bonitos! 🌟"] },
  { id:"dg13", series:"damigotchi", name:"Flor Risueña",      bg:"#EC407A", desc:"Crece con cariño y paciencia.",     rare:false, portrait:(s)=><PortraitEmojiCard emoji="🌸" size={s}/>, praise:["¡La Flor Risueña crece con tus buenas respuestas! 🌸","¡Tu paciencia hace florecer el aprendizaje! 🌷"] },
  { id:"dg14", series:"damigotchi", name:"Oso Abrazador",     bg:"#8D6E63", desc:"Da abrazos cuando lo necesitas.",   rare:false, portrait:(s)=><PortraitEmojiCard emoji="🐻" size={s}/>, praise:["¡El Oso Abrazador está orgulloso de ti! 🐻","¡Un abrazo grande por seguir intentando! 🤗"] },
  { id:"dg15", series:"damigotchi", name:"Globo Saltarín",    bg:"#29B6F6", desc:"Sube feliz con cada logro.",        rare:false, portrait:(s)=><PortraitEmojiCard emoji="🎈" size={s}/>, praise:["¡El Globo Saltarín sube con tus estrellas! 🎈","¡Cada logro te lleva más alto! ⬆️"] },
  { id:"dg16", series:"damigotchi", name:"Tesoro Secreto",    bg:"#FBC02D", desc:"Una sorpresa para exploradores.",   rare:true,  portrait:(s)=><PortraitEmojiCard emoji="💎" size={s}/>, praise:["¡Encontraste el Tesoro Secreto del aprendizaje! 💎","¡Tu esfuerzo vale como un diamante! ✨"] },

];

const SERIES_INFO = {
  damigotchi:    { label:"Damigotchi",    color:"#FF69B4", icon:"🧸", desc:"Cartas mágicas de aprendizaje" },
  numberblocks: { label:"Numberblocks", color:"#FFD700", icon:"🔢", desc:"Los personajes de bloques" },
  thomas:        { label:"Thomas",       color:"#1565C0", icon:"🚂", desc:"El tren y sus amigos"       },
  sprunki:       { label:"Sprunki",      color:"#FF6D00", icon:"🎵", desc:"Los músicos de Sprunki"     },
};

const pointsForCard = (i) => 3 + i * 2;

// ── Garland confetti component ─────────────────────────────
function Garland() {
  const pieces = Array.from({length:28}, (_,i) => ({
    left: `${Math.random()*100}%`,
    delay: `${Math.random()*0.4}s`,
    color: ["#FFD700","#FF4136","#2ECC40","#0074D9","#FF69B4","#FF8C00","#9B59B6"][i%7],
    size: 8 + Math.random()*8,
    shape: i%3,
  }));
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:600,overflow:"hidden"}}>
      {pieces.map((p,i)=>(
        <div key={i} style={{
          position:"absolute", top:"-20px", left:p.left,
          width:p.shape===2?p.size*0.5:p.size, height:p.size,
          borderRadius:p.shape===0?"50%":p.shape===1?"2px":"50% 0",
          background:p.color,
          animation:`confettiFall 1.4s ease-in ${p.delay} forwards`,
          transform:`rotate(${Math.random()*360}deg)`,
        }}/>
      ))}
      {/* string garlands */}
      {["#FFD700","#FF4136","#0074D9"].map((c,i)=>(
        <div key={`g${i}`} style={{
          position:"absolute", top:`${10+i*12}%`, left:0, right:0,
          height:16, overflow:"visible",
          animation:`garlandSwing 0.8s ease-out ${i*0.15}s both`,
        }}>
          <svg width="100%" height="30" viewBox="0 0 400 30" preserveAspectRatio="none">
            <path d={`M0,15 ${Array.from({length:13},(_,j)=>`Q${j*33+16},${j%2===0?28:2} ${(j+1)*33},15`).join(" ")}`}
              stroke={c} strokeWidth={2.5} fill="none" opacity={0.8}/>
            {Array.from({length:14},(_,j)=>(
              <circle key={j} cx={j*30} cy={15} r={5} fill={c} opacity={0.9}/>
            ))}
          </svg>
        </div>
      ))}
    </div>
  );
}

// ── Flip card component ───────────────────────────────────
function FlipCard({ card, flipped, onClick, size="md" }) {
  const w = size==="sm"?90:size==="lg"?150:108;
  const h = size==="sm"?130:size==="lg"?210:155;
  const portraitSize = size==="sm"?68:size==="lg"?110:82;
  const si = SERIES_INFO[card.series];
  return (
    <div onClick={onClick} style={{width:w, height:h, cursor:flipped?"default":"pointer", perspective:600, flexShrink:0}}>
      <div style={{
        width:"100%", height:"100%", position:"relative",
        transformStyle:"preserve-3d",
        transform: flipped ? "rotateY(0deg)" : "rotateY(180deg)",
        transition:"transform 0.55s cubic-bezier(.4,.2,.2,1)",
      }}>
        {/* FRONT (character face) */}
        <div style={{
          position:"absolute", inset:0, backfaceVisibility:"hidden",
          borderRadius:14, overflow:"hidden",
          background:`linear-gradient(160deg,${card.bg}ff,${card.bg}99)`,
          border:`2.5px solid ${card.rare?"#FFD700":"rgba(255,255,255,.35)"}`,
          boxShadow: card.rare
            ? `0 0 22px #FFD70099, 0 6px 16px rgba(0,0,0,.5)`
            : `0 6px 16px rgba(0,0,0,.45)`,
          display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"space-between", padding:"6px 5px 5px",
        }}>
          {/* Rare shimmer */}
          {card.rare && <div style={{position:"absolute",inset:0,background:"linear-gradient(120deg,transparent 30%,rgba(255,255,255,.25) 50%,transparent 70%)",backgroundSize:"200% 100%",animation:"shimmerSlide 2.5s ease-in-out infinite",pointerEvents:"none"}}/>}
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%"}}>
            <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:size==="sm"?8:10,color:"rgba(255,255,255,.8)"}}>{si.icon} {si.label}</div>
            {card.rare && <div style={{background:"#FFD700",color:"#333",borderRadius:5,padding:"1px 4px",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:7}}>★RARA</div>}
          </div>
          {/* Portrait */}
          <div style={{filter:"drop-shadow(2px 4px 6px rgba(0,0,0,.4))", lineHeight:0}}>
            {card.portrait(portraitSize)}
          </div>
          {/* Name */}
          <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:size==="sm"?10:12,color:"white",textShadow:"1px 2px 0 rgba(0,0,0,.5)",textAlign:"center"}}>{card.name}</div>
          {/* Desc */}
          <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:size==="sm"?8:9,color:"rgba(255,255,255,.75)",textAlign:"center",lineHeight:1.2}}>{card.desc}</div>
        </div>

        {/* BACK (mystery) */}
        <div style={{
          position:"absolute", inset:0, backfaceVisibility:"hidden",
          transform:"rotateY(180deg)",
          borderRadius:14, overflow:"hidden",
          background:"linear-gradient(145deg,#1a1a3e,#2d1b69,#1a1a3e)",
          border:"2.5px solid rgba(255,255,255,.18)",
          boxShadow:"0 6px 16px rgba(0,0,0,.45)",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6,
        }}>
          <div style={{fontSize:size==="sm"?28:36}}>🌟</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:size==="sm"?11:14,color:"rgba(255,255,255,.25)"}}>?</div>
          {/* decorative stars pattern */}
          {["12%,8%","80%,15%","8%,75%","85%,80%","50%,5%"].map((pos,i)=>(
            <div key={i} style={{position:"absolute",top:pos.split(",")[1],left:pos.split(",")[0],fontSize:10,opacity:0.15}}>✦</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── New card reveal popup with garland ────────────────────
function NewCardReveal({ card, onClose }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const flipTimer = setTimeout(() => setFlipped(true), 120);
    const closeTimer = setTimeout(() => onClose && onClose(), 1350);
    return () => { clearTimeout(flipTimer); clearTimeout(closeTimer); };
  }, [onClose]);

  if (!card) return null;

  return (
    <div style={{
      position:"fixed", top:14, left:"50%", transform:"translateX(-50%)",
      zIndex:500, pointerEvents:"none",
      display:"flex", alignItems:"center", gap:10,
      background:"rgba(20,18,45,.92)", backdropFilter:"blur(10px)",
      border:"2px solid rgba(255,215,0,.55)", borderRadius:18,
      padding:"9px 14px", boxShadow:"0 12px 35px rgba(0,0,0,.35), 0 0 26px rgba(255,215,0,.18)",
      animation:"fadeSlide .22s ease-out", maxWidth:"calc(100vw - 24px)"
    }}>
      <div style={{fontSize:30, animation:"bounce .8s ease-in-out infinite"}}>🃏</div>
      <div style={{minWidth:0}}>
        <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:13,color:"#FFD700",whiteSpace:"nowrap"}}>
          ¡Nueva carta!
        </div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:12,color:"white",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:190}}>
          {card.name}
        </div>
      </div>
      <div style={{transform:"scale(.56)", width:58, height:78, transformOrigin:"center"}}>
        <FlipCard card={card} flipped={flipped} onClick={()=>{}} size="sm"/>
      </div>
    </div>
  );
}



// ── Achievement reveal popup: insignias y diplomas ─────────
function AchievementReveal({ achievement, onClose }) {
  useEffect(() => {
    if (!achievement) return;
    const t = setTimeout(() => onClose && onClose(), achievement.type === "diploma" ? 2600 : 2100);
    return () => clearTimeout(t);
  }, [achievement, onClose]);

  if (!achievement) return null;

  const info = SKILL_INFO[achievement.skillId] || { emoji:"🏅", label:"Aprendizaje", color:"#FFD700" };
  const isDiploma = achievement.type === "diploma";

  return (
    <div style={{
      position:"fixed",
      inset:0,
      zIndex:650,
      pointerEvents:"none",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      padding:18,
      background:"rgba(8,6,28,.28)",
      backdropFilter:"blur(2px)",
      animation:"fadeSlide .18s ease-out"
    }}>
      {/* confetti */}
      {["⭐","✨","💫","🎉","🌟","🏅","✨","⭐"].map((e,i)=>(
        <div key={i} style={{
          position:"fixed",
          top:-20,
          left:`${8+i*12}%`,
          fontSize:24+(i%3)*8,
          animation:`confettiFall ${1.6+i*.08}s ease-in forwards`,
          animationDelay:`${i*.04}s`,
          pointerEvents:"none"
        }}>{e}</div>
      ))}

      <div style={{
        width:"min(360px, 92vw)",
        background:"linear-gradient(160deg,#3c3577,#211d4a)",
        border:`4px solid ${isDiploma ? "#FFD700" : info.color}`,
        borderRadius:28,
        boxShadow:"0 22px 70px rgba(0,0,0,.55), 0 0 35px rgba(255,215,0,.25)",
        padding:20,
        textAlign:"center",
        fontFamily:"'Nunito',sans-serif",
        transform:"scale(1)",
        animation:"completePop .38s cubic-bezier(.175,.885,.32,1.275)",
        position:"relative",
        overflow:"hidden"
      }}>
        <div style={{
          position:"absolute",
          inset:0,
          background:"linear-gradient(120deg,transparent 25%,rgba(255,255,255,.16) 50%,transparent 75%)",
          backgroundSize:"220% 100%",
          animation:"shimmerSlide 1.8s ease-in-out infinite",
          pointerEvents:"none"
        }}/>

        <div style={{fontSize:isDiploma ? 56 : 62, marginBottom:6}}>
          {isDiploma ? "📜" : "🏅"}
        </div>

        <div style={{
          color:"#FFD700",
          fontSize:15,
          fontWeight:900,
          letterSpacing:1,
          textTransform:"uppercase",
          marginBottom:4
        }}>
          {isDiploma ? "¡Nuevo diploma disponible!" : "¡Nueva insignia!"}
        </div>

        <div style={{
          color:"white",
          fontSize:26,
          fontWeight:900,
          textShadow:"2px 3px 0 rgba(0,0,0,.28)",
          lineHeight:1.05
        }}>
          {isDiploma ? `Diploma de ${info.label}` : `${info.label} Nv.${achievement.level}`}
        </div>

        <div style={{
          margin:"12px auto",
          width:isDiploma ? 240 : 120,
          minHeight:isDiploma ? 118 : 120,
          borderRadius:isDiploma ? 18 : "50%",
          background:isDiploma ? "#fff7d6" : `linear-gradient(135deg,${info.color},#FFD700)`,
          border:isDiploma ? "5px solid #FFD700" : "5px solid #FFD700",
          color:isDiploma ? "#2b2100" : "white",
          display:"flex",
          flexDirection:"column",
          alignItems:"center",
          justifyContent:"center",
          boxShadow:"0 9px 0 rgba(0,0,0,.24)",
          position:"relative"
        }}>
          <div style={{fontSize:isDiploma ? 34 : 42}}>{isDiploma ? "🏅" : info.emoji}</div>
          <div style={{fontSize:isDiploma ? 16 : 13,fontWeight:900,marginTop:4}}>
            {isDiploma ? "Diploma Damigotchi" : BADGE_NAMES[(achievement.level || 1)-1]}
          </div>
          {isDiploma && <div style={{fontSize:12,fontWeight:900,color:"#8a6200",marginTop:4}}>Por avanzar en {info.label}</div>}
        </div>

        <div style={{color:"rgba(255,255,255,.72)",fontSize:13,fontWeight:800,lineHeight:1.25}}>
          {isDiploma
            ? "Ya puedes verlo e imprimirlo en la sección Diplomas."
            : "Puedes verla cuando quieras en la sección Insignias."}
        </div>
      </div>
    </div>
  );
}

// ── Series picker screen ─────────────────────────────────
function SeriesPicker({ onPick, currentSeries }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:400}}>
      <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:14,color:"rgba(255,255,255,.6)",textAlign:"center",letterSpacing:1}}>
        🎴 ¿DE QUÉ COLECCIÓN QUIERES GANAR CARTAS?
      </div>
      {Object.entries(SERIES_INFO).map(([key,si])=>{
        const active = currentSeries===key;
        return(
          <button key={key} onClick={()=>onPick(key)} style={{
            background:active?`linear-gradient(135deg,${si.color}55,${si.color}22)`:"rgba(255,255,255,.06)",
            border:`2.5px solid ${active?si.color:"rgba(255,255,255,.15)"}`,
            borderRadius:16, padding:"12px 16px", cursor:"pointer",
            display:"flex", alignItems:"center", gap:14,
            boxShadow:active?`0 0 20px ${si.color}44`:"none",
            transition:"all .25s", outline:"none",
          }}>
            <div style={{fontSize:32}}>{si.icon}</div>
            <div style={{textAlign:"left"}}>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:16,color:active?si.color:"rgba(255,255,255,.8)"}}>{si.label}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:12,color:"rgba(255,255,255,.45)"}}>{si.desc}</div>
            </div>
            {active && <div style={{marginLeft:"auto",fontSize:20}}>✅</div>}
          </button>
        );
      })}
    </div>
  );
}

// ── Card detail modal ─────────────────────────────────────
function PurchaseModal({ dialog, onCancel, onConfirm }) {
  if (!dialog) return null;
  const item = dialog.item;
  const isConfirm = dialog.type === "confirm";
  const title = isConfirm ? "¿Comprar esta prenda?" : dialog.title;
  const message = isConfirm
    ? `${item.name} cuesta ${item.price} estrellas.`
    : dialog.message;

  return (
    <div style={{position:"fixed",inset:0,zIndex:700,background:"rgba(8,7,25,.64)",backdropFilter:"blur(7px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
      <div style={{
        width:"100%",maxWidth:360,
        background:"linear-gradient(160deg,rgba(57,51,114,.98),rgba(28,25,68,.98))",
        border:"3px solid rgba(255,215,0,.55)",borderRadius:26,padding:20,
        boxShadow:"0 24px 70px rgba(0,0,0,.45), 0 0 35px rgba(255,215,0,.14)",
        fontFamily:"'Nunito',sans-serif",textAlign:"center",animation:"correctPop .22s ease"
      }}>
        <div style={{fontSize:46,marginBottom:4}}>{isConfirm ? (item?.emoji || "👕") : (dialog.icon || "😊")}</div>
        <div style={{fontSize:22,fontWeight:900,color:"#FFD700",textShadow:"2px 3px 0 rgba(0,0,0,.25)",marginBottom:8}}>
          {title}
        </div>
        {item && isConfirm && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:9,margin:"8px 0 12px"}}>
            <span style={{width:24,height:24,borderRadius:8,background:item.color,border:"2px solid rgba(255,255,255,.65)",display:"inline-block"}}/>
            <span style={{color:"white",fontSize:16,fontWeight:900}}>{item.name}</span>
          </div>
        )}
        <div style={{color:"rgba(255,255,255,.72)",fontSize:15,fontWeight:800,lineHeight:1.4,marginBottom:18}}>
          {message}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onCancel} style={{
            background:"rgba(255,255,255,.10)",border:"2px solid rgba(255,255,255,.22)",borderRadius:16,
            padding:"11px 18px",color:"white",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:15,cursor:"pointer",minWidth:120
          }}>
            {isConfirm ? "Cancelar" : "Entendido"}
          </button>
          {isConfirm && (
            <button onClick={onConfirm} style={{
              background:"linear-gradient(135deg,#FFD700,#FF8C00)",border:"none",borderRadius:16,
              padding:"11px 18px",color:"#231900",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:15,cursor:"pointer",
              minWidth:120,boxShadow:"0 5px 0 rgba(0,0,0,.25)"
            }}>
              Comprar ⭐
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CardDetailModal({ card, onClose }) {
  const [praiseIdx, setPraiseIdx] = useState(0);
  const [showGarland, setShowGarland] = useState(false);
  const si = SERIES_INFO[card.series];

  // cycle through praise messages
  const nextPraise = () => {
    setPraiseIdx(i => (i + 1) % card.praise.length);
    setShowGarland(true);
    setTimeout(() => setShowGarland(false), 1200);
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:400,
      background:"rgba(0,0,0,.88)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:20, gap:18,
    }} onClick={onClose}>
      {showGarland && <Garland/>}

      {/* close hint */}
      <div style={{position:"absolute",top:18,right:18,fontSize:13,color:"rgba(255,255,255,.4)",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>
        Toca fuera para cerrar ✕
      </div>

      {/* series badge */}
      <div style={{
        background:`${card.bg}44`, border:`2px solid ${card.bg}`,
        borderRadius:20, padding:"5px 16px",
        fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:13,
        color:"white", letterSpacing:1,
        animation:"fadeSlide .4s ease",
      }}>
        {si.icon} {si.label} {card.rare ? "· ★ RARA" : ""}
      </div>

      {/* big portrait card */}
      <div style={{animation:"cardReveal .5s cubic-bezier(.175,.885,.32,1.275)"}}
           onClick={e => e.stopPropagation()}>
        <FlipCard card={card} flipped size="lg" onClick={()=>{}}/>
      </div>

      {/* praise bubble */}
      <div onClick={e=>{ e.stopPropagation(); nextPraise(); }} style={{
        background:`linear-gradient(135deg,${card.bg}cc,${card.bg}77)`,
        border:`3px solid ${card.bg}`,
        borderRadius:22, padding:"14px 20px",
        maxWidth:340, width:"100%",
        textAlign:"center", cursor:"pointer",
        animation:"correctPop .4s ease",
        boxShadow:`0 0 30px ${card.bg}55`,
        position:"relative",
      }}>
        {/* speech bubble tail */}
        <div style={{
          position:"absolute", top:-14, left:"50%",
          transform:"translateX(-50%)",
          width:0, height:0,
          borderLeft:"12px solid transparent",
          borderRight:"12px solid transparent",
          borderBottom:`14px solid ${card.bg}`,
        }}/>
        <div style={{
          fontFamily:"'Nunito',sans-serif", fontWeight:900,
          fontSize:16, color:"white",
          textShadow:"1px 2px 0 rgba(0,0,0,.3)",
          lineHeight:1.4,
        }}>
          {card.praise[praiseIdx]}
        </div>
      </div>

      {/* tap to change message hint */}
      <div style={{
        fontFamily:"'Nunito',sans-serif", fontWeight:700,
        fontSize:12, color:"rgba(255,255,255,.35)",
        letterSpacing:.5,
      }}>
        Toca el mensaje para cambiar 💬
      </div>
    </div>
  );
}

// ── Collection screen with flip cards ────────────────────
function CollectionScreen({ cards, onBack }) {
  const [filter, setFilter] = useState("all");
  const [flippedIds, setFlippedIds] = useState(new Set(cards.map(c=>c.id)));
  const [selectedCard, setSelectedCard] = useState(null);
  const [garlandId, setGarlandId] = useState(null);
  const earned = new Set(cards.map(c=>c.id));
  const visible = filter==="all" ? ALL_CARDS : ALL_CARDS.filter(c=>c.series===filter);

  const handleCardClick = (card) => {
    if (!earned.has(card.id)) return;
    // if not yet flipped, flip first
    if (!flippedIds.has(card.id)) {
      setFlippedIds(p => new Set([...p, card.id]));
      setGarlandId(card.id);
      setTimeout(() => setGarlandId(null), 1500);
      // open detail after flip animation
      setTimeout(() => setSelectedCard(card), 600);
    } else {
      // already flipped — open detail directly
      setSelectedCard(card);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:16,fontFamily:"'Nunito',sans-serif",position:"relative"}}>
      {garlandId && <Garland/>}
      {selectedCard && <CardDetailModal card={selectedCard} onClose={()=>setSelectedCard(null)}/>}

      <BackBtn onClick={onBack}/>
      <div style={{marginTop:52,marginBottom:5,fontWeight:900,fontSize:22,color:"white",textShadow:"2px 3px 0 rgba(0,0,0,.3)"}}>🃏 Mi Colección</div>
      <div style={{color:"rgba(255,255,255,.5)",fontWeight:700,fontSize:13,marginBottom:10}}>
        {earned.size} / {ALL_CARDS.length} cartas
      </div>

      {/* progress bar */}
      <div style={{width:"100%",maxWidth:400,height:8,background:"rgba(255,255,255,.1)",borderRadius:6,marginBottom:14,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${(earned.size/ALL_CARDS.length)*100}%`,background:"linear-gradient(90deg,#FFD700,#FF8C00)",borderRadius:6,transition:"width .5s"}}/>
      </div>

      {/* series filter */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",justifyContent:"center"}}>
        {["all","numberblocks","thomas","sprunki"].map(s=>{
          const si = s==="all" ? {label:"Todas",color:"#888",icon:"🃏"} : SERIES_INFO[s];
          const active = filter===s;
          return (
            <button key={s} onClick={()=>setFilter(s)} style={{
              background:active?`${si.color}33`:"rgba(255,255,255,.06)",
              border:`2px solid ${active?si.color:"rgba(255,255,255,.15)"}`,
              borderRadius:12, padding:"5px 13px", cursor:"pointer",
              fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:12,
              color:active?si.color:"rgba(255,255,255,.45)", transition:"all .2s",
            }}>{si.icon} {si.label}</button>
          );
        })}
      </div>

      <div style={{fontSize:12,color:"rgba(255,255,255,.3)",marginBottom:10,fontFamily:"'Nunito',sans-serif",textAlign:"center"}}>
        {earned.size > 0 ? "👆 Toca una carta para verla en grande" : "¡Juega para ganar cartas!"}
      </div>

      {/* card grid */}
      <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",maxWidth:440,paddingBottom:40}}>
        {visible.map(card => {
          const isEarned = earned.has(card.id);
          const isFlipped = flippedIds.has(card.id);
          return (
            <div key={card.id} style={{
              opacity: isEarned ? 1 : 0.3,
              transition:"opacity .3s",
              cursor: isEarned ? "pointer" : "default",
            }}>
              {isEarned
                ? <FlipCard card={card} flipped={isFlipped} onClick={()=>handleCardClick(card)} size="sm"/>
                : <div style={{
                    width:90, height:130, borderRadius:14,
                    background:"linear-gradient(145deg,#1a1a3e,#2d1b69)",
                    border:"2px solid rgba(255,255,255,.08)",
                    display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center", gap:4,
                  }}>
                    <div style={{fontSize:22}}>🌟</div>
                    <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:9,color:"rgba(255,255,255,.2)"}}>?</div>
                  </div>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  TAMAGOTCHI PET SYSTEM
// ══════════════════════════════════════════════════════

// ── Pet species catalog ───────────────────────────────
const PET_SPECIES = [
  { id:"nature",  name:"Naturaleza", emoji:"🌱", colors:["#B9F6CA","#43A047","#1B5E20"], desc:"Curioso, explorador y creativo", story:"Nació de una semillita brillante de Damiworld. Le encanta dibujar, colorear y descubrir cosas nuevas.", phrase:"¿Qué vamos a crear hoy?" },
  { id:"fire",    name:"Fuego",      emoji:"🔥", colors:["#FFE082","#FF7043","#BF360C"], desc:"Energético, valiente y rápido", story:"Trae una llamita alegre que nunca se apaga. Se emociona con los juegos rápidos y celebra cada logro.", phrase:"¡Vamos, más rápido!" },
  { id:"water",   name:"Agua",       emoji:"💧", colors:["#B3E5FC","#29B6F6","#01579B"], desc:"Tranquilo, sensible y cariñoso", story:"Viene de una laguna azul donde se guardan los sueños. Aprende con calma y mucho cariño.", phrase:"Me gusta estar contigo" },
  { id:"energy",  name:"Energía",    emoji:"⚡", colors:["#FFF59D","#FFD600","#F57F17"], desc:"Juguetón, inquieto y divertido", story:"Salta entre chispitas cuando aprende algo nuevo. Siempre quiere jugar otra vez.", phrase:"¡Juguemos otra vez!" },
  { id:"dream",   name:"Sueño",      emoji:"🌙", colors:["#D1C4E9","#7E57C2","#311B92"], desc:"Soñador, calmado y tierno", story:"Nació bajo una luna suave. Le gustan las historias, descansar y aprender sin apuro.", phrase:"Tengo un sueño bonito…" },
  { id:"star",    name:"Estrella",   emoji:"🌟", colors:["#FFF9C4","#FFD700","#B8860B"], desc:"Alegre, positivo y brillante", story:"Brilla con cada logro. Se alegra cuando ganas estrellas, cartas, insignias o diplomas.", phrase:"¡Lo hiciste increíble!" },
  { id:"fox",     name:"Zorrito",    emoji:"🦊", colors:["#FFE0B2","#F57C00","#8D3C0C"], desc:"Inteligente, curioso y juguetón", story:"Corre por los bosques secretos de Damiworld buscando aventuras. Es astuto, rápido y muy buen amigo.", phrase:"¡Descubramos algo nuevo!" },
  { id:"panther", name:"Pantera",    emoji:"🐆", colors:["#B0BEC5","#303545","#10121E"], desc:"Sigilosa, fuerte y segura", story:"Vive en los caminos de sombra brillante. Observa con atención antes de actuar y ayuda a concentrarse.", phrase:"Voy a hacerlo perfecto" },
];

// 100 evolutions — grouped in 10 eras of 10 levels each
// XP needed grows gradually: levels 1-10 need ~5xp each, by level 100 ~30xp each
// Era names cycle through themed names
const ERA_NAMES = [
  "Huevo","Bebé","Infante","Niño","Pequeño",
  "Curioso","Activo","Travieso","Juguetón","Listo",
  "Joven","Rápido","Ágil","Fuerte","Valiente",
  "Aventurero","Audaz","Decidido","Inteligente","Creativo",
  "Experto","Hábil","Talentoso","Brillante","Astuto",
  "Campeón","Maestro","Virtuoso","Prodigio","Genio",
  "Héroe","Leyenda","Mítico","Épico","Glorioso",
  "Divino","Celestial","Cósmico","Estelar","Estelar+",
  "Titan","Coloso","Gigante","Inmenso","Eterno",
  "Primordial","Ancestral","Supremo","Absoluto","Infinito",
  "Nv.51","Nv.52","Nv.53","Nv.54","Nv.55",
  "Nv.56","Nv.57","Nv.58","Nv.59","Nv.60",
  "Nv.61","Nv.62","Nv.63","Nv.64","Nv.65",
  "Nv.66","Nv.67","Nv.68","Nv.69","Nv.70",
  "Nv.71","Nv.72","Nv.73","Nv.74","Nv.75",
  "Nv.76","Nv.77","Nv.78","Nv.79","Nv.80",
  "Nv.81","Nv.82","Nv.83","Nv.84","Nv.85",
  "Nv.86","Nv.87","Nv.88","Nv.89","Nv.90",
  "Nv.91","Nv.92","Nv.93","Nv.94","Nv.95",
  "Nv.96","Nv.97","Nv.98","Nv.99","¡MAESTRO 100!",
];

// XP needed to reach each level (cumulative)
// Formula: each level needs Math.floor(4 + level * 1.8) XP
function xpForLevel(lvl) {
  // cumulative XP needed to reach level `lvl` (1-indexed, lvl=1 starts at 0)
  let total = 0;
  for (let i = 1; i < lvl; i++) total += Math.floor(4 + i * 1.8);
  return total;
}

// Precompute all 100 level thresholds
const LEVEL_XP = Array.from({length:101}, (_,i) => xpForLevel(i+1)); // index 0 = xp to reach lvl1 = 0

// Build PET_STAGES as an array of 100 entries
const PET_STAGES = Array.from({length:100}, (_,i) => {
  const lvl = i + 1;
  const bs = Math.min(1.12, 0.52 + lvl * 0.006);
  const hs = Math.min(1.08, 0.82 + lvl * 0.003);
  return { level: lvl, name: ERA_NAMES[i] || `Nv.${lvl}`, minXp: LEVEL_XP[i], bodyScale: bs, headScale: hs };
});

function getPetStage(xp) {
  let stage = PET_STAGES[0];
  for (const s of PET_STAGES) { if (xp >= s.minXp) stage = s; }
  return stage;
}

function getXpProgress(xp) {
  const stage = getPetStage(xp);
  const lvl = stage.level;
  if (lvl >= 100) return { current: 0, needed: 0, pct: 100, nextName: "¡Máximo!" };
  const nextStage = PET_STAGES[lvl]; // next level (lvl is 1-indexed, array 0-indexed so PET_STAGES[lvl] = level+1)
  const current = xp - stage.minXp;
  const needed  = nextStage.minXp - stage.minXp;
  return { current, needed, pct: Math.min(100, (current / needed) * 100), nextName: nextStage.name };
}

const NEEDS = ["hunger","bath","sleep","love","learn","cards"];
const NEED_META = {
  hunger: { icon:"🍕", label:"Hambre",      color:"#FF8C00", decay:0.7,  care:"food"   },
  bath:   { icon:"🛁", label:"Baño",         color:"#00BCD4", decay:0.45, care:"bath"   },
  sleep:  { icon:"😴", label:"Sueño",        color:"#9B59B6", decay:0.5,  care:"sleep"  },
  love:   { icon:"❤️", label:"Amor",         color:"#FF4136", decay:0.55, care:"hug"    },
  learn:  { icon:"📚", label:"Aprendizaje",  color:"#0074D9", decay:0.35, care:"study"  },
  cards:  { icon:"🃏", label:"Cartas",       color:"#FFD700", decay:0.25, care:"cards"  },
};


// ── Damigotchi shop: clothes purchased with stars ─────
const SHOP_ITEMS = [
  { id:"hat_blue",      type:"hat",       name:"Gorro azul",       emoji:"🧢", color:"#0074D9", price:8,  unlock:1 },
  { id:"hat_red",       type:"hat",       name:"Gorro rojo",       emoji:"🧢", color:"#FF4136", price:8,  unlock:1 },
  { id:"hat_green",     type:"hat",       name:"Gorro verde",      emoji:"🧢", color:"#2ECC40", price:10, unlock:2 },
  { id:"hat_purple",    type:"hat",       name:"Gorro morado",     emoji:"🧢", color:"#9B59B6", price:12, unlock:3 },
  { id:"glasses_black", type:"glasses",   name:"Lentes negros",    emoji:"🕶️", color:"#111111", price:12, unlock:2 },
  { id:"glasses_pink",  type:"glasses",   name:"Lentes rosados",   emoji:"🕶️", color:"#FF69B4", price:14, unlock:3 },
  { id:"shirt_red",     type:"shirt",     name:"Polera roja",      emoji:"👕", color:"#FF4136", price:14, unlock:2 },
  { id:"shirt_blue",    type:"shirt",     name:"Polera azul",      emoji:"👕", color:"#0074D9", price:14, unlock:2 },
  { id:"shirt_yellow",  type:"shirt",     name:"Polera amarilla",  emoji:"👕", color:"#FFD700", price:16, unlock:4 },
  { id:"shirt_green",   type:"shirt",     name:"Polera verde",     emoji:"👕", color:"#2ECC40", price:16, unlock:4 },
  { id:"bow_red",       type:"accessory", name:"Corbatín rojo",    emoji:"🎀", color:"#FF4136", price:18, unlock:5 },
  { id:"crown_gold",    type:"hat",       name:"Corona dorada",    emoji:"👑", color:"#FFD700", price:40, unlock:8 },
];

const emptyOutfit = { hat:null, glasses:null, shirt:null, accessory:null };
const getItemById = (id) => SHOP_ITEMS.find(i => i.id === id);

function normalizePet(pet){
  return {
    ...pet,
    stars: pet?.stars ?? 0,
    action: pet?.action ?? "idle",
    ownedClothes: pet?.ownedClothes ?? [],
    outfit: { ...emptyOutfit, ...(pet?.outfit || {}) },
  };
}

// Face expression based on most urgent need
function getUrgentNeed(needs) {
  return NEEDS.reduce((a, b) => needs[a] < needs[b] ? a : b);
}
function getPetExpression(needs, dead) {
  if (dead) return "dead";
  const avg = NEEDS.reduce((s,k) => s + needs[k], 0) / NEEDS.length;
  if (avg >= 72) return "happy";
  const urgent = getUrgentNeed(needs);
  const urgentVal = needs[urgent];
  if (urgentVal < 15) return `critical_${urgent}`;
  if (urgentVal < 28) return `urgent_${urgent}`;
  if (avg >= 50) return "ok";
  return "sad";
}

function getSoftNeedMessage(need, petName) {
  const messages = {
    hunger: { icon:"🍕", text:`${petName} dice: ¡tengo hambre!` },
    bath:   { icon:"🛁", text:`${petName} quiere un bañito con burbujas` },
    sleep:  { icon:"😴", text:`${petName} tiene sueño… zZz` },
    love:   { icon:"❤️", text:`${petName} quiere cariño` },
    learn:  { icon:"📚", text:`${petName} quiere aprender jugando` },
    cards:  { icon:"🃏", text:`${petName} quiere ganar una cartita` },
  };
  return messages[need] || { icon:"😊", text:`${petName} está feliz` };
}

function SoftLifePanel({ pet, urgentNeed, urgentVal, onCare, audio, onStudy, onCollection }) {
  const msg = getSoftNeedMessage(urgentNeed, pet.name);
  const isCalm = urgentVal >= 45 && !pet.dead;
  const options = [
    { need:"hunger", icon:"🍕", label:"Comer", color:"#FF8C00", action:()=>onCare("hunger",32,`¡Ñam ñam! 🍕`) },
    { need:"bath", icon:"🛁", label:"Bañar", color:"#00BCD4", action:()=>onCare("bath",30,`¡Qué limpio! 🛁✨`) },
    { need:"sleep", icon:"😴", label:"Dormir", color:"#9B59B6", action:()=>onCare("sleep",36,`¡Buenas noches! 💤`) },
    { need:"love", icon:"❤️", label:"Cariño", color:"#FF4136", action:()=>onCare("love",28,`¡Te quiero mucho! ❤️`) },
  ];
  return (
    <div style={{ width:"100%", maxWidth:400, background:"rgba(255,255,255,.055)", border:"2px solid rgba(255,255,255,.10)", borderRadius:20, padding:"10px 12px", marginBottom:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, justifyContent:"center", color:isCalm?"#FFD700":"white", fontWeight:900, fontSize:14, textAlign:"center", marginBottom:9 }}>
        <span style={{ fontSize:22 }}>{isCalm?"😊":msg.icon}</span>
        <span>{isCalm ? `${pet.name} está tranquilo y contento` : msg.text}</span>
      </div>
      {!pet.dead && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7 }}>
          {options.map(o => {
            const active = urgentNeed===o.need && urgentVal < 45;
            const disabled = pet.needs[o.need] > 94;
            return (
              <button key={o.need} onClick={()=>{ audio.playClick(); o.action(); }} disabled={disabled} style={{
                background: active ? `${o.color}55` : "rgba(255,255,255,.08)",
                border:`2px solid ${active ? o.color : "rgba(255,255,255,.14)"}`,
                borderRadius:14, padding:"8px 4px", cursor:disabled?"default":"pointer",
                opacity:disabled?.55:1, color:"white", fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:11,
                boxShadow: active ? `0 0 18px ${o.color}55` : "none",
                animation: active ? "pulse 1.5s infinite" : "none",
              }}>
                <div style={{fontSize:21}}>{o.icon}</div>
                <div>{o.label}</div>
              </button>
            );
          })}
        </div>
      )}
      {!pet.dead && (urgentNeed==="learn" || urgentNeed==="cards") && urgentVal < 45 && (
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:8}}>
          <button onClick={()=>{audio.playClick();onStudy("sumas");}} style={{background:"rgba(0,116,217,.18)",border:"2px solid #0074D9",borderRadius:12,padding:"7px 12px",color:"#A8D8FF",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer"}}>📚 Aprender</button>
          <button onClick={()=>{audio.playClick();onCollection();}} style={{background:"rgba(255,215,0,.18)",border:"2px solid #FFD700",borderRadius:12,padding:"7px 12px",color:"#FFD700",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer"}}>🃏 Cartas</button>
        </div>
      )}
    </div>
  );
}

// ── PetSprite — dynamic expressions ──────────────────
function PetSprite({ species, expression, xp, size=110, outfit=emptyOutfit, action="idle" }) {
  const sp = PET_SPECIES.find(s=>s.id===species) || PET_SPECIES[0];
  const stage = getPetStage(xp);
  const [c1,c2,c3] = sp.colors;
  const dead = expression === "dead";
  const happy = expression === "happy";
  const isEgg = xp < PET_STAGES[1].minXp;
  const worn = { ...emptyOutfit, ...(outfit || {}) };
  const hatItem = getItemById(worn.hat);
  const glassesItem = getItemById(worn.glasses);
  const shirtItem = getItemById(worn.shirt);
  const accItem = getItemById(worn.accessory);

  // parse expression
  const urgentNeed = expression.startsWith("critical_") || expression.startsWith("urgent_")
    ? expression.split("_")[1] : null;
  const isCritical = expression.startsWith("critical_");

  // face features by expression
  const browL_y = happy ? 32 : urgentNeed==="hunger"||urgentNeed==="bath" ? 28 : urgentNeed==="sleep" ? 35 : 33;
  const browR_y = happy ? 32 : urgentNeed==="hunger"||urgentNeed==="bath" ? 28 : urgentNeed==="sleep" ? 35 : 33;
  const browL_tilt = happy ? -4 : urgentNeed ? (urgentNeed==="love"?3:-5) : expression==="sad"?3:0;
  const browR_tilt = happy ? -4 : urgentNeed ? (urgentNeed==="love"?-3:5) : expression==="sad"?-3:0;
  const eyeY = urgentNeed==="sleep" ? 47 : 44;
  const eyeClose = urgentNeed==="sleep";

  const mouthPath = happy
    ? "M37,58 Q50,70 63,58"
    : urgentNeed==="hunger"
    ? "M40,60 Q50,67 60,60 Q50,72 40,60Z"   // open hungry mouth
    : urgentNeed==="love"
    ? "M40,61 Q50,56 60,61"                  // pouty
    : urgentNeed==="bath"
    ? "M40,62 Q50,57 60,62"                  // grimace
    : urgentNeed==="sleep"
    ? "M44,62 Q50,65 56,62"                  // small sleepy
    : urgentNeed==="learn"||urgentNeed==="cards"
    ? "M42,60 Q50,64 58,60"                  // meh
    : expression==="sad"
    ? "M40,63 Q50,56 60,63"                  // frown
    : "M42,60 Q50,64 58,60";

  // species-specific ear/feature shape
  const renderEars = () => {
    if (species==="bunny") return <>
      <ellipse cx={25} cy={14} rx={8} ry={18} fill={c2} transform="rotate(-10,25,14)"/>
      <ellipse cx={25} cy={14} rx={5} ry={13} fill={c1} transform="rotate(-10,25,14)"/>
      <ellipse cx={75} cy={14} rx={8} ry={18} fill={c2} transform="rotate(10,75,14)"/>
      <ellipse cx={75} cy={14} rx={5} ry={13} fill={c1} transform="rotate(10,75,14)"/>
    </>;
    if (["cat","fox","panther","fire","star"].includes(species)) return <>
      <polygon points="18,28 10,6 30,20" fill={c2}/>
      <polygon points="19,27 13,10 27,20" fill={c1}/>
      <polygon points="82,28 90,6 70,20" fill={c2}/>
      <polygon points="81,27 87,10 73,20" fill={c1}/>
    </>;
    if (species==="bear") return <>
      <circle cx={22} cy={18} r={13} fill={c2}/>
      <circle cx={22} cy={18} r={8}  fill={c1}/>
      <circle cx={78} cy={18} r={13} fill={c2}/>
      <circle cx={78} cy={18} r={8}  fill={c1}/>
    </>;
    if (["frog","nature"].includes(species)) return <>
      <ellipse cx={28} cy={20} rx={12} ry={9} fill={c2}/>
      <circle  cx={28} cy={18} r={6}   fill="#1a1a1a"/>
      <circle  cx={26} cy={16} r={2}   fill="white"/>
      <ellipse cx={72} cy={20} rx={12} ry={9} fill={c2}/>
      <circle  cx={72} cy={18} r={6}   fill="#1a1a1a"/>
      <circle  cx={70} cy={16} r={2}   fill="white"/>
    </>;
    if (["penguin","water","dream","energy"].includes(species)) return <>
      <ellipse cx={50} cy={10} rx={14} ry={8} fill={c2}/>
    </>;
    if (species==="dragon") return <>
      <polygon points="22,30 14,8 34,22" fill={c3}/>
      <polygon points="50,12 44,2 56,2"  fill={c3}/>
      <polygon points="78,30 86,8 66,22" fill={c3}/>
    </>;
    return null;
  };

  const bsz = stage.bodyScale;
  const hsz = stage.headScale;
  const bodyW = 52 * bsz, bodyH = 42 * bsz;
  const bodyX = 50 - bodyW/2, bodyY = 58 + (1-bsz)*20;
  const headR  = 30 * hsz;
  const headCY = bodyY - headR * 0.65;

  if (isEgg) return (
    <svg width={size} height={size} viewBox="0 0 100 100"
      style={{animation:"petBounce 2s ease-in-out infinite", filter:"drop-shadow(0 4px 10px rgba(255,200,0,.4))"}}>
      <ellipse cx={50} cy={58} rx={28} ry={36} fill={c2}/>
      <ellipse cx={50} cy={58} rx={28} ry={36} fill="none" stroke={c1} strokeWidth={2} strokeDasharray="6 4"/>
      <ellipse cx={40} cy={44} rx={9} ry={6} fill={c1} opacity={0.3} transform="rotate(-30,40,44)"/>
      <text x={50} y={64} textAnchor="middle" fontSize={22}>❓</text>
    </svg>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 100 100"
      style={{
        filter: dead ? "grayscale(1) opacity(.45)" : happy ? `drop-shadow(0 4px 14px ${c2}88)` : `drop-shadow(0 3px 8px rgba(0,0,0,.3))`,
        animation: happy && !dead ? "petBounce 1.6s ease-in-out infinite" : isCritical ? "shake .4s ease infinite" : "none",
      }}>

      {/* ground shadow */}
      <ellipse cx={50} cy={98} rx={26*bsz} ry={4} fill="rgba(0,0,0,.18)"/>

      {/* BODY */}
      <ellipse cx={50} cy={bodyY+bodyH*0.4} rx={bodyW*0.55} ry={bodyH*0.45} fill={c3}/>
      <ellipse cx={50} cy={bodyY+bodyH*0.35} rx={bodyW*0.6} ry={bodyH*0.5} fill={c2}/>
      <ellipse cx={50-bodyW*.1} cy={bodyY+bodyH*.2} rx={bodyW*.22} ry={bodyH*.18} fill={c1} opacity={.3} transform={`rotate(-15,${50-bodyW*.1},${bodyY+bodyH*.2})`}/>

      {/* BELLY patch (penguin/bear) */}
      {(species==="penguin"||species==="bear") &&
        <ellipse cx={50} cy={bodyY+bodyH*.35} rx={bodyW*.35} ry={bodyH*.38} fill={c1} opacity={.55}/>}

      {/* SHIRT / POLERA */}
      {shirtItem && !dead && <>
        <path d={`M${bodyX+bodyW*.14},${bodyY+bodyH*.10} Q50,${bodyY+bodyH*.30} ${bodyX+bodyW*.86},${bodyY+bodyH*.10} L${bodyX+bodyW*.94},${bodyY+bodyH*.70} Q50,${bodyY+bodyH*.95} ${bodyX+bodyW*.06},${bodyY+bodyH*.70} Z`}
          fill={shirtItem.color} opacity={0.92}/>
        <path d={`M${bodyX+bodyW*.32},${bodyY+bodyH*.15} Q50,${bodyY+bodyH*.30} ${bodyX+bodyW*.68},${bodyY+bodyH*.15}`}
          stroke="rgba(255,255,255,.55)" strokeWidth={2} fill="none" strokeLinecap="round"/>
        <text x={50} y={bodyY+bodyH*.56} textAnchor="middle" fontSize={9*bsz} fill="rgba(255,255,255,.75)" fontFamily="Nunito,sans-serif" fontWeight="900">D</text>
      </>}

      {/* ARMS */}
      <path d={`M${bodyX+4},${bodyY+bodyH*.3} Q${bodyX-10},${bodyY+bodyH*.5} ${bodyX-8},${bodyY+bodyH*.75}`}
        stroke={c3} strokeWidth={9*bsz} strokeLinecap="round" fill="none"/>
      <circle cx={bodyX-8} cy={bodyY+bodyH*.75} r={7*bsz} fill={c2}/>
      <path d={`M${bodyX+bodyW-4},${bodyY+bodyH*.3} Q${bodyX+bodyW+10},${bodyY+bodyH*.5} ${bodyX+bodyW+8},${bodyY+bodyH*.75}`}
        stroke={c3} strokeWidth={9*bsz} strokeLinecap="round" fill="none"/>
      <circle cx={bodyX+bodyW+8} cy={bodyY+bodyH*.75} r={7*bsz} fill={c2}/>

      {/* LEGS */}
      <ellipse cx={50-bodyW*.22} cy={96} rx={10*bsz} ry={6*bsz} fill={c3}/>
      <ellipse cx={50+bodyW*.22} cy={96} rx={10*bsz} ry={6*bsz} fill={c3}/>
      <ellipse cx={50-bodyW*.25} cy={98} rx={9*bsz} ry={4*bsz} fill={c2}/>
      <ellipse cx={50+bodyW*.25} cy={98} rx={9*bsz} ry={4*bsz} fill={c2}/>

      {/* TAIL (bunny) */}
      {species==="bunny" && <circle cx={50+bodyW*.55} cy={bodyY+bodyH*.6} r={7*bsz} fill="white"/>}
      {/* WINGS (dragon) */}
      {species==="dragon" && <>
        <path d={`M${bodyX+4},${bodyY} Q${bodyX-20},${bodyY-20} ${bodyX-15},${bodyY+bodyH*.5}`} fill={c3} opacity={.7}/>
        <path d={`M${bodyX+bodyW-4},${bodyY} Q${bodyX+bodyW+20},${bodyY-20} ${bodyX+bodyW+15},${bodyY+bodyH*.5}`} fill={c3} opacity={.7}/>
      </>}

      {/* EARS/FEATURES */}
      {renderEars()}

      {/* HEAD */}
      <circle cx={50} cy={headCY} r={headR+2} fill={c3}/>
      <circle cx={50} cy={headCY} r={headR}   fill={c2}/>
      <ellipse cx={50-headR*.3} cy={headCY-headR*.4} rx={headR*.3} ry={headR*.2} fill={c1} opacity={.25} transform={`rotate(-25,${50-headR*.3},${headCY-headR*.4})`}/>

      {/* species face patch */}
      {(["penguin","water","dream","energy","panther"].includes(species)) && <ellipse cx={50} cy={headCY+headR*.1} rx={headR*.55} ry={headR*.6} fill={c1} opacity={.6}/>}

      {dead ? <>
        {/* X eyes */}
        <text x={50-headR*.28} y={headCY+2} fontSize={16} fill="#888" textAnchor="middle">✕</text>
        <text x={50+headR*.28} y={headCY+2} fontSize={16} fill="#888" textAnchor="middle">✕</text>
        <path d={`M${50-headR*.35},${headCY+headR*.35} Q${50},${headCY+headR*.28} ${50+headR*.35},${headCY+headR*.35}`} stroke="#888" strokeWidth={2} fill="none"/>
      </> : <>
        {/* EYEBROWS */}
        <path d={`M${50-headR*.6},${headCY-headR*.12+browL_tilt} Q${50-headR*.25},${headCY-headR*.22+browL_tilt-browL_tilt} ${50-headR*.0},${headCY-headR*.12+browR_tilt}`}
          stroke="#555" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.8}/>

        {/* EYES */}
        {eyeClose ? <>
          {/* sleepy closed eyes */}
          <path d={`M${50-headR*.55},${headCY} Q${50-headR*.28},${headCY-8} ${50-headR*.0},${headCY}`} stroke="#333" strokeWidth={2.5} fill="none" strokeLinecap="round"/>
          <path d={`M${50+headR*.0},${headCY} Q${50+headR*.28},${headCY-8} ${50+headR*.55},${headCY}`} stroke="#333" strokeWidth={2.5} fill="none" strokeLinecap="round"/>
        </> : <>
          <ellipse cx={50-headR*.32} cy={headCY+1} rx={headR*.22} ry={headR*.25} fill="white" stroke="#333" strokeWidth={1.2}/>
          <ellipse cx={50+headR*.32} cy={headCY+1} rx={headR*.22} ry={headR*.25} fill="white" stroke="#333" strokeWidth={1.2}/>
          <circle  cx={50-headR*.28} cy={headCY+2} r={headR*.13} fill="#1a1a1a"/>
          <circle  cx={50+headR*.36} cy={headCY+2} r={headR*.13} fill="#1a1a1a"/>
          <circle  cx={50-headR*.33} cy={headCY-1} r={headR*.05} fill="white"/>
          <circle  cx={50+headR*.31} cy={headCY-1} r={headR*.05} fill="white"/>
          {/* star eyes when happy */}
          {happy && <>
            <text x={50-headR*.32} y={headCY+4} textAnchor="middle" fontSize={headR*.28} fill="#FFD700">★</text>
            <text x={50+headR*.32} y={headCY+4} textAnchor="middle" fontSize={headR*.28} fill="#FFD700">★</text>
          </>}
        </>}

        {/* CHEEKS */}
        <circle cx={50-headR*.62} cy={headCY+headR*.2} r={headR*.16} fill={urgentNeed==="love"?"#FF4136":"#FF8C00"} opacity={urgentNeed==="love"?.6:.3}/>
        <circle cx={50+headR*.62} cy={headCY+headR*.2} r={headR*.16} fill={urgentNeed==="love"?"#FF4136":"#FF8C00"} opacity={urgentNeed==="love"?.6:.3}/>

        {/* MOUTH */}
        <path d={mouthPath} stroke="#555" strokeWidth={2} fill={urgentNeed==="hunger"?"rgba(180,80,80,.5)":"none"} strokeLinecap="round"/>

        {/* NEED expression overlays */}
        {urgentNeed==="hunger"  && <text x={50+headR*.7} y={headCY-headR*.6} fontSize={14}>😤</text>}
        {urgentNeed==="bath"    && <text x={50-headR*.9} y={headCY-headR*.5} fontSize={12}>💦</text>}
        {urgentNeed==="sleep"   && <text x={50+headR*.6} y={headCY-headR*.7} fontSize={14}>💤</text>}
        {urgentNeed==="love"    && <text x={50-headR*.9} y={headCY-headR*.7} fontSize={12}>🥺</text>}
        {urgentNeed==="learn"   && <text x={50+headR*.6} y={headCY-headR*.5} fontSize={12}>❓</text>}
        {urgentNeed==="cards"   && <text x={50-headR*.9} y={headCY-headR*.6} fontSize={12}>🃏</text>}
        {isCritical             && <text x={50} y={headCY-headR*1.1} textAnchor="middle" fontSize={16}>⚠️</text>}
        {happy                  && <text x={50+headR*.8} y={headCY-headR*.8} fontSize={12}>✨</text>}

        {/* GLASSES */}
        {glassesItem && !dead && <>
          <rect x={50-headR*.55} y={headCY-headR*.07} width={headR*.44} height={headR*.24} rx={3} fill={glassesItem.color} opacity={.88}/>
          <rect x={50+headR*.11} y={headCY-headR*.07} width={headR*.44} height={headR*.24} rx={3} fill={glassesItem.color} opacity={.88}/>
          <line x1={50-headR*.11} y1={headCY+headR*.04} x2={50+headR*.11} y2={headCY+headR*.04} stroke={glassesItem.color} strokeWidth={2}/>
          <rect x={50-headR*.49} y={headCY-headR*.02} width={headR*.18} height={headR*.05} rx={2} fill="rgba(255,255,255,.35)"/>
        </>}

        {/* BOW / ACCESSORY */}
        {accItem && !dead && <>
          <polygon points={`44,${headCY+headR*.80} 50,${headCY+headR*.68} 44,${headCY+headR*.56}`} fill={accItem.color}/>
          <polygon points={`56,${headCY+headR*.80} 50,${headCY+headR*.68} 56,${headCY+headR*.56}`} fill={accItem.color}/>
          <circle cx={50} cy={headCY+headR*.68} r={3} fill="rgba(255,255,255,.8)"/>
        </>}

        {/* ACTION VISUALS: eating, bathing, sleeping, love */}
        {action==="hunger" && !dead && <>
          <text x={50+headR*.75} y={headCY+headR*.72} fontSize={13}>🍕</text>
          <text x={50-headR*.95} y={headCY+headR*.35} fontSize={10}>ñam</text>
        </>}
        {action==="bath" && !dead && <>
          <circle cx={50-headR*.78} cy={headCY-headR*.75} r={4} fill="#B3E5FC" opacity={.8}/>
          <circle cx={50+headR*.65} cy={headCY-headR*.92} r={3} fill="#B3E5FC" opacity={.7}/>
          <circle cx={50+headR*.20} cy={headCY-headR*1.10} r={5} fill="#B3E5FC" opacity={.65}/>
          <text x={50} y={headCY-headR*1.18} textAnchor="middle" fontSize={11}>🫧</text>
        </>}
        {action==="sleep" && !dead && <>
          <text x={50+headR*.65} y={headCY-headR*1.02} fontSize={11}>ZzZ</text>
          <text x={50-headR*.75} y={headCY-headR*.72} fontSize={12}>🌙</text>
        </>}
        {action==="love" && !dead && <>
          <text x={50-headR*.95} y={headCY-headR*.82} fontSize={12}>💖</text>
          <text x={50+headR*.72} y={headCY-headR*.65} fontSize={13}>💕</text>
        </>}

        {/* HAT / GORRO / CORONA */}
        {hatItem && !dead && (hatItem.id==="crown_gold" ? <>
          <polygon points={`32,${headCY-headR*.92} 40,${headCY-headR*1.15} 50,${headCY-headR*.92} 60,${headCY-headR*1.15} 68,${headCY-headR*.92} 66,${headCY-headR*.72} 34,${headCY-headR*.72}`}
            fill={hatItem.color} stroke="rgba(0,0,0,.25)" strokeWidth={1}/>
          <circle cx={40} cy={headCY-headR*1.13} r={2} fill="#FF4136"/>
          <circle cx={60} cy={headCY-headR*1.13} r={2} fill="#0074D9"/>
        </> : <>
          <ellipse cx={50} cy={headCY-headR*.78} rx={headR*.82} ry={headR*.14} fill={hatItem.color}/>
          <rect x={50-headR*.50} y={headCY-headR*1.05} width={headR} height={headR*.28} rx={5} fill={hatItem.color}/>
          <rect x={50-headR*.48} y={headCY-headR*.82} width={headR*.96} height={headR*.07} rx={3} fill="rgba(255,255,255,.35)"/>
        </>)}

        {/* BATH bubbles */}
        {urgentNeed==="bath" && <>
          <circle cx={50-headR*.4} cy={headCY-headR*.8} r={4} fill="#00BCD4" opacity={.5}/>
          <circle cx={50+headR*.3} cy={headCY-headR*1.0} r={3} fill="#00BCD4" opacity={.4}/>
        </>}
      </>}

      {/* Stage label */}
      <text x={50} y={100} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,.5)" fontFamily="Nunito,sans-serif" fontWeight="900">
        {getPetStage(xp).name}
      </text>
    </svg>
  );
}

// ── Need bar ──────────────────────────────────────────
function NeedBar({ need, value }) {
  const m = NEED_META[need];
  const pct = Math.max(0, Math.min(100, value));
  const low = pct < 28;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
      <div style={{ fontSize:16, width:22, textAlign:"center", flexShrink:0 }}>{m.icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
          <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:11, color:"rgba(255,255,255,.6)" }}>{m.label}</span>
          <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:11, color:low?"#FF4136":m.color }}>{Math.floor(pct)}%</span>
        </div>
        <div style={{ height:9, background:"rgba(255,255,255,.1)", borderRadius:6, overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${pct}%`,
            background: low ? `linear-gradient(90deg,#FF4136,#FF8C00)` : `linear-gradient(90deg,${m.color}cc,${m.color})`,
            borderRadius:6, transition:"width .4s",
            animation: low ? "pulse 1s infinite" : "none",
          }}/>
        </div>
      </div>
    </div>
  );
}

// ── Care button ───────────────────────────────────────
function CareBtn({ icon, label, color, onClick, disabled, urgent }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "rgba(255,255,255,.05)" : urgent ? `linear-gradient(135deg,${color},${color}99)` : `linear-gradient(135deg,${color}99,${color}66)`,
      border: `2.5px solid ${disabled?"rgba(255,255,255,.08)":color}`,
      borderRadius:16, padding:"10px 4px", cursor:disabled?"default":"pointer",
      display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1,
      boxShadow: urgent ? `0 0 14px ${color}88, 0 3px 0 rgba(0,0,0,.2)` : disabled ? "none" : "0 3px 0 rgba(0,0,0,.2)",
      transition:"all .15s", outline:"none", opacity:disabled?.4:1,
      animation: urgent ? "pulse 1.2s infinite" : "none",
    }}>
      <div style={{ fontSize:urgent?24:20 }}>{icon}</div>
      <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:10, color:"white", textAlign:"center", lineHeight:1.1 }}>{label}</div>
    </button>
  );
}


// ── Shop / wardrobe screen ────────────────────────────
function WardrobeScreen({ pet, onBack, onBuy, onEquip, onUnequip, audio }) {
  const stage = getPetStage(pet.xp);
  const [tab, setTab] = useState("shop");
  const owned = new Set(pet.ownedClothes || []);
  const outfit = { ...emptyOutfit, ...(pet.outfit || {}) };
  const tabs = [
    { id:"shop", label:"Tienda", icon:"🛍️" },
    { id:"closet", label:"Vestidor", icon:"👕" },
  ];
  const types = ["hat","glasses","shirt","accessory"];
  const typeLabel = { hat:"Gorros", glasses:"Lentes", shirt:"Poleras", accessory:"Accesorios" };
  const canUse = item => stage.level >= item.unlock;
  const isEquipped = item => outfit[item.type] === item.id;

  const itemCard = (item) => {
    const itemOwned = owned.has(item.id);
    const locked = !canUse(item);
    const equipped = isEquipped(item);
    return (
      <div key={item.id} style={{
        background: equipped ? `${item.color}33` : "rgba(255,255,255,.07)",
        border: `2px solid ${equipped ? item.color : locked ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.13)"}`,
        borderRadius:16, padding:10, display:"flex", flexDirection:"column", gap:6,
        opacity: locked ? .45 : 1,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:28}}>{item.emoji}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:900,fontSize:13,color:"white"}}>{item.name}</div>
            <div style={{fontWeight:700,fontSize:10,color:"rgba(255,255,255,.45)"}}>
              {typeLabel[item.type]} · Nv.{item.unlock}
            </div>
          </div>
          <div style={{width:24,height:24,borderRadius:8,background:item.color,border:"2px solid rgba(255,255,255,.35)"}}/>
        </div>
        <button disabled={locked || (!itemOwned && pet.stars < item.price)} onClick={()=>{
          audio.playClick();
          if (!itemOwned) onBuy(item.id);
          else onEquip(item.id);
        }} style={{
          background: locked ? "rgba(255,255,255,.06)" : equipped ? "rgba(46,204,64,.3)" : itemOwned ? "rgba(255,215,0,.18)" : "linear-gradient(135deg,#FFD700,#FF8C00)",
          border: locked ? "2px solid rgba(255,255,255,.08)" : equipped ? "2px solid #2ECC40" : itemOwned ? "2px solid #FFD700" : "none",
          borderRadius:12, padding:"7px 10px", cursor:locked || (!itemOwned && pet.stars < item.price) ? "default" : "pointer",
          color: !itemOwned && !locked ? "#222" : equipped ? "#7CFF95" : locked ? "rgba(255,255,255,.35)" : "#FFD700",
          fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:12,
        }}>
          {locked ? `🔒 Nv.${item.unlock}` : equipped ? "✅ Puesto" : itemOwned ? "Poner" : `Comprar ⭐ ${item.price}`}
        </button>
      </div>
    );
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 14px 28px",fontFamily:"'Nunito',sans-serif"}}>
      <BackBtn onClick={onBack}/>
      <div style={{height:34}}/>
      <div style={{fontSize:15,fontWeight:900,color:"rgba(255,255,255,.55)",letterSpacing:2,marginBottom:8}}>ROPA DE DAMIGOTCHI</div>
      <div style={{...CARD,width:"100%",maxWidth:430,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:24,fontWeight:900,color:"#FFD700"}}>⭐ {pet.stars || 0}</div>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.45)"}}>Estrellas disponibles</div>
          </div>
          <PetSprite species={pet.species} expression="happy" xp={pet.xp} size={92} outfit={pet.outfit} action="love"/>
        </div>

        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>{audio.playClick();setTab(t.id);}} style={{
              flex:1,background:tab===t.id?"rgba(255,215,0,.18)":"rgba(255,255,255,.06)",border:`2px solid ${tab===t.id?"#FFD700":"rgba(255,255,255,.12)"}`,
              borderRadius:14,padding:"8px 10px",color:tab===t.id?"#FFD700":"rgba(255,255,255,.55)",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer"
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {tab==="closet" && <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
          {types.map(type=>(
            <div key={type} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:14,padding:"8px 10px"}}>
              <div style={{fontSize:12,fontWeight:900,color:"white"}}>{typeLabel[type]}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.45)"}}>{outfit[type] ? getItemById(outfit[type])?.name : "Sin usar"}</div>
                {outfit[type] && <button onClick={()=>{audio.playClick();onUnequip(type);}} style={{background:"rgba(255,65,54,.15)",border:"2px solid #FF4136",borderRadius:9,padding:"4px 8px",color:"#FF9D95",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer",fontSize:10}}>Quitar</button>}
              </div>
            </div>
          ))}
        </div>}

        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:9}}>
          {SHOP_ITEMS.filter(i => tab==="shop" ? true : owned.has(i.id)).map(itemCard)}
        </div>
        {tab==="closet" && pet.ownedClothes.length===0 && <div style={{textAlign:"center",marginTop:12,color:"rgba(255,255,255,.45)",fontWeight:700,fontSize:13}}>Aún no hay ropita. Gana estrellas y compra en la tienda ⭐</div>}
      </div>
    </div>
  );
}

// ── Pet chooser screen ────────────────────────────────
function PetChooser({ onChoose }) {
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");

  return (
    <div style={{
      minHeight:"100vh", background:BG,
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:20, gap:16,
      fontFamily:"'Nunito',sans-serif",
    }}>
      <h1 style={{ margin:0, fontWeight:900, fontSize:26, color:"white", textShadow:"2px 3px 0 rgba(0,0,0,.3)", textAlign:"center" }}>
        🥚 ¡Elige tu Damigotchi!
      </h1>
      <p style={{ color:"rgba(255,255,255,.6)", fontWeight:700, fontSize:14, margin:0, textAlign:"center" }}>
        Tu bebé crecerá contigo mientras aprendes
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, width:"100%", maxWidth:380 }}>
        {PET_SPECIES.map(sp => (
          <button key={sp.id} onClick={()=>setSelected(sp.id)} style={{
            background: selected===sp.id ? `linear-gradient(135deg,${sp.colors[0]}88,${sp.colors[1]}66)` : "rgba(255,255,255,.06)",
            border: `3px solid ${selected===sp.id ? sp.colors[1] : "rgba(255,255,255,.12)"}`,
            borderRadius:18, padding:"14px 8px", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", gap:6,
            boxShadow: selected===sp.id ? `0 0 20px ${sp.colors[1]}66` : "none",
            transition:"all .2s", outline:"none",
          }}>
            <div style={{ pointerEvents:"none" }}>
              <PetSprite species={sp.id} expression={selected===sp.id?"happy":"ok"} xp={8} size={72}/>
            </div>
            <div style={{ fontSize:22, lineHeight:1 }}>{sp.emoji}</div>
            <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:13, color:"white" }}>{sp.name}</div>
            <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:10, color:"rgba(255,255,255,.5)", textAlign:"center" }}>{sp.desc}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:10, animation:"fadeSlide .3s ease" }}>
          {(() => { const sp = PET_SPECIES.find(s=>s.id===selected); return (
            <div style={{background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,215,0,.25)",borderRadius:18,padding:12,textAlign:"center"}}>
              <div style={{fontSize:34}}>{sp?.emoji}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:900,color:"#FFD700",fontSize:18}}>Damigotchi {sp?.name}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:700,color:"rgba(255,255,255,.72)",fontSize:12,marginTop:4,lineHeight:1.25}}>{sp?.story}</div>
              <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:900,color:"white",fontSize:12,marginTop:8}}>“{sp?.phrase}”</div>
            </div>
          ); })()}
          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:13, color:"rgba(255,255,255,.6)", textAlign:"center" }}>
            ¿Cómo se llama tu {PET_SPECIES.find(s=>s.id===selected)?.name}?
          </div>
          <input
            value={name}
            onChange={e=>setName(e.target.value)}
            maxLength={12}
            placeholder="Escribe un nombre..."
            style={{
              background:"rgba(255,255,255,.1)", border:"2px solid rgba(255,255,255,.25)",
              borderRadius:14, padding:"10px 16px", color:"white",
              fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:16,
              outline:"none", textAlign:"center",
            }}
          />
          <button
            disabled={!name.trim()}
            onClick={()=>onChoose(selected, name.trim())}
            style={{
              background: name.trim() ? "linear-gradient(135deg,#FFD700,#FF8C00)" : "rgba(255,255,255,.1)",
              border:"none", borderRadius:18, padding:"14px",
              fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:18,
              color: name.trim() ? "#222" : "rgba(255,255,255,.3)",
              cursor: name.trim() ? "pointer" : "default",
              boxShadow: name.trim() ? "0 5px 0 rgba(0,0,0,.25), 0 0 28px rgba(255,215,0,.4)" : "none",
              animation: name.trim() ? "pulse 2s infinite" : "none",
              transition:"all .3s",
            }}>
            🐣 ¡Adoptar a {name.trim()||"..."}!
          </button>
        </div>
      )}
    </div>
  );
}

// ── Pet home screen ────────────────────────────────────
function PetHome({ pet, onCare, onStudy, onCollection, onShop, onSkills, onBadges, onDiplomas, onSeriesChange, onChangePet, activeSeries,
                   earnedCards, skills, totalLvls, nextCardAt, progress, audio }) {
  const stage = getPetStage(pet.xp);
  const expression = getPetExpression(pet.needs, pet.dead);
  const urgentNeed = getUrgentNeed(pet.needs);
  const urgentVal  = pet.needs[urgentNeed];
  const si = SERIES_INFO[activeSeries];
  const [careMsg, setCareMsg] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const showMsg = (msg) => { setCareMsg(msg); setTimeout(()=>setCareMsg(null), 2000); };
  const care = (need, amount, msg) => {
    if (pet.dead) return;
    onCare(need, amount);
    showMsg(msg);
    audio.playCorrect();
  };

  // mood description
  const moodText = pet.dead ? "💀 Necesita revivir..."
    : expression==="happy" ? `¡${pet.name} está muy feliz! ✨`
    : expression==="ok"    ? `${pet.name} está bien 😊`
    : urgentVal < 15       ? `⚠️ ¡${pet.name} necesita ${NEED_META[urgentNeed].label} urgente!`
    : urgentVal < 28       ? `${NEED_META[urgentNeed].icon} ${pet.name} necesita ${NEED_META[urgentNeed].label}`
    : `${pet.name} está un poco triste 😢`;

  return (
    <div style={{
      minHeight:"100vh", background:BG,
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"10px 14px 28px", fontFamily:"'Nunito',sans-serif", overflowY:"auto",
    }}>
      <SoundBar audio={audio}/>

      {/* ── Top bar: level + XP progress + cards */}
      <div style={{ width:"100%", maxWidth:400, marginBottom:8 }}>
        {/* Row 1: level badge + cards button */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <div style={{
              background:"linear-gradient(135deg,#FFD70044,#FF8C0033)",
              border:"2px solid #FFD700", borderRadius:10,
              padding:"3px 10px", color:"#FFD700", fontWeight:900, fontSize:13,
            }}>
              ⭐ Nv.{stage.level}
            </div>
            <div style={{
              background:"rgba(255,255,255,.08)", border:"2px solid rgba(255,255,255,.15)",
              borderRadius:10, padding:"3px 10px",
              color:"rgba(255,255,255,.75)", fontWeight:700, fontSize:12,
            }}>
              {stage.name}
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={onChangePet} title="Cambiar Damigotchi" style={{
              background:"rgba(0,206,209,.14)", border:"2px solid #00CED1",
              borderRadius:10, padding:"4px 9px", cursor:"pointer",
              color:"#8FFFFF", fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:12,
            }}>
              🧬
            </button>
            <button onClick={onShop} style={{
              background:"rgba(46,204,64,.14)", border:"2px solid #2ECC40",
              borderRadius:10, padding:"4px 10px", cursor:"pointer",
              color:"#7CFF95", fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:12,
            }}>
              🛍️ ⭐ {pet.stars || 0}
            </button>
            <button onClick={onCollection} style={{
              background:"rgba(255,215,0,.15)", border:"2px solid #FFD700",
              borderRadius:10, padding:"4px 12px", cursor:"pointer",
              color:"#FFD700", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:12,
            }}>
              🃏 {earnedCards.length}
            </button>
            <button onClick={()=>onStudy("galeria")} style={{
              background:"rgba(233,30,99,.14)", border:"2px solid #E91E63",
              borderRadius:10, padding:"4px 10px", cursor:"pointer",
              color:"#FF9BD0", fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:12,
            }}>
              🖼️
            </button>
          </div>
        </div>

        {/* XP evolution bar */}
        {(() => {
          const xpp = getXpProgress(pet.xp);
          const isMax = stage.level >= 100;
          const barColor = stage.level < 20 ? "#FFD700"
            : stage.level < 40 ? "#2ECC40"
            : stage.level < 60 ? "#0074D9"
            : stage.level < 80 ? "#9B59B6"
            : "#FF4136";
          return (
            <div style={{
              background:"rgba(255,255,255,.06)", borderRadius:14,
              padding:"8px 12px",
              border:`1.5px solid ${barColor}44`,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:11, color:"rgba(255,255,255,.5)" }}>
                  🌱 Evolución
                </div>
                <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:11, color:barColor }}>
                  {isMax ? "¡MAESTRO 100! 🏆" : `${xpp.current}/${xpp.needed} XP → ${xpp.nextName}`}
                </div>
              </div>
              {/* segmented bar: show 10 mini segments per level-group */}
              <div style={{ display:"flex", gap:2 }}>
                {Array.from({length:10}, (_,i) => {
                  const segPct = xpp.pct / 10;
                  const filled = i < Math.floor(xpp.pct / 10);
                  const partial = i === Math.floor(xpp.pct / 10);
                  return (
                    <div key={i} style={{
                      flex:1, height:10, borderRadius:4,
                      background:"rgba(255,255,255,.08)",
                      overflow:"hidden", position:"relative",
                    }}>
                      <div style={{
                        position:"absolute", inset:0,
                        background: `linear-gradient(90deg,${barColor}cc,${barColor})`,
                        width: filled ? "100%" : partial ? `${(xpp.pct % 10) * 10}%` : "0%",
                        transition:"width .5s ease",
                        borderRadius:4,
                      }}/>
                    </div>
                  );
                })}
              </div>
              {/* mini level milestones */}
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                {[1,25,50,75,100].map(n => (
                  <div key={n} style={{
                    fontFamily:"'Nunito',sans-serif", fontSize:8, fontWeight:700,
                    color: stage.level >= n ? barColor : "rgba(255,255,255,.2)",
                  }}>Nv.{n}</div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Mood label */}
      <div style={{ fontSize:13, fontWeight:700, color: urgentVal<15&&!pet.dead?"#FF4136":"rgba(255,255,255,.55)", textAlign:"center", marginBottom:4, animation: urgentVal<15&&!pet.dead?"pulse 1s infinite":"none" }}>
        {moodText}
      </div>

      {/* Pet display */}
      <div style={{ position:"relative", marginBottom:6, cursor:"pointer" }}
           onClick={()=>!pet.dead&&care("love",8,`¡${pet.name} te adora! ❤️`)}>
        <PetSprite species={pet.species} expression={expression} xp={pet.xp} size={130} outfit={pet.outfit} action={pet.action}/>
        {!pet.dead && <div style={{ position:"absolute", bottom:-4, left:"50%", transform:"translateX(-50%)", fontSize:10, color:"rgba(255,255,255,.3)", fontFamily:"'Nunito',sans-serif", whiteSpace:"nowrap" }}>Toca para dar cariño ❤️</div>}
      </div>

      {/* Care message */}
      {careMsg && (
        <div style={{ background:"rgba(255,255,255,.14)", borderRadius:18, padding:"7px 16px", fontSize:14, fontWeight:700, color:"white", animation:"correctPop .3s ease", marginBottom:6, textAlign:"center", maxWidth:280 }}>
          {careMsg}
        </div>
      )}

      {/* Vida suave: sin barras ni castigos, solo mensajes y cuidado emocional */}
      <SoftLifePanel
        pet={pet}
        urgentNeed={urgentNeed}
        urgentVal={urgentVal}
        onCare={care}
        audio={audio}
        onStudy={onStudy}
        onCollection={onCollection}
      />

      {/* Study + cards */}
      {!pet.dead && (
        <div style={{ width:"100%", maxWidth:400 }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", fontWeight:700, marginBottom:6, textAlign:"center", letterSpacing:1 }}>APRENDER Y COLECCIONAR</div>

          <div style={{ background:"rgba(255,255,255,.06)", borderRadius:16, padding:"10px 12px", marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
              <div style={{ fontWeight:900, fontSize:13, color:"white" }}>🃏 {earnedCards.length}/{ALL_CARDS.length}</div>
              <div style={{ display:"flex", gap:5 }}>
                <button onClick={()=>{audio.playClick();onSkills();}} style={{ background:"rgba(155,89,182,.25)", border:"2px solid #9B59B6", borderRadius:8, padding:"3px 8px", cursor:"pointer", color:"#CE93D8", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:10 }}>
                  📚 Materias
                </button>
                <button onClick={()=>{audio.playClick();onBadges();}} style={{ background:"rgba(255,215,0,.18)", border:"2px solid #FFD700", borderRadius:8, padding:"3px 8px", cursor:"pointer", color:"#FFD700", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:10 }}>
                  🏅 Insignias
                </button>
                <button onClick={()=>{audio.playClick();onDiplomas();}} style={{ background:"rgba(0,206,209,.16)", border:"2px solid #00CED1", borderRadius:8, padding:"3px 8px", cursor:"pointer", color:"#91FFFF", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:10 }}>
                  📜 Diplomas
                </button>
                <button onClick={()=>{audio.playClick();setShowPicker(p=>!p);}} style={{ background:`${si.color}33`, border:`2px solid ${si.color}`, borderRadius:8, padding:"3px 8px", cursor:"pointer", color:si.color, fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:10 }}>
                  {si.icon} {showPicker?"▲":"▼"}
                </button>
              </div>
            </div>
            {showPicker && <div style={{marginBottom:8}}><SeriesPicker currentSeries={activeSeries} onPick={s=>{onSeriesChange(s);setShowPicker(false);audio.playClick();}}/></div>}
            <div style={{ height:7, background:"rgba(255,255,255,.1)", borderRadius:6, overflow:"hidden", marginBottom:3 }}>
              <div style={{ height:"100%", width:`${progress*100}%`, background:"linear-gradient(90deg,#9B59B6,#2ECC40,#FFD700)", borderRadius:6, transition:"width .5s" }}/>
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.4)", fontWeight:700 }}>
              {earnedCards.length < ALL_CARDS.length
                ? `Carta nueva cada 3 aciertos · Próxima en ${nextCardAt} puntos ⭐`
                : "¡Colección completa! 🏆"}
            </div>
          </div>

          <div style={{ marginBottom:10 }}>
            <button onClick={()=>{audio.playClick();onStudy("juegos");}} style={{
              width:"100%", background:"linear-gradient(135deg,#FF4136,#FF8C00)",
              border:"2px solid #FFD700", borderRadius:18, padding:"12px 10px",
              cursor:"pointer", boxShadow:"0 4px 0 rgba(0,0,0,.25)",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              color:"white", fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:16,
            }}>
              <span style={{fontSize:24}}>🎮</span>
              <span>Juegos divertidos</span>
              <span style={{fontSize:22}}>🎈</span>
            </button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:7 }}>
            {MODES.map(m=>{
              const prog = getSkillProgress(skills[m.skill]||0);
              return(
                <button key={m.id} onClick={()=>{audio.playClick();onStudy(m.id);}} style={{
                  background:`linear-gradient(135deg,${m.color}cc,${m.color}88)`,
                  border:`2px solid ${m.color}`, borderRadius:14, padding:"10px 6px",
                  cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                  boxShadow:`0 3px 0 rgba(0,0,0,.22)`, transition:"all .15s", outline:"none",
                }}>
                  <div style={{ fontSize:20 }}>{m.emoji}</div>
                  <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:12, color:"white" }}>{m.label}</div>
                  <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:9, color:"rgba(255,255,255,.85)" }}>
                    Nv.{prog.lvl} — {prog.name}
                  </div>
                  <div style={{ width:"80%", height:4, background:"rgba(255,255,255,.15)", borderRadius:3, overflow:"hidden", marginTop:1 }}>
                    <div style={{ height:"100%", width:`${prog.pct}%`, background:"rgba(255,255,255,.85)", borderRadius:3, transition:"width .4s" }}/>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dead */}
      {pet.dead && (
        <div style={{ textAlign:"center", marginTop:12 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"rgba(255,255,255,.55)", lineHeight:1.7, marginBottom:16 }}>
            {pet.name} no recibió suficiente cuidado 💔<br/>
            <span style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>¡Prometamos cuidarle mejor!</span>
          </div>
          <button onClick={()=>onCare("revive")} style={{
            background:"linear-gradient(135deg,#FFD700,#FF8C00)", border:"none",
            borderRadius:20, padding:"14px 32px",
            fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:18,
            color:"#222", cursor:"pointer",
            boxShadow:"0 5px 0 rgba(0,0,0,.25), 0 0 30px rgba(255,215,0,.4)",
          }}>
            💖 Revivir a {pet.name}
          </button>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════
//  MODO CREATIVO: DIBUJO, ANIMALITOS Y GALERÍA
// ══════════════════════════════════════════════════════
//  MODE: COLORING ANIMALS
// ══════════════════════════════════════════════════════
const ANIMAL_COLORING_PAGES = [
  { id:"gato", name:"Gato", emoji:"🐱", parts:[
    {id:"body", label:"Cuerpo", d:"M50 28 C32 28 20 43 20 62 C20 82 36 94 50 94 C64 94 80 82 80 62 C80 43 68 28 50 28 Z"},
    {id:"earL", label:"Oreja", d:"M30 34 L22 14 L44 28 Z"},
    {id:"earR", label:"Oreja", d:"M70 34 L78 14 L56 28 Z"},
    {id:"belly", label:"Guatita", d:"M38 62 C38 77 44 86 50 86 C56 86 62 77 62 62 C62 54 38 54 38 62 Z"}
  ]},
  { id:"perro", name:"Perro", emoji:"🐶", parts:[
    {id:"head", label:"Cabeza", d:"M50 26 C32 26 20 39 20 58 C20 77 34 90 50 90 C66 90 80 77 80 58 C80 39 68 26 50 26 Z"},
    {id:"earL", label:"Oreja", d:"M25 36 C10 44 10 66 24 73 C30 62 31 47 25 36 Z"},
    {id:"earR", label:"Oreja", d:"M75 36 C90 44 90 66 76 73 C70 62 69 47 75 36 Z"},
    {id:"snout", label:"Hocico", d:"M38 60 C38 72 45 80 50 80 C55 80 62 72 62 60 C62 52 38 52 38 60 Z"}
  ]},
  { id:"pez", name:"Pez", emoji:"🐠", parts:[
    {id:"body", label:"Cuerpo", d:"M15 55 C30 25 72 25 86 55 C72 85 30 85 15 55 Z"},
    {id:"tail", label:"Cola", d:"M84 55 L98 35 L98 75 Z"},
    {id:"finTop", label:"Aleta", d:"M42 32 L54 12 L66 34 Z"},
    {id:"finBottom", label:"Aleta", d:"M42 78 L54 96 L66 76 Z"}
  ]},
  { id:"mariposa", name:"Mariposa", emoji:"🦋", parts:[
    {id:"body", label:"Cuerpo", d:"M46 24 C46 18 54 18 54 24 L54 84 C54 92 46 92 46 84 Z"},
    {id:"wingL1", label:"Ala", d:"M46 42 C18 8 4 38 28 56 C16 72 34 85 46 64 Z"},
    {id:"wingR1", label:"Ala", d:"M54 42 C82 8 96 38 72 56 C84 72 66 85 54 64 Z"},
    {id:"dotL", label:"Mancha", d:"M25 42 C25 34 37 34 37 42 C37 50 25 50 25 42 Z"},
    {id:"dotR", label:"Mancha", d:"M63 42 C63 34 75 34 75 42 C75 50 63 50 63 42 Z"}
  ]},
  { id:"tortuga", name:"Tortuga", emoji:"🐢", parts:[
    {id:"shell", label:"Caparazón", d:"M25 56 C25 30 75 30 75 56 C75 78 25 78 25 56 Z"},
    {id:"head", label:"Cabeza", d:"M75 51 C90 45 96 58 84 66 C78 66 75 62 75 56 Z"},
    {id:"leg1", label:"Pata", d:"M28 72 C18 84 33 92 40 78 Z"},
    {id:"leg2", label:"Pata", d:"M60 78 C70 92 85 84 72 72 Z"},
    {id:"shell2", label:"Centro", d:"M38 48 C45 38 58 38 64 48 C60 62 43 62 38 48 Z"}
  ]},
  { id:"pajaro", name:"Pájaro", emoji:"🐦", parts:[
    {id:"body", label:"Cuerpo", d:"M28 58 C28 34 52 22 70 38 C84 52 76 82 52 88 C36 84 28 72 28 58 Z"},
    {id:"wing", label:"Ala", d:"M42 55 C50 45 68 50 70 66 C58 70 48 66 42 55 Z"},
    {id:"beak", label:"Pico", d:"M72 45 L96 52 L72 60 Z"},
    {id:"tail", label:"Cola", d:"M28 62 L8 50 L14 70 Z"}
  ]},
];

function ColorAnimalsMode({ audio, onBack, onScore, onCare }) {
  const [pageIdx, setPageIdx] = useState(0);
  const [color, setColor] = useState("#FF8C00");
  const [fills, setFills] = useState({});
  const [savedMsg, setSavedMsg] = useState(false);
  const page = ANIMAL_COLORING_PAGES[pageIdx];

  const paint = (partId) => {
    setFills(f => ({...f, [partId]: color}));
    audio.playClick();
  };

  const clear = () => {
    setFills({});
    audio.playClick();
  };

  const nextAnimal = () => {
    setPageIdx(i => (i + 1) % ANIMAL_COLORING_PAGES.length);
    setFills({});
    audio.playClick();
  };

  const savePainting = () => {
    const svg = document.getElementById("animal-coloring-svg");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const data = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serialized);
    const saved = JSON.parse(localStorage.getItem("damigotchi_paintings") || "[]");
    const next = [{ id: Date.now(), animal: page.name, img: data }, ...saved].slice(0, 36);
    localStorage.setItem("damigotchi_paintings", JSON.stringify(next));
    audio.playCorrect();
    onScore && onScore(4);
    onCare && onCare("love", 12);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1600);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:16,fontFamily:"'Nunito',sans-serif",position:"relative",overflowY:"auto"}}>
      <BackBtn onClick={onBack}/>
      <SoundBar audio={audio}/>
      <div style={{fontSize:15,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:6,letterSpacing:2}}>🐾 PINTA ANIMALITOS</div>
      <div style={{...CARD,padding:"20px 16px",width:"100%",maxWidth:440,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <div style={{fontSize:24,fontWeight:900,color:"#FFD700",textAlign:"center"}}>{page.emoji} {page.name}</div>
        <div style={{color:"rgba(255,255,255,.6)",fontWeight:800,fontSize:13,textAlign:"center"}}>Elige un color y toca una parte del animalito</div>
        <svg id="animal-coloring-svg" width="320" height="320" viewBox="0 0 100 100" style={{maxWidth:"100%",height:"auto",background:"#fff",border:"4px solid #FFD700",borderRadius:22,boxShadow:"0 10px 30px rgba(0,0,0,.35)",touchAction:"manipulation"}}>
          <rect x="0" y="0" width="100" height="100" fill="#ffffff"/>
          {page.parts.map(part => (
            <path key={part.id} d={part.d} fill={fills[part.id] || "#FFFFFF"} stroke="#222" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" onClick={() => paint(part.id)} style={{cursor:"pointer"}}/>
          ))}
          {page.id === "gato" && <><circle cx="42" cy="54" r="2.5" fill="#222"/><circle cx="58" cy="54" r="2.5" fill="#222"/><path d="M46 66 Q50 70 54 66" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round"/></>}
          {page.id === "perro" && <><circle cx="42" cy="52" r="2.5" fill="#222"/><circle cx="58" cy="52" r="2.5" fill="#222"/><circle cx="50" cy="64" r="3" fill="#222"/></>}
          {page.id === "pez" && <circle cx="32" cy="50" r="2.5" fill="#222"/>}
          {page.id === "pajaro" && <circle cx="62" cy="42" r="2.5" fill="#222"/>}
          {page.id === "tortuga" && <circle cx="85" cy="56" r="2" fill="#222"/>}
        </svg>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
          {DRAW_COLORS.map(c => (
            <button key={c} onClick={()=>{setColor(c);audio.playClick();}} style={{width:36,height:36,borderRadius:"50%",background:c,border:`4px solid ${color===c?"#FFD700":"rgba(255,255,255,.25)"}`,boxShadow:"0 3px 0 rgba(0,0,0,.25)",cursor:"pointer"}}/>
          ))}
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
          <button onClick={clear} style={{background:"rgba(255,255,255,.1)",border:"2px solid rgba(255,255,255,.2)",borderRadius:16,padding:"10px 16px",color:"white",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer"}}>🧼 Limpiar</button>
          <button onClick={nextAnimal} style={{background:"rgba(255,255,255,.1)",border:"2px solid rgba(255,255,255,.2)",borderRadius:16,padding:"10px 16px",color:"white",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer"}}>🐾 Otro animal</button>
          <button onClick={savePainting} style={{background:"linear-gradient(135deg,#FFD700,#FF8C00)",border:"none",borderRadius:16,padding:"10px 18px",color:"#222",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer",boxShadow:"0 5px 0 rgba(0,0,0,.25)"}}>💾 Guardar pintura</button>
        </div>
        {savedMsg && <div style={{fontSize:16,fontWeight:900,color:"#2ECC40",animation:"correctPop .35s ease",textAlign:"center"}}>¡Pintura guardada! +4 XP y cariño ❤️</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  MODE: DRAWING + GALLERY
// ══════════════════════════════════════════════════════
const DRAW_COLORS = ["#FF4136", "#FF8C00", "#FFD700", "#2ECC40", "#0074D9", "#9B59B6", "#FF69B4", "#00CED1", "#FFFFFF", "#111111"];

function DrawMode({ audio, onBack, onScore, onCare }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#FF4136");
  const [brush, setBrush] = useState(8);
  const [savedMsg, setSavedMsg] = useState(false);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const visible = Math.min(360, Math.max(300, Math.floor(window.innerWidth - 36)));
    canvas.style.width = `${visible}px`;
    canvas.style.height = `${visible}px`;
    canvas.width = Math.floor(visible * ratio);
    canvas.height = Math.floor(visible * ratio);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, visible, visible);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
  }, []);

  useEffect(() => { setupCanvas(); }, [setupCanvas]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    audio.playClick();
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = Number(brush);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = (e) => {
    if (e) e.preventDefault();
    setDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, rect.width, rect.height);
    audio.playClick();
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    const data = canvas.toDataURL("image/png");
    const saved = JSON.parse(localStorage.getItem("damigotchi_drawings") || "[]");
    const next = [{ id: Date.now(), img: data }, ...saved].slice(0, 24);
    localStorage.setItem("damigotchi_drawings", JSON.stringify(next));
    audio.playCorrect();
    onScore && onScore(3);
    onCare && onCare("love", 10);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1600);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:16,fontFamily:"'Nunito',sans-serif",position:"relative",overflowY:"auto"}}>
      <BackBtn onClick={onBack}/>
      <SoundBar audio={audio}/>
      <div style={{fontSize:15,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:6,letterSpacing:2}}>🎨 TALLER DE DIBUJO</div>
      <div style={{...CARD,padding:"20px 16px",width:"100%",maxWidth:430,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <div style={{fontSize:22,fontWeight:900,color:"#FFD700",textAlign:"center"}}>Dibuja con tu Damigotchi</div>
        <canvas
          ref={canvasRef}
          onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
          style={{border:"4px solid #FFD700",borderRadius:22,background:"white",boxShadow:"0 10px 30px rgba(0,0,0,.35)",touchAction:"none",maxWidth:"100%"}}
        />
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
          {DRAW_COLORS.map(c => (
            <button key={c} onClick={()=>{setColor(c);audio.playClick();}} style={{width:34,height:34,borderRadius:"50%",background:c,border:`4px solid ${color===c?"#FFD700":"rgba(255,255,255,.25)"}`,boxShadow:"0 3px 0 rgba(0,0,0,.25)",cursor:"pointer"}}/>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,color:"white",fontWeight:900,width:"100%",justifyContent:"center"}}>
          ✏️ Pincel
          <input type="range" min="3" max="24" value={brush} onChange={e=>setBrush(e.target.value)} style={{width:160}}/>
          <span style={{color:"#FFD700"}}>{brush}</span>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
          <button onClick={clear} style={{background:"rgba(255,255,255,.1)",border:"2px solid rgba(255,255,255,.2)",borderRadius:16,padding:"10px 18px",color:"white",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer"}}>🧼 Limpiar</button>
          <button onClick={saveDrawing} style={{background:"linear-gradient(135deg,#FFD700,#FF8C00)",border:"none",borderRadius:16,padding:"10px 20px",color:"#222",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer",boxShadow:"0 5px 0 rgba(0,0,0,.25)"}}>💾 Guardar dibujo</button>
        </div>
        {savedMsg && <div style={{fontSize:16,fontWeight:900,color:"#2ECC40",animation:"correctPop .35s ease",textAlign:"center"}}>¡Dibujo guardado! +3 XP y cariño ❤️</div>}
      </div>
    </div>
  );
}

function GalleryMode({ onBack, audio }) {
  const [drawings, setDrawings] = useState([]);
  const [paintings, setPaintings] = useState([]);
  useEffect(() => {
    setDrawings(JSON.parse(localStorage.getItem("damigotchi_drawings") || "[]"));
    setPaintings(JSON.parse(localStorage.getItem("damigotchi_paintings") || "[]"));
  }, []);

  const removeDrawing = (id) => {
    const next = drawings.filter(d => d.id !== id);
    setDrawings(next);
    localStorage.setItem("damigotchi_drawings", JSON.stringify(next));
    audio && audio.playClick();
  };

  const removePainting = (id) => {
    const next = paintings.filter(d => d.id !== id);
    setPaintings(next);
    localStorage.setItem("damigotchi_paintings", JSON.stringify(next));
    audio && audio.playClick();
  };

  return (
    <div style={{minHeight:"100vh",background:BG,padding:16,fontFamily:"'Nunito',sans-serif",position:"relative",overflowY:"auto"}}>
      <BackBtn onClick={onBack}/>
      <div style={{height:44}}/>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        <div style={{textAlign:"center",fontSize:28,fontWeight:900,color:"#FFD700",textShadow:"2px 3px 0 rgba(0,0,0,.25)",marginBottom:8}}>🖼️ Galería creativa</div>
        <div style={{textAlign:"center",fontSize:13,fontWeight:700,color:"rgba(255,255,255,.55)",marginBottom:18}}>Aquí quedan guardados dibujos y animalitos pintados.</div>

        <div style={{fontSize:20,fontWeight:900,color:"#FFD700",margin:"12px 0 10px"}}>🎨 Dibujos libres</div>
        {drawings.length === 0 ? (
          <div style={{...CARD,padding:22,textAlign:"center",color:"rgba(255,255,255,.7)",fontWeight:900,marginBottom:18}}>Todavía no hay dibujos guardados 🎨</div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:14,marginBottom:22}}>
            {drawings.map((d, i) => (
              <div key={d.id} style={{background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,215,0,.35)",borderRadius:18,padding:10,boxShadow:"0 8px 24px rgba(0,0,0,.25)"}}>
                <img src={d.img} alt={`Dibujo ${i+1}`} style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",background:"white",borderRadius:12,border:"2px solid #FFD700"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                  <div style={{fontSize:12,fontWeight:900,color:"#FFD700"}}>Dibujo {drawings.length - i}</div>
                  <button onClick={()=>removeDrawing(d.id)} style={{background:"rgba(255,65,54,.18)",border:"2px solid #FF4136",borderRadius:10,color:"#FFB3AD",fontWeight:900,cursor:"pointer"}}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{fontSize:20,fontWeight:900,color:"#2ECC40",margin:"12px 0 10px"}}>🐾 Animalitos pintados</div>
        {paintings.length === 0 ? (
          <div style={{...CARD,padding:22,textAlign:"center",color:"rgba(255,255,255,.7)",fontWeight:900}}>Todavía no hay animalitos pintados 🐾</div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:14}}>
            {paintings.map((d, i) => (
              <div key={d.id} style={{background:"rgba(255,255,255,.08)",border:"2px solid rgba(46,204,64,.35)",borderRadius:18,padding:10,boxShadow:"0 8px 24px rgba(0,0,0,.25)"}}>
                <img src={d.img} alt={`Animalito ${i+1}`} style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",background:"white",borderRadius:12,border:"2px solid #2ECC40"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                  <div style={{fontSize:12,fontWeight:900,color:"#2ECC40"}}>{d.animal || "Animalito"}</div>
                  <button onClick={()=>removePainting(d.id)} style={{background:"rgba(255,65,54,.18)",border:"2px solid #FF4136",borderRadius:10,color:"#FFB3AD",fontWeight:900,cursor:"pointer"}}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



function FooterAutor(){
  return (
    <div style={{
      position:"fixed", bottom:8, left:"50%", transform:"translateX(-50%)",
      background:"rgba(0,0,0,.20)", backdropFilter:"blur(6px)",
      border:"1px solid rgba(255,255,255,.12)", borderRadius:14,
      padding:"4px 12px", fontSize:11, fontFamily:"'Nunito',sans-serif",
      color:"rgba(255,255,255,.72)", fontWeight:800, zIndex:999, pointerEvents:"none",
      boxShadow:"0 4px 16px rgba(0,0,0,.18)", whiteSpace:"nowrap"
    }}>
      🇨🇱 Creado por Ricardo Toledo Barria
    </div>
  );
}
// ══════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
//  GAMES HUB + BALLOON GAME
// ══════════════════════════════════════════════════════
const BALLOON_COLORS = [
  { name:"rojo", color:"#FF4136" },
  { name:"azul", color:"#0074D9" },
  { name:"verde", color:"#2ECC40" },
  { name:"amarillo", color:"#FFD700" },
  { name:"morado", color:"#9B59B6" },
  { name:"rosado", color:"#FF69B4" },
];

function GamesHub({ audio, onBack, onPlayBalloons, onPlayBeaver, onPlayComplete, onPlayCaterpillar, onPlayBlocks }) {
  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:"18px 16px 34px",fontFamily:"'Nunito',sans-serif"}}>
      <BackBtn onClick={onBack}/>
      <div style={{marginTop:54,fontSize:26,fontWeight:900,color:"white",textShadow:"2px 3px 0 rgba(0,0,0,.3)"}}>🎮 Juegos</div>
      <div style={{color:"rgba(255,255,255,.55)",fontWeight:700,fontSize:14,margin:"6px 0 18px",textAlign:"center"}}>Minijuegos cortitos para ganar estrellas, cartas e insignias</div>

      <div style={{...CARD,width:"100%",maxWidth:420,padding:18,textAlign:"center"}}>
        <div style={{fontSize:56,animation:"bounce 1.2s infinite"}}>🎈</div>
        <div style={{fontSize:22,fontWeight:900,color:"#FFD700",marginTop:4}}>Revienta Globos</div>
        <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,.65)",lineHeight:1.5,margin:"8px 0 16px"}}>
          Revienta los globos que caen. Al subir de nivel aparecen más globos y después Damigotchi te pedirá un color específico.
        </div>
        <button onClick={()=>{audio.playClick();onPlayBalloons();}} style={{background:"linear-gradient(135deg,#FF4136,#FF8C00)",border:"none",borderRadius:18,padding:"13px 28px",color:"white",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:18,cursor:"pointer",boxShadow:"0 5px 0 rgba(0,0,0,.25)"}}>
          🎈 Jugar ahora
        </button>
      </div>

      <div style={{...CARD,width:"100%",maxWidth:420,padding:18,textAlign:"center",marginTop:16,border:"2px solid rgba(255,215,0,.22)"}}>
        <div style={{fontSize:56,animation:"beaverPeek .9s ease-in-out infinite"}}>🦫</div>
        <div style={{fontSize:22,fontWeight:900,color:"#FFD700",marginTop:4}}>Chipote al Castor</div>
        <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,.65)",lineHeight:1.5,margin:"8px 0 16px"}}>
          Golpea castores, evita trampas y supera niveles. En niveles altos se mueven, engañan y aparece el castor dorado.
        </div>
        <button onClick={()=>{audio.playClick();onPlayBeaver();}} style={{background:"linear-gradient(135deg,#8B5A2B,#FFD700)",border:"none",borderRadius:18,padding:"13px 28px",color:"white",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:18,cursor:"pointer",boxShadow:"0 5px 0 rgba(0,0,0,.25)"}}>
          🦫 Jugar ahora
        </button>
      </div>

      <div style={{...CARD,width:"100%",maxWidth:420,padding:18,textAlign:"center",marginTop:16,border:"2px solid rgba(255,215,0,.28)"}}>
        <div style={{fontSize:56,animation:"iconBounce 1.4s ease-in-out infinite"}}>🧩</div>
        <div style={{fontSize:22,fontWeight:900,color:"#FFD700",marginTop:4}}>Completa el Damigotchi</div>
        <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,.65)",lineHeight:1.5,margin:"8px 0 16px"}}>
          Reconoce las razas y coloca la cabeza correcta. A medida que subes de nivel aparecen más opciones y más partes para completar.
        </div>
        <button onClick={()=>{audio.playClick();onPlayComplete();}} style={{background:"linear-gradient(135deg,#6C5CE7,#FFD700)",border:"none",borderRadius:18,padding:"13px 28px",color:"white",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:18,cursor:"pointer",boxShadow:"0 5px 0 rgba(0,0,0,.25)"}}>
          🧩 Jugar ahora
        </button>
      </div>

      <div style={{...CARD,width:"100%",maxWidth:420,padding:18,textAlign:"center",marginTop:16,border:"2px solid rgba(76,175,80,.28)"}}>
        <div style={{fontSize:56,animation:"caterpillarWiggle 1.1s ease-in-out infinite"}}>🐛</div>
        <div style={{fontSize:22,fontWeight:900,color:"#FFD700",marginTop:4}}>Cuncuna Damigotchi</div>
        <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,.65)",lineHeight:1.5,margin:"8px 0 16px"}}>
          Come frutas, crece y aprende colores. En niveles avanzados debe comer solo la fruta del color que Damigotchi pide.
        </div>
        <button onClick={()=>{audio.playClick();onPlayCaterpillar();}} style={{background:"linear-gradient(135deg,#4CAF50,#FFD700)",border:"none",borderRadius:18,padding:"13px 28px",color:"white",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:18,cursor:"pointer",boxShadow:"0 5px 0 rgba(0,0,0,.25)"}}>
          🐛 Jugar ahora
        </button>
      </div>

      <div style={{...CARD,width:"100%",maxWidth:420,padding:18,textAlign:"center",marginTop:16,border:"2px solid rgba(255,140,0,.28)"}}>
        <div style={{fontSize:56,animation:"blocksFloat 1.3s ease-in-out infinite"}}>🧱</div>
        <div style={{fontSize:22,fontWeight:900,color:"#FFD700",marginTop:4}}>Construye para tu Damigotchi</div>
        <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,.65)",lineHeight:1.5,margin:"8px 0 16px"}}>
          Coloca bloques grandes para completar casitas, torres y puentes. Aprende formas, colores y pensamiento espacial.
        </div>
        <button onClick={()=>{audio.playClick();onPlayBlocks();}} style={{background:"linear-gradient(135deg,#FF8C00,#FFD700)",border:"none",borderRadius:18,padding:"13px 28px",color:"white",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:18,cursor:"pointer",boxShadow:"0 5px 0 rgba(0,0,0,.25)"}}>
          🧱 Jugar ahora
        </button>
      </div>
    </div>
  );
}




function BlocksDamigotchiMode({ audio, onBack, onScore, onCare }) {
  const SHAPES = [
    { id:"square", name:"Cuadrado", emoji:"⬛", color:"#FF4136" },
    { id:"rect", name:"Rectángulo", emoji:"▬", color:"#0074D9" },
    { id:"tri", name:"Triángulo", emoji:"🔺", color:"#2ECC40" },
    { id:"roof", name:"Techo", emoji:"🔶", color:"#FFD700" },
  ];

  const PATTERNS = [
    { name:"Casita", icon:"🏠", slots:[
      {x:1,y:0,shape:"roof"}, {x:0,y:1,shape:"square"}, {x:1,y:1,shape:"square"}, {x:2,y:1,shape:"square"},
      {x:0,y:2,shape:"rect"}, {x:1,y:2,shape:"rect"}, {x:2,y:2,shape:"rect"},
    ]},
    { name:"Torre", icon:"🗼", slots:[
      {x:1,y:0,shape:"square"}, {x:1,y:1,shape:"square"}, {x:1,y:2,shape:"square"}, {x:1,y:3,shape:"rect"},
      {x:0,y:4,shape:"rect"}, {x:1,y:4,shape:"rect"}, {x:2,y:4,shape:"rect"},
    ]},
    { name:"Puente", icon:"🌉", slots:[
      {x:0,y:2,shape:"square"}, {x:1,y:2,shape:"rect"}, {x:2,y:2,shape:"rect"}, {x:3,y:2,shape:"square"},
      {x:0,y:3,shape:"rect"}, {x:3,y:3,shape:"rect"},
    ]},
  ];

  const [level, setLevel] = useState(1);
  const [patternIdx, setPatternIdx] = useState(0);
  const [filled, setFilled] = useState({});
  const [current, setCurrent] = useState(null);
  const [score, setScore] = useState(0);
  const [burst, setBurst] = useState(false);
  const [wrong, setWrong] = useState(false);

  const pattern = PATTERNS[patternIdx % PATTERNS.length];
  const neededSlots = pattern.slots;
  const completed = Object.keys(filled).length >= neededSlots.length;

  const randomPiece = useCallback((lvl=level) => {
    const remaining = neededSlots.filter((s,i)=>!filled[i]);
    const useCorrectOften = Math.random() < Math.max(.55, .86 - lvl*.04);
    const source = remaining.length && useCorrectOften ? remaining[Math.floor(Math.random()*remaining.length)].shape : SHAPES[Math.floor(Math.random()*SHAPES.length)].id;
    const shape = SHAPES.find(s=>s.id===source) || SHAPES[0];
    return { ...shape, key:Math.random() };
  }, [filled, level, neededSlots]);

  useEffect(()=>{ if(!current) setCurrent(randomPiece(level)); }, [current, randomPiece, level]);

  const nextPattern = () => {
    setFilled({});
    setCurrent(null);
    setPatternIdx(i=>i+1);
  };

  const completeBuild = () => {
    audio.playCorrect();
    setBurst(true); setTimeout(()=>setBurst(false), 900);
    setScore(s=>s+1);
    onScore && onScore(2);
    onCare && onCare("learn", 6);
    setTimeout(()=>{
      if ((score+1) % 3 === 0) setLevel(l=>l+1);
      nextPattern();
    }, 1100);
  };

  useEffect(()=>{ if(completed) completeBuild(); }, [completed]);

  const place = (idx) => {
    if (!current || filled[idx]) return;
    const slot = neededSlots[idx];
    if (slot.shape === current.id) {
      audio.playConnect ? audio.playConnect() : audio.playClick();
      setFilled(prev=>({ ...prev, [idx]:current }));
      setCurrent(null);
    } else {
      audio.playWrong();
      setWrong(true); setTimeout(()=>setWrong(false), 350);
    }
  };

  const maxX = Math.max(...neededSlots.map(s=>s.x))+1;
  const maxY = Math.max(...neededSlots.map(s=>s.y))+1;
  const slotSize = level >= 5 ? 58 : 66;

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:"18px 14px 34px",fontFamily:"'Nunito',sans-serif",position:"relative"}}>
      <StarBurst show={burst}/>
      <BackBtn onClick={onBack}/>
      <SoundBar audio={audio}/>

      <div style={{marginTop:38,fontSize:14,fontWeight:900,color:"rgba(255,255,255,.52)",letterSpacing:2}}>🧱 CONSTRUYE PARA TU DAMIGOTCHI</div>
      <div style={{display:"flex",gap:10,margin:"8px 0 12px",flexWrap:"wrap",justifyContent:"center"}}>
        <div style={{background:"rgba(255,215,0,.12)",border:"2px solid rgba(255,215,0,.45)",borderRadius:14,padding:"6px 12px",color:"#FFD700",fontWeight:900}}>Nv.{level}</div>
        <div style={{background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.12)",borderRadius:14,padding:"6px 12px",color:"white",fontWeight:900}}>🏗️ {score}</div>
      </div>

      <div style={{...CARD,width:"100%",maxWidth:440,padding:"16px 14px 18px",textAlign:"center"}}>
        <div style={{fontSize:15,fontWeight:900,color:"#FFD700",marginBottom:6}}>
          {pattern.icon} Construye: {pattern.name}
        </div>
        <div style={{fontSize:12,fontWeight:800,color:"rgba(255,255,255,.55)",marginBottom:12}}>
          Toca el espacio que corresponde a la pieza actual.
        </div>

        <div style={{
          margin:"0 auto 14px",
          width:Math.min(360, maxX*slotSize+20),
          minHeight:maxY*slotSize+20,
          borderRadius:24,
          background:"linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03))",
          border:`3px solid ${wrong?"#FF4136":"rgba(255,215,0,.22)"}`,
          display:"grid",
          gridTemplateColumns:`repeat(${maxX}, ${slotSize}px)`,
          gridTemplateRows:`repeat(${maxY}, ${slotSize}px)`,
          gap:4,
          justifyContent:"center",
          alignContent:"center",
          transition:"border .18s"
        }}>
          {Array.from({length:maxX*maxY}).map((_,gridIdx)=>{
            const x = gridIdx % maxX;
            const y = Math.floor(gridIdx / maxX);
            const slotIdx = neededSlots.findIndex(s=>s.x===x && s.y===y);
            const isSlot = slotIdx >= 0;
            const filledPiece = isSlot ? filled[slotIdx] : null;
            const slot = isSlot ? neededSlots[slotIdx] : null;
            const slotShape = slot ? SHAPES.find(s=>s.id===slot.shape) : null;
            return (
              <button key={gridIdx} onClick={()=>isSlot && place(slotIdx)} disabled={!isSlot || !!filledPiece} style={{
                width:slotSize,
                height:slotSize,
                borderRadius:14,
                border:isSlot?`3px dashed ${slotShape?.color || "#fff"}88`:"none",
                background:filledPiece ? filledPiece.color : isSlot ? "rgba(255,255,255,.08)" : "transparent",
                color:"white",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                fontSize:filledPiece?28:20,
                cursor:isSlot && !filledPiece ? "pointer" : "default",
                opacity:isSlot?1:.25,
                boxShadow:filledPiece?"0 6px 0 rgba(0,0,0,.22)":"none",
                transition:"all .18s",
                fontFamily:"'Nunito',sans-serif",
                fontWeight:900
              }}>
                {filledPiece ? filledPiece.emoji : isSlot ? "?" : ""}
              </button>
            );
          })}
        </div>

        <div style={{
          margin:"0 auto",
          width:"100%",
          maxWidth:320,
          borderRadius:22,
          background:"rgba(255,215,0,.12)",
          border:"3px solid rgba(255,215,0,.35)",
          padding:14,
          display:"flex",
          alignItems:"center",
          justifyContent:"space-between",
          gap:12
        }}>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:12,fontWeight:900,color:"rgba(255,255,255,.55)"}}>Pieza actual</div>
            <div style={{fontSize:18,fontWeight:900,color:"#FFD700"}}>{current?.name || "..."}</div>
          </div>
          <div style={{width:66,height:66,borderRadius:18,background:current?.color || "#777",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,boxShadow:"0 7px 0 rgba(0,0,0,.22)"}}>
            {current?.emoji || "🧱"}
          </div>
        </div>

        <button onClick={()=>setCurrent(randomPiece(level))} style={{marginTop:12,background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.14)",borderRadius:14,padding:"8px 16px",color:"rgba(255,255,255,.7)",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer"}}>
          🔄 Cambiar pieza
        </button>
      </div>
    </div>
  );
}

function CaterpillarGameMode({ audio, onBack, onScore, onCare }) {
  const FRUITS = [
    { emoji:"🍎", color:"rojo", hex:"#FF4136", label:"manzana" },
    { emoji:"🍌", color:"amarillo", hex:"#FFD700", label:"plátano" },
    { emoji:"🍇", color:"morado", hex:"#9B59B6", label:"uva" },
    { emoji:"🍊", color:"naranjo", hex:"#FF8C00", label:"naranja" },
    { emoji:"🍐", color:"verde", hex:"#2ECC40", label:"pera" },
  ];

  const randomFruit = (level) => {
    const f = FRUITS[Math.floor(Math.random()*FRUITS.length)];
    return { ...f, id: Math.random(), x: 6 + Math.random()*88, y: -10, speed: 0.55 + level*.08 + Math.random()*.25 };
  };

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [length, setLength] = useState(3);
  const [fruits, setFruits] = useState([]);
  const [targetColor, setTargetColor] = useState(null);
  const [burst, setBurst] = useState(false);
  const [miss, setMiss] = useState(false);
  const gameRef = useRef({ fruits:[], level:1, targetColor:null });

  useEffect(()=>{ gameRef.current = { fruits, level, targetColor }; }, [fruits, level, targetColor]);

  useEffect(()=>{
    setTargetColor(level >= 4 ? FRUITS[Math.floor(Math.random()*FRUITS.length)].color : null);
  }, [level]);

  useEffect(()=>{
    const spawnMs = Math.max(520, 1050 - level*70);
    const spawner = setInterval(()=>{
      setFruits(prev => {
        const max = Math.min(9, 2 + Math.floor(level/2));
        if (prev.length >= max) return prev;
        return [...prev, randomFruit(level)];
      });
    }, spawnMs);

    const mover = setInterval(()=>{
      setFruits(prev => prev
        .map(f => ({ ...f, y:f.y + f.speed }))
        .filter(f => f.y < 112)
      );
    }, 45);

    return ()=>{ clearInterval(spawner); clearInterval(mover); };
  }, [level]);

  const eatFruit = (fruitId) => {
    const fruit = gameRef.current.fruits.find(f=>f.id===fruitId);
    if (!fruit) return;

    const mustColor = gameRef.current.targetColor;
    const ok = !mustColor || fruit.color === mustColor;

    setFruits(prev => prev.filter(f=>f.id!==fruitId));

    if (ok) {
      audio.playCorrect();
      setBurst(true); setTimeout(()=>setBurst(false), 650);
      setScore(s=>s+1);
      setLength(l=>Math.min(12, l+1));
      onScore && onScore(1);
      onCare && onCare("hunger", 4);

      const nextScore = score + 1;
      if (nextScore > 0 && nextScore % 6 === 0) {
        setLevel(l=>l+1);
        setLength(3);
      }
    } else {
      audio.playWrong();
      setMiss(true); setTimeout(()=>setMiss(false), 450);
      setLength(l=>Math.max(2, l-1));
    }
  };

  const targetFruit = targetColor ? FRUITS.find(f=>f.color===targetColor) : null;

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:"18px 14px 34px",fontFamily:"'Nunito',sans-serif",position:"relative",overflow:"hidden"}}>
      <StarBurst show={burst}/>
      <BackBtn onClick={onBack}/>
      <SoundBar audio={audio}/>

      <div style={{marginTop:38,fontSize:14,fontWeight:900,color:"rgba(255,255,255,.52)",letterSpacing:2}}>🐛 CUNCUNA DAMIGOTCHI</div>
      <div style={{display:"flex",gap:10,margin:"8px 0 12px",flexWrap:"wrap",justifyContent:"center"}}>
        <div style={{background:"rgba(255,215,0,.12)",border:"2px solid rgba(255,215,0,.45)",borderRadius:14,padding:"6px 12px",color:"#FFD700",fontWeight:900}}>Nv.{level}</div>
        <div style={{background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.12)",borderRadius:14,padding:"6px 12px",color:"white",fontWeight:900}}>🍎 {score}</div>
        <div style={{background:"rgba(76,175,80,.14)",border:"2px solid rgba(76,175,80,.42)",borderRadius:14,padding:"6px 12px",color:"#7CFF8A",fontWeight:900}}>Largo {length}</div>
      </div>

      <div style={{...CARD,width:"100%",maxWidth:430,padding:"14px 14px 18px",textAlign:"center"}}>
        <div style={{fontSize:15,fontWeight:900,color:"#FFD700",marginBottom:8}}>
          {targetFruit ? `Come solo frutas de color ${targetFruit.color} ${targetFruit.emoji}` : "Come las frutas para hacer crecer la cuncuna"}
        </div>

        <div style={{
          position:"relative",
          height:420,
          borderRadius:26,
          background:"linear-gradient(180deg,rgba(67,160,71,.22),rgba(46,125,50,.08))",
          border:"3px solid rgba(76,175,80,.30)",
          overflow:"hidden",
          boxShadow: miss ? "0 0 0 4px rgba(255,65,54,.45)" : "inset 0 0 28px rgba(0,0,0,.16)",
          transition:"box-shadow .2s"
        }}>
          {/* grass */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:38,background:"linear-gradient(180deg,rgba(76,175,80,.1),rgba(76,175,80,.35))"}}/>

          {fruits.map(f=>(
            <button key={f.id} onClick={()=>eatFruit(f.id)} style={{
              position:"absolute",
              left:`${f.x}%`,
              top:`${f.y}%`,
              transform:"translate(-50%,-50%)",
              background:"rgba(255,255,255,.12)",
              border:`3px solid ${f.hex}`,
              borderRadius:"50%",
              width:54,
              height:54,
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              fontSize:31,
              cursor:"pointer",
              boxShadow:`0 7px 0 rgba(0,0,0,.18),0 0 16px ${f.hex}55`,
              animation:"fruitFallWobble .9s ease-in-out infinite",
              zIndex:5
            }}>
              {f.emoji}
            </button>
          ))}

          {/* caterpillar */}
          <div style={{position:"absolute",left:"50%",bottom:34,transform:"translateX(-50%)",display:"flex",alignItems:"center",justifyContent:"center",gap:0,zIndex:8,animation:"caterpillarWiggle 1.2s ease-in-out infinite"}}>
            {Array.from({length}).map((_,i)=>(
              <div key={i} style={{
                width:i===0?46:34,
                height:i===0?46:34,
                borderRadius:"50%",
                background:i===0?"#7CFC00":"#4CAF50",
                border:"3px solid rgba(0,0,0,.18)",
                marginLeft:i===0?0:-8,
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                boxShadow:"0 6px 0 rgba(0,0,0,.18)",
                position:"relative",
                zIndex:20-i
              }}>
                {i===0 && (
                  <>
                    <span style={{position:"absolute",top:13,left:12,width:7,height:9,background:"#111",borderRadius:"50%"}}/>
                    <span style={{position:"absolute",top:13,right:12,width:7,height:9,background:"#111",borderRadius:"50%"}}/>
                    <span style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",width:18,height:8,borderBottom:"3px solid #111",borderRadius:"0 0 20px 20px"}}/>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{fontSize:12,fontWeight:800,color:"rgba(255,255,255,.45)",marginTop:10,lineHeight:1.25}}>
          Cada 6 frutas sube el nivel. Desde nivel 4 debe comer solo el color que se pide.
        </div>
      </div>
    </div>
  );
}

function CompleteDamigotchiGameMode({ audio, onBack, onScore, onCare }) {
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [targetId, setTargetId] = useState(()=>PET_SPECIES[Math.floor(Math.random()*PET_SPECIES.length)].id);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pieces, setPieces] = useState({ head:false, symbol:false, name:false });
  const [burst, setBurst] = useState(false);

  const target = PET_SPECIES.find(s=>s.id===targetId) || PET_SPECIES[0];

  const makeRound = useCallback((nextLevel=level) => {
    const t = PET_SPECIES[Math.floor(Math.random()*PET_SPECIES.length)];
    const optionCount = Math.min(8, 3 + Math.floor(nextLevel / 2));
    const distractors = PET_SPECIES
      .filter(s=>s.id!==t.id)
      .sort(()=>Math.random()-.5)
      .slice(0, optionCount-1);
    const all = [t, ...distractors].sort(()=>Math.random()-.5);

    setTargetId(t.id);
    setOptions(all);
    setSelected(null);
    setPieces({
      head: nextLevel < 3 ? false : Math.random() > .25,
      symbol: nextLevel < 5 ? true : Math.random() > .35,
      name: nextLevel < 7 ? true : Math.random() > .45,
    });
  }, [level]);

  useEffect(()=>{ makeRound(level); }, []);

  const currentTask = level < 3
    ? "Elige la cabeza correcta"
    : level < 5
    ? "Completa el Damigotchi por su raza"
    : level < 7
    ? "Reconoce la raza aunque falten piezas"
    : "Desafío experto: mira bien antes de tocar";

  const handlePick = (sp) => {
    if (selected) return;
    setSelected(sp.id);
    const ok = sp.id === targetId;

    if (ok) {
      audio.playCorrect();
      setBurst(true); setTimeout(()=>setBurst(false), 800);
      setScore(s=>s+1);
      onScore && onScore(1);
      onCare && onCare("learn", 5);

      const nextRound = round + 1;
      const nextLevel = nextRound % 5 === 0 ? level + 1 : level;
      setTimeout(()=>{
        setRound(nextRound);
        if (nextLevel !== level) setLevel(nextLevel);
        makeRound(nextLevel);
      }, 850);
    } else {
      audio.playWrong();
      setTimeout(()=>setSelected(null), 600);
    }
  };

  const showName = pieces.name;
  const showSymbol = pieces.symbol;
  const showHead = pieces.head;

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:"18px 14px 34px",fontFamily:"'Nunito',sans-serif",position:"relative"}}>
      <StarBurst show={burst}/>
      <BackBtn onClick={onBack}/>
      <SoundBar audio={audio}/>

      <div style={{marginTop:38,fontSize:14,fontWeight:900,color:"rgba(255,255,255,.52)",letterSpacing:2}}>🧩 COMPLETA EL DAMIGOTCHI</div>
      <div style={{display:"flex",gap:10,margin:"8px 0 12px",flexWrap:"wrap",justifyContent:"center"}}>
        <div style={{background:"rgba(255,215,0,.12)",border:"2px solid rgba(255,215,0,.45)",borderRadius:14,padding:"6px 12px",color:"#FFD700",fontWeight:900}}>Nv.{level}</div>
        <div style={{background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.12)",borderRadius:14,padding:"6px 12px",color:"white",fontWeight:900}}>✅ {score}</div>
      </div>

      <div style={{...CARD,width:"100%",maxWidth:430,padding:"18px 16px",textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:900,color:"#FFD700",marginBottom:8}}>{currentTask}</div>

        <div style={{
          minHeight:218,
          borderRadius:26,
          background:`linear-gradient(160deg,${target.colors[1]}33,rgba(255,255,255,.06))`,
          border:`3px dashed ${target.colors[1]}88`,
          display:"flex",
          flexDirection:"column",
          alignItems:"center",
          justifyContent:"center",
          gap:8,
          position:"relative",
          overflow:"hidden"
        }}>
          <div style={{position:"absolute",top:10,right:12,fontSize:18,opacity:.6}}>✨</div>

          {showHead ? (
            <PetSprite species={target.id} expression="happy" xp={12} size={110}/>
          ) : (
            <div style={{width:110,height:110,borderRadius:"50%",border:"5px dashed rgba(255,255,255,.34)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:38,color:"rgba(255,255,255,.35)"}}>?</div>
          )}

          <div style={{fontSize:34,filter:"drop-shadow(0 5px 0 rgba(0,0,0,.22))"}}>
            {showSymbol ? target.emoji : "❔"}
          </div>

          <div style={{fontSize:24,fontWeight:900,color:"white",textShadow:"2px 3px 0 rgba(0,0,0,.25)"}}>
            {showName ? target.name : "¿Qué Damigotchi es?"}
          </div>

          {!showHead && <div style={{fontSize:12,fontWeight:800,color:"rgba(255,255,255,.52)"}}>Coloca la cabeza correcta</div>}
        </div>
      </div>

      <div style={{width:"100%",maxWidth:430,display:"grid",gridTemplateColumns:level>=6?"repeat(4,1fr)":"repeat(3,1fr)",gap:10}}>
        {options.map(sp=>{
          const picked = selected === sp.id;
          const ok = selected && sp.id === targetId;
          const wrong = picked && sp.id !== targetId;
          return (
            <button key={sp.id} onClick={()=>handlePick(sp)} disabled={!!selected && !wrong} style={{
              background: ok ? "rgba(46,204,64,.25)" : wrong ? "rgba(255,65,54,.28)" : "rgba(255,255,255,.08)",
              border:`3px solid ${ok ? "#2ECC40" : wrong ? "#FF4136" : "rgba(255,255,255,.14)"}`,
              borderRadius:18,
              padding:"10px 6px",
              minHeight:118,
              cursor:selected?"default":"pointer",
              display:"flex",
              flexDirection:"column",
              alignItems:"center",
              justifyContent:"center",
              gap:4,
              transform: ok ? "scale(1.05)" : wrong ? "scale(.94)" : "scale(1)",
              transition:"all .18s cubic-bezier(.175,.885,.32,1.275)",
              boxShadow: ok ? "0 0 22px rgba(46,204,64,.5)" : "0 5px 0 rgba(0,0,0,.2)",
              fontFamily:"'Nunito',sans-serif",
              color:"white",
              overflow:"hidden"
            }}>
              <PetSprite species={sp.id} expression={ok?"happy":wrong?"sad":"ok"} xp={12} size={58}/>
              <div style={{fontSize:20}}>{sp.emoji}</div>
              {level >= 4 && <div style={{fontSize:10,fontWeight:900,color:"rgba(255,255,255,.72)",lineHeight:1.05}}>{sp.name}</div>}
            </button>
          );
        })}
      </div>

      <div style={{marginTop:12,color:"rgba(255,255,255,.45)",fontSize:12,fontWeight:800,textAlign:"center",maxWidth:420}}>
        Cada 5 aciertos sube el nivel. En niveles altos tendrás menos pistas y más opciones.
      </div>
    </div>
  );
}

function BalloonGameMode({ audio, onBack, onScore, onCare }) {
  const [level, setLevel] = useState(1);
  const [balloons, setBalloons] = useState([]);
  const [popped, setPopped] = useState(0);
  const [totalPopped, setTotalPopped] = useState(0);
  const [message, setMessage] = useState("Revienta los globos 🎈");
  const [running, setRunning] = useState(true);
  const [target, setTarget] = useState(null);
  const idRef = useRef(1);
  const levelRef = useRef(1);
  const targetRef = useRef(null);
  const poppedRef = useRef(0);
  const needed = Math.min(24, 5 + level * 3);
  const challengeActive = level >= 4;
  const chooseTarget = useCallback((lvl) => lvl < 4 ? null : BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)], []);
  useEffect(()=>{ levelRef.current = level; }, [level]);
  useEffect(()=>{ targetRef.current = target; }, [target]);
  useEffect(()=>{ poppedRef.current = popped; }, [popped]);
  useEffect(()=>{
    const t = chooseTarget(level);
    setTarget(t);
    setMessage(t ? `Revienta solo globos de color ${t.name} 🎯` : "Revienta todos los globos 🎈");
  }, [level, chooseTarget]);
  useEffect(()=>{
    if (!running) return;
    const move = setInterval(()=>{
      const speed = 0.7 + Math.min(2.6, levelRef.current * 0.18);
      setBalloons(bs => bs.map(b => ({ ...b, y:b.y + speed + b.speed })).filter(b => b.y < 112));
    }, 45);
    return ()=>clearInterval(move);
  }, [running]);
  useEffect(()=>{
    if (!running) return;
    const spawn = setInterval(()=>{
      const lvl = levelRef.current;
      const amount = lvl < 3 ? 1 : lvl < 6 ? 2 : 3;
      setBalloons(bs => {
        const next = [...bs];
        for (let i=0;i<amount;i++) {
          const c = BALLOON_COLORS[Math.floor(Math.random()*BALLOON_COLORS.length)];
          next.push({ id:idRef.current++, x:6 + Math.random()*84, y:-12 - Math.random()*12, size:42 + Math.random()*18, color:c.color, name:c.name, speed:Math.random()*0.45 });
        }
        return next.slice(-18);
      });
    }, Math.max(520, 1250 - level * 85));
    return ()=>clearInterval(spawn);
  }, [running, level]);
  const popBalloon = (b) => {
    const currentTarget = targetRef.current;
    if (currentTarget && b.name !== currentTarget.name) {
      audio.playWrong();
      setMessage(`Ese era ${b.name}. Busca ${currentTarget.name} 🎯`);
      setBalloons(bs => bs.filter(x => x.id !== b.id));
      return;
    }
    audio.playCorrect();
    setBalloons(bs => bs.filter(x => x.id !== b.id));
    setPopped(v => v + 1);
    setTotalPopped(v => v + 1);
    onScore && onScore(1);
    onCare && onCare("love", 4, "¡Qué divertido reventar globos! 🎈");
    if (poppedRef.current + 1 >= needed) {
      setRunning(false);
      setMessage("¡Nivel completado! 🌟");
      setTimeout(()=>{ setLevel(l => l + 1); setPopped(0); setBalloons([]); setRunning(true); }, 1200);
    }
  };
  const resetGame = () => {
    audio.playClick();
    setLevel(1); setPopped(0); setTotalPopped(0); setBalloons([]); setRunning(true);
    setMessage("Revienta los globos 🎈");
  };
  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px",fontFamily:"'Nunito',sans-serif",position:"relative",overflow:"hidden"}}>
      <BackBtn onClick={onBack}/>
      <div style={{marginTop:48,fontSize:15,fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:2}}>🎈 JUEGO DE GLOBOS</div>
      <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",margin:"8px 0 10px",flexWrap:"wrap"}}>
        <div style={{background:"rgba(255,215,0,.12)",border:"2px solid #FFD700",borderRadius:12,padding:"5px 12px",color:"#FFD700",fontWeight:900}}>Nv. {level}</div>
        <div style={{background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.15)",borderRadius:12,padding:"5px 12px",color:"white",fontWeight:900}}>🎈 {popped}/{needed}</div>
        <div style={{background:"rgba(46,204,64,.12)",border:"2px solid #2ECC40",borderRadius:12,padding:"5px 12px",color:"#7CFF95",fontWeight:900}}>Total {totalPopped}</div>
      </div>
      <div style={{...CARD,width:"100%",maxWidth:440,height:"68vh",minHeight:430,position:"relative",overflow:"hidden",padding:0,border:"3px solid rgba(255,215,0,.35)",touchAction:"manipulation"}}>
        <div style={{position:"absolute",top:10,left:10,right:10,zIndex:5,display:"flex",justifyContent:"center"}}>
          <div style={{background:"rgba(0,0,0,.35)",backdropFilter:"blur(6px)",border:"2px solid rgba(255,255,255,.12)",borderRadius:16,padding:"7px 12px",color:challengeActive ? "#FFD700" : "white",fontWeight:900,fontSize:14,textAlign:"center"}}>{message}</div>
        </div>
        {target && <div style={{position:"absolute",top:58,left:"50%",transform:"translateX(-50%)",zIndex:6,display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.12)",border:`2px solid ${target.color}`,borderRadius:14,padding:"6px 12px",color:"white",fontWeight:900}}><span>Color:</span><span style={{width:20,height:20,borderRadius:"50%",background:target.color,border:"2px solid white",display:"inline-block"}}/><span>{target.name}</span></div>}
        <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 20%,rgba(255,255,255,.12),transparent 32%),linear-gradient(180deg,rgba(0,116,217,.12),rgba(155,89,182,.12))"}}/>
        {balloons.map(b => <button key={b.id} onClick={()=>popBalloon(b)} aria-label={`Globo ${b.name}`} style={{position:"absolute",left:`${b.x}%`,top:`${b.y}%`,transform:"translate(-50%,-50%)",width:b.size,height:b.size*1.18,borderRadius:"50% 50% 45% 45%",background:`radial-gradient(circle at 30% 24%, rgba(255,255,255,.85), ${b.color} 34%, ${b.color} 78%, rgba(0,0,0,.22))`,border:"2px solid rgba(255,255,255,.75)",boxShadow:"0 8px 16px rgba(0,0,0,.28)",cursor:"pointer",zIndex:4,animation:"balloonWobble 1.4s ease-in-out infinite",outline:"none"}}><span style={{position:"absolute",bottom:-12,left:"50%",transform:"translateX(-50%)",width:2,height:18,background:"rgba(255,255,255,.65)"}}/><span style={{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%) rotate(45deg)",width:9,height:9,background:b.color,border:"1px solid rgba(255,255,255,.6)"}}/></button>)}
      </div>
      <button onClick={resetGame} style={{marginTop:12,background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.15)",borderRadius:12,padding:"8px 18px",color:"rgba(255,255,255,.65)",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer"}}>🔄 Reiniciar juego</button>
    </div>

  );
}

function BeaverFace({ kind="normal", hit=false }) {
  const bg = kind === "gold" ? "linear-gradient(135deg,#FFD700,#FF8C00)" : kind === "fake" ? "linear-gradient(135deg,#777,#444)" : kind === "trick" ? "linear-gradient(135deg,#9B59B6,#5E2A84)" : kind === "fast" ? "linear-gradient(135deg,#8B5A2B,#D79A55)" : "linear-gradient(135deg,#A86A32,#6B3F1D)";
  return (
    <div style={{position:"relative",width:70,height:64,borderRadius:"42% 42% 50% 50%",background:bg,border:"3px solid rgba(255,255,255,.75)",boxShadow:"0 8px 0 rgba(0,0,0,.25)",animation:hit?"beaverHit .22s ease":"beaverPeek .28s ease",margin:"0 auto"}}>
      <div style={{position:"absolute",left:8,top:11,width:14,height:14,borderRadius:"50%",background:"#5b3218",border:"2px solid rgba(255,255,255,.5)"}}/>
      <div style={{position:"absolute",right:8,top:11,width:14,height:14,borderRadius:"50%",background:"#5b3218",border:"2px solid rgba(255,255,255,.5)"}}/>
      <div style={{position:"absolute",left:22,top:21,width:9,height:9,borderRadius:"50%",background:"#111"}}/>
      <div style={{position:"absolute",right:22,top:21,width:9,height:9,borderRadius:"50%",background:"#111"}}/>
      <div style={{position:"absolute",left:31,top:32,width:10,height:7,borderRadius:"50%",background:"#2B1208"}}/>
      <div style={{position:"absolute",left:25,top:42,width:20,height:15,borderRadius:"0 0 10px 10px",background:"rgba(255,255,255,.95)",border:"2px solid #3b1d0c"}}>
        <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:2,background:"#3b1d0c",transform:"translateX(-50%)"}}/>
      </div>
      {kind === "gold" && <div style={{position:"absolute",top:-18,left:"50%",transform:"translateX(-50%)",fontSize:22}}>👑</div>}
      {kind === "trick" && <div style={{position:"absolute",top:-14,right:-8,fontSize:20}}>✨</div>}
      {kind === "fake" && <div style={{position:"absolute",top:-13,right:-8,fontSize:19}}>🪨</div>}
      {kind === "fast" && <div style={{position:"absolute",top:-13,right:-8,fontSize:19}}>⚡</div>}
    </div>
  );
}

function BeaverGameMode({ audio, onBack, onScore, onCare }) {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [hitsInLevel, setHitsInLevel] = useState(0);
  const [beavers, setBeavers] = useState([]);
  const [effects, setEffects] = useState([]);
  const [message, setMessage] = useState("Golpea al castor cuando aparezca 🦫");
  const [record, setRecord] = useState(()=>{ try { return Number(localStorage.getItem("damigotchi_beaver_record") || 0); } catch { return 0; } });
  const idRef = useRef(1);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const holes = 9;
  const needed = Math.min(30, 6 + level * 4);

  useEffect(()=>{ levelRef.current = level; }, [level]);
  useEffect(()=>{ scoreRef.current = score; if (score > record) { setRecord(score); try { localStorage.setItem("damigotchi_beaver_record", String(score)); } catch {} } }, [score, record]);

  const makeBeaver = useCallback((hole) => {
    const lvl = levelRef.current;
    const r = Math.random();
    let kind = "normal";
    if (lvl >= 5 && r < .09) kind = "gold";
    else if (lvl >= 8 && r < .22) kind = "fake";
    else if (lvl >= 6 && r < .38) kind = "trick";
    else if (lvl >= 3 && r < .55) kind = "fast";
    return { id:idRef.current++, hole, kind, hit:false };
  }, []);

  useEffect(()=>{
    const spawnMs = Math.max(330, 980 - level * 55);
    const lifeMs = Math.max(520, 1350 - level * 70);
    const spawn = setInterval(()=>{
      const lvl = levelRef.current;
      const amount = lvl < 4 ? 1 : lvl < 7 ? 2 : 3;
      setBeavers(prev => {
        let next = [...prev];
        for (let i=0;i<amount;i++) {
          const used = new Set(next.map(b=>b.hole));
          const free = Array.from({length:holes},(_,idx)=>idx).filter(x=>!used.has(x));
          const hole = free.length ? free[Math.floor(Math.random()*free.length)] : Math.floor(Math.random()*holes);
          next.push(makeBeaver(hole));
        }
        return next.slice(-8);
      });
      setTimeout(()=>setBeavers(prev => prev.slice(-6)), lifeMs);
    }, spawnMs);
    return ()=>clearInterval(spawn);
  }, [level, makeBeaver]);

  // Castor tramposo: en niveles altos cambia de hoyo para engañar
  useEffect(()=>{
    if (level < 6) return;
    const move = setInterval(()=>{
      setBeavers(prev => prev.map(b => {
        if (b.kind !== "trick" || Math.random() > .45) return b;
        return { ...b, hole: Math.floor(Math.random()*holes) };
      }));
    }, Math.max(420, 980 - level * 45));
    return ()=>clearInterval(move);
  }, [level]);

  const addEffect = (hole, text) => {
    const id = Math.random();
    setEffects(e => [...e, { id, hole, text }]);
    setTimeout(()=>setEffects(e => e.filter(x=>x.id!==id)), 420);
  };

  const hitBeaver = (b) => {
    if (!b) return;
    setBeavers(prev => prev.map(x => x.id===b.id ? {...x, hit:true} : x));
    setTimeout(()=>setBeavers(prev => prev.filter(x => x.id!==b.id)), 170);

    if (b.kind === "fake") {
      audio.playWrong();
      addEffect(b.hole, "¡Era falso!");
      setMessage("Ese era un castor falso 🪨");
      return;
    }

    audio.playConnect();
    const bonus = b.kind === "gold" ? 5 : b.kind === "fast" ? 2 : 1;
    addEffect(b.hole, b.kind === "gold" ? "+5 ⭐" : "💥");
    setScore(s => s + bonus);
    setHitsInLevel(h => {
      const nh = h + 1;
      if (nh >= needed) {
        audio.playCorrect();
        onScore && onScore(3);
        onCare && onCare("love", 8, "¡Qué buen golpe! 🦫");
        setMessage("¡Nivel completado! 🏆");
        setTimeout(()=>{ setLevel(l=>l+1); setHitsInLevel(0); setBeavers([]); setMessage("¡Más difícil ahora! 🔨"); }, 900);
        return 0;
      }
      return nh;
    });
    onScore && onScore(b.kind === "gold" ? 2 : 1);
  };

  const reset = () => {
    audio.playClick();
    setLevel(1); setScore(0); setHitsInLevel(0); setBeavers([]); setEffects([]); setMessage("Golpea al castor cuando aparezca 🦫");
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px",fontFamily:"'Nunito',sans-serif",position:"relative",overflow:"hidden"}}>
      <BackBtn onClick={onBack}/>
      <div style={{marginTop:48,fontSize:15,fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:2}}>🦫 CHIPOTE AL CASTOR</div>
      <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",margin:"8px 0 10px",flexWrap:"wrap"}}>
        <div style={{background:"rgba(255,215,0,.12)",border:"2px solid #FFD700",borderRadius:12,padding:"5px 12px",color:"#FFD700",fontWeight:900}}>Nv. {level}</div>
        <div style={{background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.15)",borderRadius:12,padding:"5px 12px",color:"white",fontWeight:900}}>🔨 {hitsInLevel}/{needed}</div>
        <div style={{background:"rgba(46,204,64,.12)",border:"2px solid #2ECC40",borderRadius:12,padding:"5px 12px",color:"#7CFF95",fontWeight:900}}>Puntos {score}</div>
        <div style={{background:"rgba(0,116,217,.12)",border:"2px solid #0074D9",borderRadius:12,padding:"5px 12px",color:"#8DD0FF",fontWeight:900}}>🏆 {record}</div>
      </div>
      <div style={{...CARD,width:"100%",maxWidth:440,height:"68vh",minHeight:430,position:"relative",overflow:"hidden",padding:16,border:"3px solid rgba(255,215,0,.35)",touchAction:"manipulation"}}>
        <div style={{position:"absolute",top:10,left:10,right:10,zIndex:8,display:"flex",justifyContent:"center"}}>
          <div style={{background:"rgba(0,0,0,.35)",backdropFilter:"blur(6px)",border:"2px solid rgba(255,255,255,.12)",borderRadius:16,padding:"7px 12px",color:"#FFD700",fontWeight:900,fontSize:14,textAlign:"center"}}>{message}</div>
        </div>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 16%,rgba(255,215,0,.12),transparent 32%),linear-gradient(180deg,rgba(91,58,30,.16),rgba(40,23,10,.18))"}}/>
        <div style={{position:"relative",zIndex:3,display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:14,height:"100%",alignContent:"center",paddingTop:34}}>
          {Array.from({length:holes}).map((_,i)=>{
            const b = beavers.find(x=>x.hole===i);
            const fx = effects.filter(e=>e.hole===i);
            return (
              <button key={i} onClick={()=>b && hitBeaver(b)} style={{position:"relative",height:104,border:"none",background:"transparent",cursor:b?"pointer":"default",outline:"none",touchAction:"manipulation"}} aria-label={b?"Golpear castor":"Hoyo vacío"}>
                <div style={{position:"absolute",left:"50%",bottom:10,transform:"translateX(-50%)",width:92,height:34,borderRadius:"50%",background:"radial-gradient(circle,#3b1f10,#1e0f08)",boxShadow:"inset 0 6px 10px rgba(0,0,0,.5),0 5px 0 rgba(0,0,0,.2)"}}/>
                {b && <div style={{position:"absolute",left:"50%",bottom:28,transform:"translateX(-50%)",width:84,height:78,pointerEvents:"none"}}><BeaverFace kind={b.kind} hit={b.hit}/></div>}
                {fx.map(e=><div key={e.id} style={{position:"absolute",left:"50%",top:16,transform:"translateX(-50%)",fontWeight:900,color:"#FFD700",fontSize:18,textShadow:"1px 2px 0 rgba(0,0,0,.4)",animation:"hitSpark .42s ease-out forwards",pointerEvents:"none",whiteSpace:"nowrap"}}>{e.text}</div>)}
              </button>
            );
          })}
        </div>
      </div>
      <button onClick={reset} style={{marginTop:12,background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.15)",borderRadius:12,padding:"8px 18px",color:"rgba(255,255,255,.65)",fontFamily:"'Nunito',sans-serif",fontWeight:900,cursor:"pointer"}}>🔄 Reiniciar juego</button>
    </div>
  );
}

export default function App(){
  const [screen, setScreen] = useState("splash");
  const [earnedCards, setEarnedCards] = useState([]);
  const [newCard, setNewCard] = useState(null);
  const [achievement, setAchievement] = useState(null);
  const [activeSeries, setActiveSeries] = useState("numberblocks");
  const [purchaseDialog, setPurchaseDialog] = useState(null);
  const [skills, setSkills] = useState({ letras:0, sumas:0, restas:0, palabras:0, lineas:0, trazos:0, dibujo:0, colorear:0, globos:0, castor:0, damigotchi:0, cuncuna:0, bloques:0 });
  const audio = useAudio();

  // Desbloqueo de audio para celulares/tablets.
  // Safari/Chrome móvil exigen una interacción real del usuario antes de reproducir música.
  useEffect(() => {
    const unlockAudioForMobile = () => { audio.initAudio(); };
    window.addEventListener("pointerdown", unlockAudioForMobile, { once: true });
    window.addEventListener("touchstart", unlockAudioForMobile, { once: true });
    window.addEventListener("click", unlockAudioForMobile, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudioForMobile);
      window.removeEventListener("touchstart", unlockAudioForMobile);
      window.removeEventListener("click", unlockAudioForMobile);
    };
  }, [audio]);

  const [pet, setPet] = useState(()=>{ try { const saved = localStorage.getItem("damigotchi_pet_v2"); return saved ? normalizePet(JSON.parse(saved)) : null; } catch { return null; } });

  useEffect(()=>{ try { if(pet) localStorage.setItem("damigotchi_pet_v2", JSON.stringify(normalizePet(pet))); } catch {} }, [pet]);

  // Refs to avoid stale closures
  const earnedRef  = useRef([]);
  const skillsRef  = useRef(skills);
  const seriesRef  = useRef("numberblocks");
  useEffect(()=>{ earnedRef.current  = earnedCards; }, [earnedCards]);
  useEffect(()=>{ skillsRef.current  = skills; },      [skills]);
  useEffect(()=>{ seriesRef.current  = activeSeries; },[activeSeries]);

  // Need decay every 5s
  useEffect(()=>{
    const iv = setInterval(()=>{
      setPet(p => {
        if (!p || p.dead) return p;
        const n = {};
        NEEDS.forEach(k => { n[k] = Math.max(0, p.needs[k] - NEED_META[k].decay * 5); });
        const zeros = NEEDS.filter(k => n[k] <= 0).length;
        return { ...p, needs:n, dead: zeros >= 3 };
      });
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const handleCare = useCallback((need, amount) => {
    if (need === "revive") {
      setPet(p => p ? normalizePet({ ...p, dead:false, action:"love", needs:{ hunger:65,bath:65,sleep:65,love:65,learn:65,cards:65 } }) : p);
      return;
    }
    setPet(p => p ? normalizePet({ ...p, action:need, needs:{ ...p.needs, [need]: Math.min(100, p.needs[need]+amount) } }) : p);
    setTimeout(()=>setPet(p => p ? { ...p, action:"idle" } : p), 2200);
  }, []);

  // ── Score handler: add XP to skill, update cards based on total skill levels ──
  const onScore = useCallback((skillId, pts=1) => {
    // 1. Update skill XP
    const oldSkills = skillsRef.current;
    const oldXp = oldSkills[skillId] || 0;
    const oldBadge = getBadgeLevelForSkill(oldXp);
    const oldDiploma = getDiplomaUnlocked(oldXp);

    const newSkills = { ...oldSkills, [skillId]: oldXp + pts };
    const newXp = newSkills[skillId] || 0;
    const newBadge = getBadgeLevelForSkill(newXp);
    const newDiploma = getDiplomaUnlocked(newXp);

    setSkills(newSkills);
    skillsRef.current = newSkills;

    // 1.b Logros visuales: mostrar insignia/diploma cuando se desbloquean
    if (newBadge > oldBadge) {
      setAchievement({ type:"badge", skillId, level:newBadge, key:`badge-${skillId}-${newBadge}-${Date.now()}` });
    }
    if (!oldDiploma && newDiploma) {
      setTimeout(() => {
        setAchievement({ type:"diploma", skillId, level:newBadge, key:`diploma-${skillId}-${Date.now()}` });
      }, newBadge > oldBadge ? 2200 : 100);
    }

    // 2. Update pet XP + needs
    setPet(p => p && !p.dead ? normalizePet({
      ...p,
      xp: p.xp + pts,
      stars: (p.stars || 0) + pts,
      action: "learn",
      needs: { ...p.needs, learn: Math.min(100,p.needs.learn+pts*7), cards: Math.min(100,p.needs.cards+pts*3) },
    }) : p);
    setTimeout(()=>setPet(p => p ? { ...p, action:"idle" } : p), 1600);

    // 3. Cartas desbloqueadas: cada 3 aciertos/puntos se entrega 1 carta
    const ec = earnedRef.current;
    const shouldHave = cardsFromSkills(newSkills);
    if (shouldHave > ec.length && ec.length < ALL_CARDS.length) {
      // unlock as many cards as needed
      let updated = [...ec];
      while (updated.length < shouldHave && updated.length < ALL_CARDS.length) {
        const ids  = new Set(updated.map(c=>c.id));
        const pool = ALL_CARDS.filter(c=>!ids.has(c.id)&&c.series===seriesRef.current);
        const fb   = ALL_CARDS.filter(c=>!ids.has(c.id));
        const choices = (pool.length>0?pool:fb).sort(()=>Math.random()-.5);
        const pick = choices[0];
        if (!pick) break;
        updated = [...updated, pick];
        setNewCard(pick); // show last unlocked
      }
      setEarnedCards(updated);
      earnedRef.current = updated;
      setPet(p => p ? normalizePet({ ...p, stars:(p.stars||0)+5, action:"love", needs:{ ...p.needs, cards:Math.min(100,p.needs.cards+25) } }) : p);
    }
  }, []);


  const buyClothing = useCallback((itemId) => {
    const item = getItemById(itemId);
    if (!item) return;
    const current = normalizePet(pet || {});
    if (current.ownedClothes?.includes(itemId)) {
      setPurchaseDialog({ type:"info", icon:"😊", title:"Ya tienes esta prenda", message:`${item.name} ya está en tu vestidor.`, item });
      return;
    }
    if ((current.stars || 0) < item.price) {
      setPurchaseDialog({ type:"info", icon:"⭐", title:"Faltan estrellas", message:`Necesitas ${item.price} estrellas para comprar ${item.name}.`, item });
      return;
    }
    setPurchaseDialog({ type:"confirm", item });
  }, [pet]);

  const confirmPurchase = useCallback(() => {
    const item = purchaseDialog?.item;
    if (!item) return;
    setPet(p => {
      if (!p) return p;
      const np = normalizePet(p);
      if (np.ownedClothes.includes(item.id) || np.stars < item.price) return np;
      return normalizePet({
        ...np,
        stars: np.stars - item.price,
        ownedClothes: [...np.ownedClothes, item.id],
        outfit: { ...np.outfit, [item.type]: item.id },
        action: "love",
      });
    });
    audio.playCorrect();
    setPurchaseDialog(null);
  }, [purchaseDialog, audio]);

  const equipClothing = useCallback((itemId) => {
    const item = getItemById(itemId);
    if (!item) return;
    setPet(p => {
      if (!p) return p;
      const np = normalizePet(p);
      if (!np.ownedClothes.includes(itemId)) return np;
      return normalizePet({ ...np, outfit:{ ...np.outfit, [item.type]: itemId }, action:"love" });
    });
  }, []);

  const unequipClothing = useCallback((type) => {
    setPet(p => p ? normalizePet({ ...p, outfit:{ ...normalizePet(p).outfit, [type]:null }, action:"idle" }) : p);
  }, []);

  // Create per-skill callbacks for each mode
  const makeOnScore = (skillId) => (pts=1) => onScore(skillId, pts);

  // Card progress for PetHome
  const totalLvls   = totalSkillLevels(skills);
  const cardsTarget = cardsFromSkills(skills);
  const nextCardAt  = Math.min(ALL_CARDS.length * 3, (earnedCards.length + 1) * 3); // próxima carta cada 3 aciertos
  const progress    = Math.min(1, totalSkillPoints(skills) / Math.max(1, ALL_CARDS.length * 3)); // 0–1 colección

  const EXTRA_CSS = `
    @keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
    @keyframes garlandSwing{0%{transform:translateY(-30px);opacity:0}60%{transform:translateY(5px);opacity:1}100%{transform:translateY(0);opacity:1}}
    @keyframes shimmerSlide{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes cardReveal{0%{transform:scale(0) rotateY(180deg);opacity:0}60%{transform:scale(1.1) rotateY(-5deg)}100%{transform:scale(1) rotateY(0);opacity:1}}
    @keyframes petBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
    @keyframes balloonWobble{0%,100%{transform:translate(-50%,-50%) rotate(-3deg)}50%{transform:translate(-50%,-53%) rotate(3deg)}}
    @keyframes beaverPeek{0%{transform:translateY(12px) scale(.9);opacity:.3}100%{transform:translateY(0) scale(1);opacity:1}}
    @keyframes beaverHit{0%{transform:scale(1)}55%{transform:scale(.82) rotate(-8deg)}100%{transform:scale(1)}}
    @keyframes hitSpark{0%{transform:translate(-50%,8px) scale(.6);opacity:0}45%{transform:translate(-50%,-8px) scale(1.25);opacity:1}100%{transform:translate(-50%,-26px) scale(.75);opacity:0}}
    input::placeholder{color:rgba(255,255,255,.3);}
    @keyframes caterpillarWiggle{0%,100%{transform:translateX(0) rotate(-1deg)}50%{transform:translateX(3px) rotate(1deg)}}
    @keyframes fruitFallWobble{0%,100%{transform:translate(-50%,-50%) rotate(-4deg)}50%{transform:translate(-50%,-54%) rotate(4deg)}}
    @keyframes blocksFloat{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-7px) rotate(4deg)}}
  `;

  return (
    <>
      <style>{CSS+EXTRA_CSS}</style>
      {newCard && <NewCardReveal card={newCard} onClose={()=>setNewCard(null)}/>}
      {achievement && <AchievementReveal achievement={achievement} onClose={()=>setAchievement(null)}/>}

      {screen==="splash"  && <Splash audioReady={audio.audioReady} onStart={async()=>{ await audio.initAudio(); setScreen(pet?"home":"choose"); }}/>}
      {screen==="choose"  && <PetChooser onChoose={(sp,nm)=>{ setPet(normalizePet({ species:sp, name:nm, xp:0, stars:0, dead:false, action:"idle", ownedClothes:[], outfit:emptyOutfit, needs:{ hunger:85,bath:85,sleep:85,love:85,learn:85,cards:85 } })); setScreen("home"); }}/>}
      {screen==="home"    && pet && (
        <PetHome pet={pet} onCare={handleCare} onStudy={s=>setScreen(s)}
          onCollection={()=>setScreen("collection")}
          onShop={()=>setScreen("shop")}
          onChangePet={()=>setScreen("choose")}
          onSkills={()=>setScreen("skills")}
          onBadges={()=>setScreen("badges")}
          onDiplomas={()=>setScreen("diplomas")}
          onSeriesChange={s=>{ setActiveSeries(s); seriesRef.current=s; }}
          activeSeries={activeSeries} earnedCards={earnedCards}
          skills={skills} totalLvls={totalLvls} nextCardAt={nextCardAt}
          progress={progress} audio={audio}/>
      )}
      {screen==="collection" && <CollectionScreen cards={earnedCards} onBack={()=>setScreen("home")}/>}
      {screen==="juegos"     && <GamesHub audio={audio} onBack={()=>setScreen("home")} onPlayBalloons={()=>setScreen("globos")} onPlayBeaver={()=>setScreen("castor")} onPlayComplete={()=>setScreen("completa")} onPlayCaterpillar={()=>setScreen("cuncuna")} onPlayBlocks={()=>setScreen("bloques")}/>} 
      {screen==="skills"     && <SkillsScreen skills={skills} earnedCards={earnedCards} onBack={()=>setScreen("home")}/>}
      {screen==="badges"     && <BadgesScreen skills={skills} onBack={()=>setScreen("home")}/>}
      {screen==="diplomas"   && <DiplomasScreen skills={skills} pet={pet} onBack={()=>setScreen("home")}/>}
      {screen==="shop"       && pet && <WardrobeScreen pet={normalizePet(pet)} onBack={()=>setScreen("home")} onBuy={buyClothing} onEquip={equipClothing} onUnequip={unequipClothing} audio={audio}/>}
      {screen==="letras"     && <LettersMode   audio={audio} onBack={()=>setScreen("home")} onScore={makeOnScore("letras")}/>}
      {screen==="sumas"      && <MathMode mode="add" audio={audio} onBack={()=>setScreen("home")} onScore={makeOnScore("sumas")}/>}
      {screen==="restas"     && <MathMode mode="sub" audio={audio} onBack={()=>setScreen("home")} onScore={makeOnScore("restas")}/>}
      {screen==="palabras"   && <WordsMode     audio={audio} onBack={()=>setScreen("home")} onScore={makeOnScore("palabras")}/>}
      {screen==="lineas"     && <MatchLinesMode audio={audio} onBack={()=>setScreen("home")} onScore={makeOnScore("lineas")}/>}
      {screen==="trazos"     && <TraceLetterMode audio={audio} onBack={()=>setScreen("home")} onScore={makeOnScore("trazos")}/>}
      {screen==="dibujo"     && <DrawMode audio={audio} onBack={()=>setScreen("home")} onScore={makeOnScore("dibujo")} onCare={handleCare}/>}
      {screen==="colorear"   && <ColorAnimalsMode audio={audio} onBack={()=>setScreen("home")} onScore={makeOnScore("colorear")} onCare={handleCare}/>}
      {screen==="galeria"    && <GalleryMode audio={audio} onBack={()=>setScreen("home")}/>}
      {screen==="completa"   && <CompleteDamigotchiGameMode audio={audio} onBack={()=>setScreen("juegos")} onScore={makeOnScore("damigotchi")} onCare={handleCare}/>} 
      {screen==="cuncuna"    && <CaterpillarGameMode audio={audio} onBack={()=>setScreen("juegos")} onScore={makeOnScore("cuncuna")} onCare={handleCare}/>} 
      {screen==="bloques"    && <BlocksDamigotchiMode audio={audio} onBack={()=>setScreen("juegos")} onScore={makeOnScore("bloques")} onCare={handleCare}/>} 
      {screen==="globos"     && <BalloonGameMode audio={audio} onBack={()=>setScreen("juegos")} onScore={makeOnScore("globos")} onCare={handleCare}/> }
      {screen==="castor"     && <BeaverGameMode audio={audio} onBack={()=>setScreen("juegos")} onScore={makeOnScore("castor")} onCare={handleCare}/>}
      <PurchaseModal dialog={purchaseDialog} onCancel={()=>setPurchaseDialog(null)} onConfirm={confirmPurchase}/>
      <FooterAutor/>
    </>
  );
}