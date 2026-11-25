const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n);
const number = n => new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n);

window.addEventListener("load", () => {
  const loader = $(".loader");
  if (window.gsap) {
    gsap.to(".loader-line i",{width:"100%",duration:.75,ease:"power2.inOut"});
    gsap.to(loader,{autoAlpha:0,duration:.65,delay:.85,onComplete:()=>loader.remove()});
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray(".section-tag,.gallery-card,.principle,.chart-card,.stat").forEach(el=>{
      gsap.from(el,{y:24,opacity:0,duration:.75,ease:"power2.out",scrollTrigger:{trigger:el,start:"top 88%"}});
    });
    gsap.from(".hero-copy > *",{y:28,opacity:0,stagger:.12,duration:1,ease:"power3.out",delay:.7});
  } else loader.remove();
});

const cursor=$(".cursor"), ring=$(".cursor-ring");
if(matchMedia("(pointer:fine)").matches){
  window.addEventListener("mousemove",e=>{
    cursor.style.left=e.clientX+"px";cursor.style.top=e.clientY+"px";
    ring.animate({left:e.clientX+"px",top:e.clientY+"px"},{duration:260,fill:"forwards"});
  });
  $$("a,button,.gallery-card").forEach(el=>el.addEventListener("mouseenter",()=>{ring.style.width="44px";ring.style.height="44px"}));
  $$("a,button,.gallery-card").forEach(el=>el.addEventListener("mouseleave",()=>{ring.style.width="28px";ring.style.height="28px"}));
}
$(".menu-toggle").addEventListener("click",()=> $("nav").classList.toggle("open"));
$$("nav a").forEach(a=>a.addEventListener("click",()=> $("nav").classList.remove("open")));

async function loadAnalytics(){
  try{
    const [m,a]=await Promise.all([fetch("/api/meta"),fetch("/api/analytics")]);
    if(!m.ok||!a.ok) throw new Error("Analytics API unavailable");
    const meta=await m.json(), data=await a.json(), d=meta.dataset;
    $("#stat-records").textContent=number(d.records);
    $("#stat-bill").textContent=money(d.average_bill);
    $("#stat-hours").textContent=number(d.average_hours);
    $("#stat-tariff").textContent="₹"+d.average_tariff.toFixed(2);
    const common={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"#242520",titleColor:"#e8e2d5",bodyColor:"#c9c4b8",borderColor:"#4b4b42",borderWidth:1}},scales:{x:{ticks:{color:"#89877f",font:{family:"DM Mono",size:9}},grid:{color:"#ffffff0d"}},y:{ticks:{color:"#89877f",font:{family:"DM Mono",size:9}},grid:{color:"#ffffff0d"}}}};
    new Chart($("#distributionChart"),{type:"bar",data:{labels:data.bill_distribution.map(x=>x.range),datasets:[{data:data.bill_distribution.map(x=>x.count),backgroundColor:"#d8a83e99",borderColor:"#d8a83e",borderWidth:1,borderRadius:2}]},options:{...common,scales:{...common.scales,x:{...common.scales.x,ticks:{...common.scales.x.ticks,maxRotation:35,minRotation:20}}}}});
    new Chart($("#monthlyChart"),{type:"line",data:{labels:data.monthly_average.map(x=>"M"+x.month),datasets:[{data:data.monthly_average.map(x=>x.bill),borderColor:"#d8a83e",backgroundColor:"#d8a83e18",fill:true,tension:.35,pointRadius:3,pointBackgroundColor:"#e8e2d5"}]},options:{...common}});
    new Chart($("#scatterChart"),{type:"scatter",data:{datasets:[{data:data.usage_scatter.map(x=>({x:x.hours,y:x.bill})),backgroundColor:"#d8a83e88",pointRadius:2.5}]},options:{...common,scales:{x:{...common.scales.x,title:{display:true,text:"Monthly hours",color:"#88877f"}},y:{...common.scales.y,title:{display:true,text:"Bill (₹)",color:"#88877f"}}}}});
    const labels=data.correlation.labels, values=data.correlation.values;
    let html='<table class="heatmap"><thead><tr><th>FEATURE</th>'+labels.map(x=>`<th>${x}</th>`).join("")+'</tr></thead><tbody>';
    values.forEach((row,i)=>{html+=`<tr><th>${labels[i]}</th>`+row.map(v=>{const alpha=Math.min(1,Math.abs(v));const bg=v>=0?`rgba(216,168,62,${alpha*.65})`:`rgba(130,151,160,${alpha*.65})`;return `<td style="background:${bg};color:#f0eadf">${Number(v).toFixed(2)}</td>`}).join("")+'</tr>'});
    $("#heatmap").innerHTML=html+'</tbody></table>';
  }catch(err){console.error(err);$("#heatmap").textContent="Analytics could not be loaded. Check that the Flask API is running."}
}
loadAnalytics();

$("#prediction-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget, btn=form.querySelector("button"), error=$("#form-error");
  error.textContent="";btn.disabled=true;btn.textContent="PROCESSING…";
  const payload={};new FormData(form).forEach((v,k)=>payload[k]=Number(v));
  try{
    const response=await fetch("/api/predict",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||"Prediction failed");
    const panel=$("#result-panel");
    panel.innerHTML=`<div class="result-top mono"><span>MODEL OUTPUT</span><span class="result-status"><i></i> PREDICTION COMPLETE</span></div>
      <div><div class="result-caption">ESTIMATED ELECTRICITY BILL</div><div class="result-value" id="result-number">${money(result.predicted_bill)}</div><div class="result-caption">INDIAN RUPEES / INR</div>
      <div class="result-details">${Object.entries(result.input_summary).map(([k,v])=>`${k.replace(/([A-Z])/g," $1")}: ${v}`).join("<br>")}</div></div>
      <div class="result-bottom mono"><span>${result.model_name.toUpperCase()}</span><span>LIVE INFERENCE</span></div>`;
    if(window.gsap) gsap.from("#result-number",{y:15,opacity:0,duration:.65,ease:"power2.out"});
    panel.scrollIntoView({behavior:"smooth",block:"nearest"});
  }catch(err){error.textContent=err.message}
  finally{btn.disabled=false;btn.innerHTML='CALCULATE ESTIMATE <span>↗</span>'}
});
