/* ===== voz.js: fala vira texto (avaliação das fundadoras, marco 2, 2026-11-25) =====
   Módulo de voz do Canvas 5 Momentos do thinkwall: reconhecimento de fala do navegador (Web Speech), pt-BR, contínuo,
   com texto parcial enquanto a pessoa fala. Correção: quando a escuta reinicia sozinha depois de uma pausa, o texto
   já reconhecido é somado (no thinkwall era trocado e a frase de antes da pausa se perdia).
   Não grava áudio. Funciona só numa página aberta direto (sem moldura): dentro do artefato e do Apps Script o
   microfone é recusado.
   Uso: const v = Voz.criar({ aoMudar, aoErro }); v.iniciar(textoInicial); v.parar() devolve o texto. */
(function (raiz) {
 const R = raiz.SpeechRecognition || raiz.webkitSpeechRecognition;
 const juntar = (...p) => p.map(x => (x || '').trim()).filter(Boolean).join(' ');
 const MOTIVO = {
  'not-allowed': 'o microfone foi negado. Para liberar, toque no cadeado ao lado do endereço e permita o microfone',
  'service-not-allowed': 'o serviço de fala não é permitido neste navegador',
  'audio-capture': 'o microfone não pôde ser usado', 'network': 'sem conexão com o serviço de fala',
  'language-not-supported': 'o português do Brasil não está disponível neste navegador', 'aborted': 'a escuta foi interrompida'
 };
 function criar({ aoMudar, aoErro } = {}) {
  const v = {
   suportado: !!R, ativo: false, acumulado: '', sessao: '', parciais: '', semResultado: 0, reinicios: 0, rec: null,
   texto() { return juntar(this.acumulado, this.sessao) },
   iniciar(inicial) { if (!R) return false; this.acumulado = (inicial || '').trim(); this.sessao = ''; this.parciais = ''; this.semResultado = 0; this.ativo = true; return this.abrir() },
   abrir() {
    const rec = new R(); rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true;
    let teveResultado = false;
    rec.onresult = ev => {
     teveResultado = true; let f = '', p = '';
     for (let k = 0; k < ev.results.length; k++) { const x = ev.results[k]; if (x.isFinal) f += x[0].transcript + ' '; else p += x[0].transcript + ' ' }
     this.sessao = f.trim(); this.parciais = p.trim(); if (aoMudar) aoMudar(this);
    };
    rec.onerror = ev => {
     if (ev.error === 'no-speech') return;
     if (['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'].includes(ev.error)) this.ativo = false;
     if (aoErro) aoErro(ev.error, MOTIVO[ev.error] || ('erro ' + ev.error), this);
    };
    rec.onend = () => {
     if (this.rec !== rec) return;
     this.acumulado = juntar(this.acumulado, this.sessao); this.sessao = ''; this.parciais = '';
     this.semResultado = teveResultado ? 0 : this.semResultado + 1;
     if (this.ativo && this.semResultado < 3) { this.reinicios++; try { this.abrir() } catch (_) { this.ativo = false; this.rec = null; if (aoMudar) aoMudar(this) } }
     else { this.ativo = false; this.rec = null; if (aoMudar) aoMudar(this) }
    };
    try { rec.start() } catch (e) { this.ativo = false; if (aoErro) aoErro('start', 'não deu para abrir o microfone', this); return false }
    this.rec = rec; return true;
   },
   parar() {
    this.ativo = false;
    if (this.rec) { const rec = this.rec; this.rec = null; try { rec.onend = null; rec.stop() } catch (_) { } }
    this.acumulado = juntar(this.acumulado, this.sessao, this.parciais); this.sessao = ''; this.parciais = '';
    return this.acumulado;
   }
  };
  return v;
 }
 raiz.Voz = { criar, suportado: !!R, juntar };
})(window);
