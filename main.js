(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVG = "http://www.w3.org/2000/svg";

  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-menu]");
  const closeMenu = () => {
    nav.removeAttribute("data-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.querySelector(".sr-only").textContent = "Abrir menú";
  };
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    nav.toggleAttribute("data-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".sr-only").textContent = open ? "Cerrar menú" : "Abrir menú";
  });
  nav.querySelectorAll(".nav__links a").forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.hasAttribute("data-open")) {
      closeMenu();
      toggle.focus();
    }
  });

  const manifiesto = document.querySelector("[data-manifiesto]");
  const texto = document.querySelector("[data-words]");
  const palabras = texto.textContent.trim().split(/\s+/);
  texto.innerHTML = `<span class="sr-only">${texto.textContent.trim()}</span>` +
    palabras.map((w) => `<span class="w" aria-hidden="true">${w}</span> `).join("");
  const spans = [...texto.querySelectorAll(".w")];
  if (!reduce) {
    let pendiente = false;
    const pintar = () => {
      pendiente = false;
      const r = manifiesto.getBoundingClientRect();
      const recorrido = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / (recorrido * 0.85)));
      const hasta = Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle("on", i < hasta));
    };
    window.addEventListener("scroll", () => {
      if (!pendiente) {
        pendiente = true;
        requestAnimationFrame(pintar);
      }
    }, { passive: true });
    pintar();
  }

  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const iso = document.querySelector("[data-iso]");
  const anillos = [];
  const tempAnillo = (i) => 1200 - i * 25;
  for (let i = 0; i <= 20; i++) {
    const base = 12 + i * 8.6;
    let d = "";
    for (let k = 0; k <= 120; k++) {
      const t = (k / 120) * Math.PI * 2;
      const r = base * (1 + 0.13 * Math.sin(3 * t + i * 0.28) + 0.06 * Math.sin(5 * t - i * 0.21)) ;
      const x = 200 + r * Math.cos(t);
      const y = 200 + r * Math.sin(t) * 0.92;
      d += (k ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    const p = document.createElementNS(SVG, "path");
    p.setAttribute("d", d + "Z");
    if (i % 5 === 0 && i > 0) {
      p.classList.add("grueso");
      const label = document.createElementNS(SVG, "text");
      const t = -0.9;
      const r = base * (1 + 0.13 * Math.sin(3 * t + i * 0.28) + 0.06 * Math.sin(5 * t - i * 0.21));
      label.setAttribute("x", (200 + r * Math.cos(t) + 6).toFixed(1));
      label.setAttribute("y", (200 + r * Math.sin(t) * 0.92 - 4).toFixed(1));
      label.textContent = `${fmt(tempAnillo(i))} °C`;
      iso.appendChild(label);
    }
    iso.insertBefore(p, iso.firstChild);
    anillos.push({ p, temp: tempAnillo(i) });
  }

  const tempEl = document.querySelector("[data-temp]");
  const nombreEl = document.querySelector("[data-temp-name]");
  let actual = 1200;
  let anim;
  const calentar = (destino) => {
    anillos.forEach(({ p, temp }) => p.classList.toggle("caliente", temp >= destino));
    cancelAnimationFrame(anim);
    if (reduce) {
      actual = destino;
      tempEl.textContent = fmt(destino);
      return;
    }
    const desde = actual;
    const inicio = performance.now();
    const paso = (now) => {
      const t = Math.min(1, (now - inicio) / 450);
      const e = 1 - Math.pow(1 - t, 3);
      actual = desde + (destino - desde) * e;
      tempEl.textContent = fmt(actual);
      if (t < 1) anim = requestAnimationFrame(paso);
    };
    anim = requestAnimationFrame(paso);
  };
  calentar(1200);

  const servicios = [...document.querySelectorAll("[data-servicios] .servicio")];
  servicios[0].classList.add("activo");
  const io = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => {
      if (!en.isIntersecting) return;
      servicios.forEach((s) => s.classList.toggle("activo", s === en.target));
      nombreEl.textContent = en.target.dataset.n;
      calentar(Number(en.target.dataset.t));
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  servicios.forEach((s) => io.observe(s));

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const elegir = (tab, foco) => {
    tabs.forEach((t) => {
      const sel = t === tab;
      t.setAttribute("aria-selected", String(sel));
      t.tabIndex = sel ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !sel;
    });
    if (foco) tab.focus();
    tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => elegir(tab, false));
    tab.addEventListener("keydown", (e) => {
      const mapa = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in mapa)) return;
      e.preventDefault();
      elegir(tabs[(mapa[e.key] + tabs.length) % tabs.length], true);
    });
  });

  const colada = document.querySelector("[data-colada]");
  const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;uniform float uT,uSeed,uZoom,uFlows,uPx;uniform vec3 uA,uB;
out vec4 o;
vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)),dot(h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float s=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<3;i++){s+=a*noise(p);p=m*p;a*=.5;}return s;}
void main(){
 vec2 fc=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
 vec2 p=fc*inversesqrt(uRes.x*uRes.y)*uZoom+uSeed*vec2(3.1,1.7);
 float t=uT;
 vec2 w=vec2(fbm(p*.75+vec2(0.,t*.02)),fbm(p*.75+vec2(4.7,1.9)-vec2(t*.015,0.)));
 vec2 q=p+.42*w;
 float ph=fbm(vec2(q.y*1.25,2.1+uSeed))*8.;
 float am=.35+1.3*clamp(noise(vec2(q.x*.8,q.y*1.4+5.))+.5,0.,1.);
 float wv=sin(q.x*5.4+ph+t*.25)*.1+sin(q.x*10.3-ph*1.3+q.y*2.)*.035;
 float f=(q.y+.08*q.x+wv*am)*uFlows;
 float id=floor(f),s=fract(f);
 float d=.5+.12*noise(vec2(q.x*1.6,id*1.37));
 float aa=fwidth(f)*.7;
 float m=smoothstep(d-aa,d+aa,s)-smoothstep(1.-aa,1.+aa,s)+1.-smoothstep(-aa,aa,s);
 vec3 col=mix(uA,uB,m);
 vec2 g=fc/uPx;
 float cl=noise(p*3.2+9.)+.6*noise(p*6.5+3.);
 float n1=noise(g*.16)*.7+noise(g*.37)*.45+noise(g*.9)*.25;
 float sp=smoothstep(.40,.44,n1+cl*.28);
 float n2=noise(g*.05+17.)+noise(g*.21)*.4;
 float bl=smoothstep(.55,.58,n2+cl*.2);
 vec2 sc=vec2(dot(p,vec2(.86,.5)),dot(p,vec2(-.5,.86)));
 float lane=floor(sc.y*9.);
 float sl=1.-smoothstep(0.,.0035+fwidth(sc.y)*.7,abs(fract(sc.y*9.+noise(vec2(sc.x*2.,lane))*.25)-.5));
 float sm=sl*step(.3,noise(vec2(sc.x*1.4,lane*3.1)))*step(.0,noise(vec2(lane*7.3,1.)));
 float flip=clamp(max(max(sp,bl),sm*.85),0.,1.);
 o=vec4(mix(col,mix(uB,uA,m),flip),1.);
}`;
  const gl = colada.getContext("webgl2", { antialias: false });
  if (gl) {
    const sh = (tipo, src) => {
      const s = gl.createShader(tipo);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, "#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}"));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(pr, 0, "a");
    gl.linkProgram(pr);
    gl.useProgram(pr);
    const U = {};
    ["uRes", "uT", "uSeed", "uZoom", "uFlows", "uPx", "uA", "uB"].forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(U.uSeed, 7.3);
    gl.uniform1f(U.uZoom, 2.1);
    gl.uniform1f(U.uFlows, 6.2);
    gl.uniform3f(U.uA, 0.949, 0.294, 0.016);
    gl.uniform3f(U.uB, 0.055, 0.031, 0.027);

    let T = 0;
    const pintar = () => {
      gl.viewport(0, 0, colada.width, colada.height);
      gl.uniform2f(U.uRes, colada.width, colada.height);
      gl.uniform1f(U.uT, T);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const medir = () => {
      const d = Math.min(1.5, window.devicePixelRatio || 1);
      const b = colada.getBoundingClientRect();
      colada.width = Math.round(b.width * d);
      colada.height = Math.round(b.height * d);
      gl.uniform1f(U.uPx, d);
      pintar();
    };
    new ResizeObserver(medir).observe(colada);
    medir();

    if (!reduce) {
      let visible = false;
      let corriendo = false;
      let ultimo = 0;
      let acumulado = 0;
      const ciclo = (ahora) => {
        if (!visible) {
          corriendo = false;
          return;
        }
        const dt = Math.min(0.1, (ahora - ultimo) / 1000);
        ultimo = ahora;
        T += dt * 0.5;
        acumulado += dt;
        if (acumulado >= 1 / 30) {
          acumulado = 0;
          pintar();
        }
        requestAnimationFrame(ciclo);
      };
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !corriendo) {
          corriendo = true;
          ultimo = performance.now();
          requestAnimationFrame(ciclo);
        }
      }).observe(colada);
    }
  } else {
    colada.hidden = true;
  }

  const chips = [...document.querySelectorAll("[data-chips] input")];
  const negocio = document.querySelector("[data-negocio]");
  const preview = document.querySelector("[data-preview]");
  const status = document.querySelector("[data-status]");
  const lista = (xs) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;
  const mensaje = () => {
    const sel = chips.filter((c) => c.checked).map((c) => c.value);
    const quien = negocio.value.trim();
    let m = "Hola, Magma Studio.";
    if (quien) m += ` Tengo un negocio: ${quien}.`;
    m += sel.length ? ` Me interesa ${lista(sel)}.` : " Quiero contarles una idea.";
    return m + " ¿Cuándo podemos hablar?";
  };
  const actualizar = () => {
    preview.textContent = mensaje();
    status.textContent = "";
  };
  chips.forEach((c) => c.addEventListener("change", actualizar));
  negocio.addEventListener("input", actualizar);
  actualizar();

  document.querySelector("[data-copy]").addEventListener("click", async () => {
    const m = mensaje();
    try {
      await navigator.clipboard.writeText(m);
      status.textContent = "Mensaje copiado. Ábrelo en Instagram y pégalo en el chat.";
    } catch {
      const r = document.createRange();
      r.selectNodeContents(preview);
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
      status.textContent = "No se pudo copiar solo. El mensaje quedó seleccionado: cópialo con Ctrl+C o mantén presionado.";
    }
  });
})();
