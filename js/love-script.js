let step1FormData = {};
// Configurações de EmailJS - lidas de api-config.js
const EMAIL_SERVICE = window.API_CONFIG?.emailjs?.serviceId || '';
const EMAIL_TEMPLATE_LETRA = window.API_CONFIG?.emailjs?.templateId || '';

// reCAPTCHA v3 helper
const RECAPTCHA_SITE_KEY = '6LdTs5AsAAAAAOfcTmGMRhocyVn0Sdoy5Yz5zWXW';
async function getCaptchaToken(action) {
    try {
        if (typeof grecaptcha === 'undefined') {
            console.warn('[CAPTCHA] grecaptcha não carregou — aguardando...');
            // Espera até 5s pelo script carregar
            await new Promise((resolve) => {
                let attempts = 0;
                const check = setInterval(() => {
                    attempts++;
                    if (typeof grecaptcha !== 'undefined') { clearInterval(check); resolve(true); }
                    else if (attempts >= 50) { clearInterval(check); resolve(false); }
                }, 100);
            });
            if (typeof grecaptcha === 'undefined') {
                console.error('[CAPTCHA] grecaptcha não disponível após 5s');
                return '';
            }
        }
        return await Promise.race([
            new Promise((resolve) => {
                grecaptcha.ready(() => {
                    grecaptcha.execute(RECAPTCHA_SITE_KEY, { action })
                        .then(resolve)
                        .catch((err) => { console.error('[CAPTCHA] execute falhou:', err); resolve(''); });
                });
            }),
            new Promise((resolve) => setTimeout(() => { console.warn('[CAPTCHA] Timeout 8s'); resolve(''); }, 8000))
        ]);
    } catch (e) {
        console.error('[CAPTCHA] Erro ao obter token:', e);
        return '';
    }
}

// =============================================
// SALVAR LEAD NO SUPABASE
// =============================================
async function saveLead() {
    const supabaseClient = window.API_CONFIG?.supabaseClient;
    if (!supabaseClient) {
        console.warn('[LEAD] Supabase não configurado - lead não salvo');
        return null;
    }

    const leadData = {
        nome_completo: document.getElementById('customerFullName')?.value?.trim() || '',
        email: document.getElementById('customerEmail')?.value?.trim() || '',
        destinatario: document.getElementById('recipient')?.value?.trim() || '',
        relacionamento: document.getElementById('relationship')?.value || '',
        ocasiao: document.getElementById('occasion')?.value || '',
        estilo: document.getElementById('genre')?.value || '',
        mensagem: document.getElementById('message')?.value?.trim() || '',
        vocal_gender: document.querySelector('input[name="vocalGender"]:checked')?.value || 'm',
        telefone: getPhone()?.e164 || '',
        utm_source: new URLSearchParams(window.location.search).get('utm_source') || null,
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || null,
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || null,
        referrer_url: document.referrer || null,
        user_agent: navigator.userAgent
    };

    // Validação mínima
    if (!leadData.email || !leadData.destinatario) {
        console.warn('[LEAD] Dados insuficientes para salvar lead');
        return null;
    }

    try {
        const { data, error } = await supabaseClient
            .from('leads')
            .insert([leadData])
            .select();

        if (error) {
            console.error('[LEAD] Erro ao salvar:', error);
            return null;
        }

        console.log('[LEAD] Salvo com sucesso:', data[0]?.id);
        window.currentLeadId = data[0]?.id;
        return data[0];
    } catch (err) {
        console.error('[LEAD] Erro inesperado:', err);
        return null;
    }
}

// =============================================
// DATAS COMEMORATIVAS - Mostra ocasião relevante
// 15 dias antes da data, adiciona como opção (sem pré-selecionar)
// =============================================
(function() {
    const occasion = document.getElementById('occasion');
    if (!occasion) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();

    // Calcula Páscoa (algoritmo de Meeus)
    function getEaster(y) {
        const a = y % 19;
        const b = Math.floor(y / 100);
        const c = y % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(y, month - 1, day);
    }

    // Enésimo dia da semana do mês (0=Dom)
    function getNthWeekday(y, month, weekday, n) {
        const first = new Date(y, month, 1);
        let day = 1 + ((weekday - first.getDay() + 7) % 7);
        day += (n - 1) * 7;
        return new Date(y, month, day);
    }

    const easter = getEaster(year);
    const easterNext = getEaster(year + 1);
    const carnival = new Date(easter.getTime() - 47 * 86400000);
    const carnivalNext = new Date(easterNext.getTime() - 47 * 86400000);

    // Mapeamento de datas comemorativas brasileiras
    // Inclui ano atual e próximo (para virada de ano)
    const allDates = [
        // Ano atual
        { date: new Date(year, 0, 1),   value: 'ano_novo',       label: 'Ano Novo' },
        { date: carnival,               value: 'carnaval',       label: 'Carnaval' },
        { date: new Date(year, 2, 8),   value: 'dia_mulher',     label: 'Dia da Mulher' },
        { date: getNthWeekday(year, 4, 0, 2), value: 'dia_maes', label: 'Dia das Mães' },
        { date: new Date(year, 5, 12),  value: 'valentine',      label: 'Dia dos Namorados' },
        { date: new Date(year, 5, 24),  value: 'sao_joao',       label: 'São João / Festa Junina' },
        { date: getNthWeekday(year, 7, 0, 2), value: 'dia_pais', label: 'Dia dos Pais' },
        { date: new Date(year, 9, 12),  value: 'dia_criancas',   label: 'Dia das Crianças' },
        { date: new Date(year, 11, 25), value: 'natal',          label: 'Natal' },
        { date: new Date(year, 11, 31), value: 'reveillon',      label: 'Réveillon' },
        // Próximo ano (para virada)
        { date: new Date(year + 1, 0, 1),   value: 'ano_novo',   label: 'Ano Novo' },
        { date: carnivalNext,                value: 'carnaval',   label: 'Carnaval' },
        { date: new Date(year + 1, 2, 8),   value: 'dia_mulher', label: 'Dia da Mulher' },
    ];

    const DAYS_BEFORE = 15;
    const limit = new Date(today.getTime() + DAYS_BEFORE * 86400000);

    // Filtra datas dentro dos próximos 15 dias
    const upcoming = allDates
        .filter(d => d.date >= today && d.date <= limit)
        .sort((a, b) => a.date - b.date);

    if (upcoming.length === 0) return;

    // Adiciona as opções que não existem ainda
    const added = new Set();
    upcoming.forEach(d => {
        if (added.has(d.value)) return;
        added.add(d.value);

        // Se já existe (ex: valentine), não duplica
        if (occasion.querySelector(`option[value="${d.value}"]`)) return;

        const opt = document.createElement('option');
        opt.value = d.value;
        opt.textContent = '🎉 ' + d.label;

        // Insere antes de "Outro"
        const otherOpt = occasion.querySelector('option[value="other"]');
        if (otherOpt) {
            occasion.insertBefore(opt, otherOpt);
        } else {
            occasion.appendChild(opt);
        }
    });

})();

// Controle do player de prévia
const previewPlayBtn = document.getElementById('previewPlayBtn');
const previewPlayIcon = document.getElementById('previewPlayIcon');
const previewAudio = document.getElementById('previewAudio');
const audioWavePreview = document.querySelector('.audio-wave-preview');

let isPreviewPlaying = false;

function getLyricTitleFromDOM() {
    return (document.getElementById('songTitle')?.textContent || '').trim();
}
function makeFallbackTitle() {
    const r = (document.getElementById('recipient')?.value || '').trim();
    return r ? `Música para ${r}` : 'Música Personalizada';
}
function getVocalGender() {
    return document.querySelector('input[name="vocalGender"]:checked')?.value || 'm';
}

function buildPriceQuery() {
    const u = new URLSearchParams(window.location.search);
    if (u.has("pm")) return `pm=${encodeURIComponent(u.get("pm"))}`;
    if (u.has("p"))  return `p=${encodeURIComponent(u.get("p"))}`;
    return "p=5";
}

// === MÁSCARA DO TELEFONE (precisa existir antes de syncPhoneHidden) ===
const phoneEl = document.getElementById('customerPhone');

let phoneMask = null;
if (phoneEl && typeof IMask !== 'undefined') {
    phoneMask = IMask(phoneEl, {
        mask: [
            { mask: '+{55} (00) 00000-0000' }, // celular com DDI
            { mask: '(00) 00000-0000' },       // celular sem DDI
            { mask: '+{55} (00) 0000-0000'  }, // fixo com DDI
            { mask: '(00) 0000-0000' }         // fixo sem DDI
        ],
        lazy: false
    });
}


if (previewPlayBtn) {
    previewPlayBtn.addEventListener('click', function() {
        if (isPreviewPlaying) {
            previewAudio.pause();
            previewPlayIcon?.classList.remove('fa-pause');
            previewPlayIcon?.classList.add('fa-play');
            previewPlayBtn.classList.remove('bg-purple-700');
            audioWavePreview?.classList.remove('playing');
        } else {
            previewAudio.play();
            previewPlayIcon?.classList.remove('fa-play');
            previewPlayIcon?.classList.add('fa-pause');
            previewPlayBtn.classList.add('bg-purple-700');
            audioWavePreview?.classList.add('playing');
        }
        isPreviewPlaying = !isPreviewPlaying;
    });
}

if (previewAudio) {
    previewAudio.addEventListener('ended', function() {
        previewPlayIcon?.classList.remove('fa-pause');
        previewPlayIcon?.classList.add('fa-play');
        previewPlayBtn?.classList.remove('bg-purple-700');
        audioWavePreview?.classList.remove('playing');
        isPreviewPlaying = false;
    });
}
// Adicionando funcionalidade para os 3 steps
document.addEventListener('DOMContentLoaded', function() {
    const step1Content = document.getElementById('step1Content');
    const step2Content = document.getElementById('step2Content');
    const step3Content = document.getElementById('step3Content');
    const step1Indicator = document.getElementById('step1Indicator');
    const step2Indicator = document.getElementById('step2Indicator');
    const step3Indicator = document.getElementById('step3Indicator');
    const nextStepBtn = document.getElementById('nextStepBtn');
    const backToStep1Btn = document.getElementById('backToStep1Btn');
    const goToPaymentBtn = document.getElementById('goToPaymentBtn');
    const backToStep2Btn = document.getElementById('backToStep2Btn');
    const regenerateLyricsBtn = document.getElementById('regenerateLyricsBtn');

    // Aviso de demora na geração
    const generationReassure = document.getElementById('generationReassure');
    const reassureGoPayment  = document.getElementById('reassureGoPayment');

// Ajuste estes tempos se quiser:
    const GENERATION_STALL_MS        = 15000; // 15s: mostra o aviso
    const GENERATION_HARD_TIMEOUT_MS = 45000; // 45s: aborta a requisição

    function showGenerationReassure() {
        generationReassure?.classList.remove('hidden');
    }
    reassureGoPayment?.addEventListener('click', () => {
        // usa o botão já existente do Step 2
        document.getElementById('goToPaymentBtn')?.click();
    });


    // ===== Limite de revisões =====
    const REVISE_LIMIT = 2000;
    const REVISE_KEY   = 'revisoes_letra'; // sessionStorage
    const WHATSAPP_LINK = 'https://wa.me/554499723421'; // Canto com Amor

    function getReviseCount() {
        return parseInt(sessionStorage.getItem(REVISE_KEY) || '0');
    }
    function setReviseCount(n) {
        sessionStorage.setItem(REVISE_KEY, String(n));
    }
    function ensureReviseMsgEl() {
        let el = document.getElementById('reviseLimitMsg');
        if (!el) {
            el = document.createElement('p');
            el.id = 'reviseLimitMsg';
            el.className = 'mt-2 text-sm text-gray-600';
            regenerateLyricsBtn?.insertAdjacentElement('afterend', el);
        }
        return el;
    }




    function lockRegenerateButton() {
        if (!regenerateLyricsBtn) return;
        regenerateLyricsBtn.disabled = true;
        regenerateLyricsBtn.classList.add('opacity-60','cursor-not-allowed');
        regenerateLyricsBtn.innerHTML = 'Limite de revisões atingido';
        const msg = ensureReviseMsgEl();
        msg.innerHTML = `Você chegou ao limite de ${REVISE_LIMIT} revisões automáticas.
  Fale com nossa equipe pelo <a href="${WHATSAPP_LINK}" target="_blank" rel="noopener" class="underline font-medium">WhatsApp</a> para mais alterações.`;
    }
// Se já bateu o limite anteriormente na sessão, trava ao carregar
    if (getReviseCount() >= REVISE_LIMIT) lockRegenerateButton();


    const lyricsAreaLive = document.getElementById('generatedLyrics');
    if (lyricsAreaLive) {
        lyricsAreaLive.addEventListener('input', () => {
            window.generatedLyric = lyricsAreaLive.value;
        });
    }


    // Botão "Gerar novamente" com spinner
    if (regenerateLyricsBtn) {
        regenerateLyricsBtn.addEventListener('click', async function () {
            if (getReviseCount() >= REVISE_LIMIT) {
                lockRegenerateButton();
                return;
            }

            const original = regenerateLyricsBtn.innerHTML;
            regenerateLyricsBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando novamente...';
            regenerateLyricsBtn.disabled = true;

            const ok = await regenerateLyrics();

            // Se ainda não atingiu o limite, volta o botão ao normal
            if (ok && getReviseCount() < REVISE_LIMIT) {
                regenerateLyricsBtn.disabled = false;
                regenerateLyricsBtn.innerHTML = original;
            }
        });
    }


    function getCurrentLyricWithTitle() {
        const title = (document.getElementById('songTitle')?.textContent || 'Música Personalizada').trim();
        const body  = (document.getElementById('generatedLyrics')?.value || window.generatedLyric || '').trim();
        return `Título: ${title}\n${body}`;
    }

    async function regenerateLyrics() {
        const loadingGif = document.getElementById('loadingGif');
        const lyricsArea = document.getElementById('generatedLyrics');
        const titleEl    = document.getElementById('songTitle');

        // Monta payload para revisão
        const correcoes = (document.getElementById("lyricFeedback").value || "").trim();
        const payload = {
            estilo:         document.getElementById("genre").value,
            ocasiao:        document.getElementById("occasion").value,
            relacionamento: document.getElementById("relationship").value,
            destinatario:   document.getElementById("recipient").value,
            mensagem:       document.getElementById("message").value, // opcional, ajuda no tom
            letraAtual:     getCurrentLyricWithTitle(),
            // Se o usuário não escreveu nada, pedimos uma nova variação suave:
            correcoes:      correcoes || "Gere outra versão mantendo tema, estilo e estrutura; ajuste rimas e fluidez."
        };

        loadingGif.classList.remove('hidden');

        // reCAPTCHA token
        const captchaToken = await getCaptchaToken('revise_lyrics');

        try {
            const res = await fetch("/api/reviseLyrics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, captchaToken })
            });
            if (!res.ok) throw new Error("Erro HTTP na revisão");
            const data = await res.json();
            if (!data.letra || !data.titulo) throw new Error("Resposta incompleta");

            titleEl.textContent   = data.titulo;
            if(lyricsArea) {lyricsArea.value      = data.letra;}


            window.generatedLyric = data.letra;
            window.lastGeneratedLyric = data.letra;

            // Ativa o botão "Continuar" após a letra ser revisada
            checkStep2Completion();



            // ===== incremento do limite (sucesso) =====

// NOVO: cache dos dados e envio da letra revisada por e-mail
            step1FormData = {
                destinatario:   document.getElementById("recipient").value,
                email:          document.getElementById("customerEmail").value,
                telefone:       getPhone().e164,
                estilo:         document.getElementById("genre").value,
                ocasiao:        document.getElementById("occasion").value,
                relacionamento: document.getElementById("relationship").value,
                mensagem:       document.getElementById("message").value,
                preco:          document.getElementById("priceRef").value.replace('_', ',')
            };
            try {
                await emailjs.send(EMAIL_SERVICE, EMAIL_TEMPLATE_LETRA, {
                    ...step1FormData,
                    letra: data.letra
                });
                window.lastEmailLyricSent = data.letra;
            } catch (emailError) {
                console.error("Erro ao enviar email (letra revisada):", emailError);
            }

// ===== incremento do limite (sucesso) =====
            const newCount = getReviseCount() + 1;
            setReviseCount(newCount);
            if (newCount >= REVISE_LIMIT) lockRegenerateButton();

            return true;

        } catch (err) {
            console.error(err);
            alert("Não foi possível revisar agora. Tente novamente.");
            return false; // falha
        } finally {
            loadingGif.classList.add('hidden');
        }

    }



    // Avançar para o passo 2 (Letra da Música)
// Avançar para o passo 2 (Letra da Música)
    nextStepBtn.addEventListener('click', async function (e) {
        e.preventDefault();

        if (!validateRequiredFields()) return;

        // Popula window.userData para integração futura com GTM / Meta Pixel via Data Layer
        window.userData = window.userData || {};
        window.userData.nome_completo = document.getElementById('customerFullName')?.value?.trim() || '';
        window.userData.email = document.getElementById('customerEmail')?.value?.trim() || '';
        window.userData.telefone = getPhone()?.e164 || '';

        // Salva lead no Supabase antes de gerar a letra
        saveLead().catch(err => console.error('[LEAD] Falha ao salvar:', err));

        // ✅ Dispara evento InitiateCheckout do Facebook Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', 'InitiateCheckout', {
                content_name: 'Geração de Letra',
                content_category: 'music_creation',
                value: window.currentBasePrice || 97.00,
                currency: 'BRL'
            });
        }

        const useOwnLyric = document.getElementById('useMessageAsLyric')?.checked;
        const originalLabel = nextStepBtn.innerHTML;

        nextStepBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Continuando...';
        nextStepBtn.disabled = true;




        // se for direto para pagamento
        // ADICIONE antes do if: cache para emails
        const basePayload = {
            nome_completo:  document.getElementById("customerFullName").value.trim(),
            destinatario:   document.getElementById("recipient").value,
            email:          document.getElementById("customerEmail").value,
            telefone:       getPhone().e164,
            estilo:         document.getElementById("genre").value,
            ocasiao:        document.getElementById("occasion").value,
            relacionamento: document.getElementById("relationship").value,
            mensagem:       document.getElementById("message").value,
            preco:          document.getElementById("priceRef").value.replace('_', ','),
            vocalGender:    getVocalGender()
        };
        step1FormData = { ...basePayload };

// se for direto para pagamento
        if (useOwnLyric) {
            const finalLyricInput = document.getElementById('finalLyric');
            if (finalLyricInput) finalLyricInput.value = basePayload.mensagem || '';

            // envia e-mail com a letra própria (ok)
            try {
                await emailjs.send(EMAIL_SERVICE, EMAIL_TEMPLATE_LETRA, {
                    ...step1FormData,
                    letra: step1FormData.mensagem
                });
                window.lastEmailLyricSent = step1FormData.mensagem;
            } catch (e) {
                console.error('Erro ao enviar email (letra própria):', e);
            }

            // ✅ NÃO dispare o emailReminder aqui. Ele vai disparar ao entrar no Step 3.
            goToStep3();
            nextStepBtn.disabled = false;
            nextStepBtn.innerHTML = 'Continuar para Pagamento';
            return;
        }

        // mostrar Step 2 e o loader IMEDIATAMENTE
        step1Content.classList.add('hidden');
        step2Content.classList.remove('hidden');
        step1Indicator.classList.remove('bg-purple-600','text-white');
        step1Indicator.classList.add('bg-gray-200','text-gray-600');
        step2Indicator.classList.remove('bg-gray-200','text-gray-600');
        step2Indicator.classList.add('bg-purple-600','text-white');

        // Scroll para o topo do form (promo bar ou step indicators)
        const promoBar = document.getElementById('promoBarTop');
        const formCard = step2Content.closest('.form-card');
        if (promoBar) {
            promoBar.scrollIntoView({ behavior: 'instant', block: 'start' });
        } else if (formCard) {
            formCard.scrollIntoView({ behavior: 'instant', block: 'start' });
        } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }

        // exibe o GIF agora
        const loadingGif  = document.getElementById('loadingGif');
        const lyricsArea  = document.getElementById('generatedLyrics');
        if(lyricsArea) {
            lyricsArea?.classList.add('hidden');
            lyricsArea && (lyricsArea.value = '');
        }
        if(loadingGif) {
            loadingGif?.classList.remove('hidden');
        }



        nextStepBtn.disabled = true;
        nextStepBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando letra...';

        // deixa o browser pintar o loader antes da requisição
        await new Promise(r => requestAnimationFrame(r));

        // agora chama a geração
        generateLyrics().finally(() => {
            // o botão fica escondido no step 1, mas deixo resetado por segurança
            nextStepBtn.disabled = false;
            nextStepBtn.innerHTML = 'Gerar Letra da Música';
        });

    });



    // Voltar para o passo 1 (Formulário)
    backToStep1Btn.addEventListener('click', function() {
        step2Content.classList.add('hidden');
        step1Content.classList.remove('hidden');
        step2Indicator.classList.remove('bg-purple-600', 'text-white');
        step2Indicator.classList.add('bg-gray-200', 'text-gray-600');
        step1Indicator.classList.remove('bg-gray-200', 'text-gray-600');
        step1Indicator.classList.add('bg-purple-600', 'text-white');
    });

    async function enviarFeedbackLetra() {
        const feedback = document.getElementById('lyricFeedback').value.trim();
        const emailParams = { ...step1FormData, lyricFeedback: feedback };

        try {
            if (feedback.length > 0) {
                await emailjs.send(EMAIL_SERVICE, EMAIL_TEMPLATE_LETRA, emailParams);
                console.log("Feedback enviado com sucesso! Obrigado :)");
            }
        } catch (err) {
            console.error("Erro ao enviar feedback:", err);
        }
    }

    // Avançar para o passo 3 (Pagamento)
    // Avançar para o passo 3 (Pagamento)
    goToPaymentBtn.addEventListener('click', async function () {

        if (!validateRequiredFields()) {
            // volta visualmente para os detalhes se estiver no passo 2
            document.getElementById('step1Content')?.classList.remove('hidden');
            document.getElementById('step2Content')?.classList.add('hidden');
            document.getElementById('step1Indicator')?.classList.add('bg-purple-600','text-white');
            document.getElementById('step2Indicator')?.classList.remove('bg-purple-600','text-white');
            return;
        }

        const original = goToPaymentBtn.innerHTML;
        goToPaymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Continuando...';
        goToPaymentBtn.disabled = true;

        try {
            const finalLyricInput = document.getElementById('finalLyric');
            if (finalLyricInput) {
                const useOwn = document.getElementById('useMessageAsLyric')?.checked;
                finalLyricInput.value = useOwn
                    ? (document.getElementById('message').value || '')
                    : (document.getElementById('generatedLyrics').value || window.generatedLyric || '');
            }

            // Envia e-mail com a versão final (se diferente do último e-mail enviado)
            const finalLyric = finalLyricInput?.value || '';
            try {
                if (finalLyric && window.lastEmailLyricSent !== finalLyric) {
                    await emailjs.send(EMAIL_SERVICE, EMAIL_TEMPLATE_LETRA, {
                        ...step1FormData,
                        letra: finalLyric
                    });
                    window.lastEmailLyricSent = finalLyric;
                }
            } catch (e) {
                console.error('Erro ao enviar email (letra final):', e);
            }

            const feedback = document.getElementById('lyricFeedback').value;
            document.getElementById('finalLyricFeedback').value = feedback;



            goToStep3();

        } catch (err) {
            console.error('Erro ao avançar para pagamento:', err);
            alert('Ocorreu um erro. Tente novamente.');
        } finally {
            // Sempre restaura o botão, independente de sucesso ou erro
            goToPaymentBtn.disabled = false;
            goToPaymentBtn.innerHTML = original;
        }
    });



    // Voltar para o passo 2 (Letra da Música)
    backToStep2Btn.addEventListener('click', function () {
        const useOwnLyric = document.getElementById('useMessageAsLyric')?.checked;

        // Sempre sair do step 3
        step3Content.classList.add('hidden');
        step3Indicator.classList.remove('bg-purple-600', 'text-white');
        step3Indicator.classList.add('bg-gray-200', 'text-gray-600');

        if (useOwnLyric) {
            // Se marcou "Desejo usar a minha letra", volta para o STEP 1
            step1Content.classList.remove('hidden');
            step2Content.classList.add('hidden');

            step2Indicator.classList.remove('bg-purple-600', 'text-white');
            step2Indicator.classList.add('bg-gray-200', 'text-gray-600');

            step1Indicator.classList.remove('bg-gray-200', 'text-gray-600');
            step1Indicator.classList.add('bg-purple-600', 'text-white');
        } else {
            // Fluxo normal: voltar para o STEP 2
            step2Content.classList.remove('hidden');

            step2Indicator.classList.remove('bg-gray-200', 'text-gray-600');
            step2Indicator.classList.add('bg-purple-600', 'text-white');
        }
    });


    // Função para gerar a letra da música (simulação)
    // Função para gerar a letra da música (step 2)
    async function generateLyrics() {
        const payload = {
            destinatario: document.getElementById("recipient").value,
            email:        document.getElementById("customerEmail").value,
            telefone:     getPhone().e164,
            mensagem:     document.getElementById("message").value,
            estilo:       document.getElementById("genre").value,
            relacionamento: document.getElementById("relationship").value,
            ocasiao:      document.getElementById("occasion").value,
            vocalGender:  getVocalGender()
        };

        step1FormData = { ...payload };

        const USAGE_LIMIT = 3000;
        let usoAtual = parseInt(sessionStorage.getItem("musicas_geradas") || "0");
        if (usoAtual >= USAGE_LIMIT) {
            alert("Você já gerou o limite de 3 músicas nesta sessão. Para continuar, finalize sua compra ou entre em contato.");
            const btn = document.getElementById("nextStepBtn");
            if (btn) { btn.disabled = true; btn.innerText = "Limite Atingido"; }
            return;
        }

        const loadingGif = document.getElementById('loadingGif');
        const lyricsArea = document.getElementById('generatedLyrics');
        const titleEl    = document.getElementById("songTitle");

        // mostra loader e reseta área/aviso
        loadingGif?.classList.remove('hidden');
        generationReassure?.classList.add('hidden');
        if (lyricsArea) { lyricsArea.classList.add('hidden'); lyricsArea.value = ''; }

        // reCAPTCHA token
        const captchaToken = await getCaptchaToken('generate_lyrics');

        // Timers: avisa após Xs e aborta em Ys
        const controller = new AbortController();
        const stallId = setTimeout(showGenerationReassure, GENERATION_STALL_MS);
        const hardTimeoutId = setTimeout(() => controller.abort(), GENERATION_HARD_TIMEOUT_MS);

        async function fetchWithRetry(retries = 1) {
            try {
                const res = await fetch("/api/gerarLetra", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...payload, captchaToken }),
                    signal: controller.signal
                });
                if (!res.ok) throw new Error("Erro HTTP");
                return await res.json();
            } catch (err) {
                if (err.name === "AbortError") throw err;
                if (retries > 0) return await fetchWithRetry(retries - 1);
                throw err;
            }
        }

        try {
            const data = await fetchWithRetry();
            if (!data.letra || !data.titulo) throw new Error("Resposta incompleta");

            sessionStorage.setItem("musicas_geradas", usoAtual + 1);

            titleEl.textContent = data.titulo;
            if (lyricsArea) lyricsArea.value = data.letra;

            window.generatedTitle      = data.titulo;
            window.generatedLyric      = data.letra;
            window.lastGeneratedLyric  = data.letra;

            // Ativa o botão "Continuar" após a letra ser gerada
            checkStep2Completion();



        } catch (error) {
            console.error(error);

            // Mensagem amigável e garantia de avanço
            const msgTimeout = (error?.name === "AbortError")
                ? "A geração demorou mais do que o esperado."
                : "Ocorreu um erro ao gerar a letra.";

            if (lyricsArea) {
                lyricsArea.value =
                    `${msgTimeout}

Você pode continuar para o pagamento agora — você terá direito a revisar sua letra e sua música depois. 😊`;
            }
            showGenerationReassure(); // exibe o aviso azul

            // Ativa o botão mesmo com mensagem de fallback
            checkStep2Completion();

        } finally {
            clearTimeout(stallId);
            clearTimeout(hardTimeoutId);
            loadingGif?.classList.add('hidden');
            lyricsArea?.classList.remove('hidden');
        }
    }


});


// Função para atualizar lead com dados gerados
async function updateLeadData() {
    if (!window.currentLeadId) return;
    const supabaseClient = window.API_CONFIG?.supabaseClient;
    if (!supabaseClient) return;
    const feedback = document.getElementById('lyricFeedback')?.value || '';
    const { error } = await supabaseClient
        .from('leads')
        .update({
            titulo: window.generatedTitle || '',
            letra_gerada: window.generatedLyric || '',
            alteracoes_usuario: feedback
        })
        .eq('id', window.currentLeadId);
    if (error) console.error('[LEAD] Erro ao atualizar:', error);
    else console.log('[LEAD] Atualizado com sucesso');
}

// Substitua a função existente por esta versão unificada (sem parâmetros)
async function goToStep3() {
    // Atualiza lead no Supabase antes de avançar
    await updateLeadData();
    const step1Content = document.getElementById('step1Content');
    const step2Content = document.getElementById('step2Content');
    const step3Content = document.getElementById('step3Content');

    const step1Indicator = document.getElementById('step1Indicator');
    const step2Indicator = document.getElementById('step2Indicator');
    const step3Indicator = document.getElementById('step3Indicator');

    // Esconde sempre 1 e 2, mostra 3
    step1Content.classList.add('hidden');
    step2Content.classList.add('hidden');
    step3Content.classList.remove('hidden');

    // Indicadores
    step1Indicator.classList.remove('bg-purple-600', 'text-white');
    step1Indicator.classList.add('bg-gray-200', 'text-gray-600');

    step2Indicator.classList.remove('bg-purple-600', 'text-white');
    step2Indicator.classList.add('bg-gray-200', 'text-gray-600');

    step3Indicator.classList.remove('bg-gray-200', 'text-gray-600');
    step3Indicator.classList.add('bg-purple-600', 'text-white');

    const backBtn = document.getElementById('backToStep2Btn');
    if (backBtn) {
        backBtn.textContent = document.getElementById('useMessageAsLyric')?.checked
            ? 'Voltar para Detalhes'
            : 'Voltar para Letra';
    }

    // Scroll para o topo do form
    const promoBarTop = document.getElementById('promoBarTop');
    const step3FormCard = document.getElementById('step3Content')?.closest('.form-card');
    if (promoBarTop) {
        promoBarTop.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else if (step3FormCard) {
        step3FormCard.scrollIntoView({ behavior: 'instant', block: 'start' });
    }

    // Preenche nome do destinatário na seção "Por Que Escolher"
    const recipientDisplay = document.getElementById('recipientNameDisplay');
    const recipientValue = document.getElementById('recipient')?.value?.trim();
    if (recipientDisplay && recipientValue) {
        recipientDisplay.textContent = recipientValue;
    }

    // Sincroniza email do Step 1 para Step 3 (campo de exibição)
    const step1Email = document.getElementById('customerEmail')?.value?.trim();
    const step3EmailText = document.getElementById('step3EmailText');
    if (step3EmailText && step1Email) {
        step3EmailText.textContent = step1Email;
    }

    try { triggerEmailReminderOnPriceStep(); } catch (_) {}

    // Verifica estado do botão de pagamento ao entrar no Step 3
    checkStep3Completion();
}


function normalizeBRPhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    // Se vier com DDI 55 (Instagram), corta para local para validar
    const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
    const isValid = local.length === 10 || local.length === 11; // fixo(10) ou celular(11)
    const e164 = isValid ? `+55${local}` : '';
    const wa   = isValid ?  `55${local}` : ''; // para wa.me / integrações só dígitos
    return { digits, local, e164, wa, isValid };
}

function getPhone() {
    return normalizeBRPhone(document.getElementById('customerPhone').value);
}

function syncPhoneHidden(from) {
    const { wa } = normalizeBRPhone(from ?? phoneMask?.unmaskedValue ?? phoneEl?.value ?? '');
    const h = document.getElementById('phoneFormated');
    if (h) h.value = wa;
}

if (phoneEl) {
    ['input','change','blur'].forEach(evt => {
        phoneEl.addEventListener(evt, () => syncPhoneHidden());
    });
}

document.addEventListener('DOMContentLoaded', () => syncPhoneHidden());


// Funcionalidade do modal
const modal = document.getElementById('modal');
const paymentModal = document.getElementById('paymentModal');
const createSongBtn = document.getElementById('createSongBtn');
const howItWorksBtn = document.getElementById('howItWorksBtn');
const bottomCtaBtn = document.getElementById('bottomCtaBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
//const closePaymentModalBtn = document.getElementById('closePaymentModalBtn');
const nextStepBtn = document.getElementById('nextStepBtn');
const backStepBtn = document.getElementById('backStepBtn');
const openPaymentModalBtn = document.getElementById('openPaymentModalBtn');
const step1Content = document.getElementById('step1Content');
const step2Content = document.getElementById('step2Content');
const step1Indicator = document.getElementById('step1Indicator');
const step2Indicator = document.getElementById('step2Indicator');
const step1Form = document.getElementById('step1Form');

// ====== VALIDAÇÃO (campos obrigatórios) ======
// Nota: CPF não está aqui pois é solicitado apenas no Step 3 quando PIX é selecionado
const REQUIRED = [
    { id: 'customerFullName', errorId: 'customerFullNameError', validate: v => v.trim().length > 2 },
    { id: 'customerEmail',   errorId: 'customerEmailError',  validate: v => /\S+@\S+\.\S+/.test(v) },
    { id: 'customerName',    errorId: 'customerNameError',   validate: v => v.length > 1 },
    // { id: 'customerPhone',   errorId: 'customerPhoneError',  validate: v => normalizeBRPhone(v).isValid },
    { id: 'recipient',       errorId: 'recipientError',      validate: v => v.trim().length > 0 },
    { id: 'relationship',    errorId: 'relationshipError',   validate: v => v.trim().length > 0 },
    { id: 'occasion',        errorId: 'occasionError',       validate: v => v.trim().length > 0 },
    { id: 'genre',           errorId: 'genreError',          validate: v => v.trim().length > 0 },
    { id: 'message',         errorId: 'messageError',        validate: v => v.trim().length > 0 }
];

// ====== VERIFICAÇÃO EM TEMPO REAL DO FORMULÁRIO ======
function checkFormCompletion() {
    const nextBtn = document.getElementById('nextStepBtn');
    if (!nextBtn) return;

    const step1 = document.getElementById('step1Content');
    let allValid = true;

    REQUIRED.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el) return;
        // Verifica apenas campos visíveis no Step 1
        if (step1 && !step1.contains(el)) return;

        const value = (el.value || '').trim();
        const valid = f.validate ? f.validate(value) : !!value;
        if (!valid) allValid = false;
    });

    if (allValid) {
        nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        nextBtn.classList.add('opacity-100', 'btn-destaque');
        nextBtn.disabled = false;
    } else {
        nextBtn.classList.remove('opacity-100', 'btn-destaque');
        nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
        nextBtn.disabled = false; // mantém clicável para mostrar erros
    }
}

// Verificação em tempo real para Step 2 (botão Continuar)
function checkStep2Completion() {
    const goToPaymentBtn = document.getElementById('goToPaymentBtn');
    if (!goToPaymentBtn) return;

    const lyricsArea = document.getElementById('generatedLyrics');
    const hasLyrics = lyricsArea && lyricsArea.value.trim().length > 0;

    if (hasLyrics) {
        goToPaymentBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        goToPaymentBtn.classList.add('opacity-100', 'btn-destaque');
    } else {
        goToPaymentBtn.classList.remove('opacity-100', 'btn-destaque');
        goToPaymentBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// Verificação em tempo real para Step 3 (botão Finalizar Pagamento)
function checkStep3Completion() {
    const btnFinalizar = document.getElementById('btnFinalizarPagamento');
    if (!btnFinalizar) return;

    const nameInput = document.getElementById('customerName');
    const cpfInput = document.getElementById('customerCpf');
    const emailInput = document.getElementById('customerEmail');
    const phoneInput = document.getElementById('customerPhone');

    const hasName = nameInput && nameInput.value.trim().length >= 2;
    const hasCpf = cpfInput && cpfInput.value.replace(/\D/g, '').length === 11;
    const hasEmail = emailInput && /\S+@\S+\.\S+/.test(emailInput.value.trim());
    const hasPhone = phoneInput && phoneInput.value.replace(/\D/g, '').length >= 10;

    const allValid = hasName && hasCpf && hasEmail && hasPhone;

    if (allValid) {
        btnFinalizar.classList.remove('opacity-50', 'cursor-not-allowed');
        btnFinalizar.classList.add('opacity-100', 'btn-destaque');
    } else {
        btnFinalizar.classList.remove('opacity-100', 'btn-destaque');
        btnFinalizar.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// limpa erro ao digitar/trocar (sem scroll automático) + verificação em tempo real
REQUIRED.forEach(f => {
    const el = document.getElementById(f.id);
    const err = document.getElementById(f.errorId);
    if (!el || !err) return;
    const clear = (e) => {
        e.stopPropagation(); // evita propagação
        el.classList.remove('error-border', 'shake');
        err.classList.add('hidden');
        // Verifica preenchimento em tempo real
        checkFormCompletion();
    };
    el.addEventListener('input', clear, { passive: true });
    el.addEventListener('change', clear, { passive: true });
});

// Listener para o campo de letras geradas (Step 2)
const generatedLyricsEl = document.getElementById('generatedLyrics');
if (generatedLyricsEl) {
    generatedLyricsEl.addEventListener('input', () => {
        checkStep2Completion();
    });
}

// Inicializa estado dos botões ao carregar
document.addEventListener('DOMContentLoaded', () => {
    checkFormCompletion();
    checkStep2Completion();
    checkStep3Completion();

    // Listeners para campos do Step 3
    const step3Fields = ['customerName', 'customerCpf', 'customerPhone'];
    step3Fields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el) {
            el.addEventListener('input', () => checkStep3Completion(), { passive: true });
            el.addEventListener('change', () => checkStep3Completion(), { passive: true });
        }
    });
});

function validateRequiredFields({scrollToFirst=true} = {}) {
    let ok = true, firstBad = null;
    const step1 = document.getElementById('step1Content');

    REQUIRED.forEach(f => {
        const el   = document.getElementById(f.id);
        const err  = document.getElementById(f.errorId);
        if (!el || !err) return;

        // Pula campos que não estão no Step 1 (ex: v2 move email/nome para Step 3)
        if (step1 && !step1.contains(el)) return;

        const value = (el.value || '').trim();
        const valid = f.validate ? f.validate(value) : !!value;

        if (!valid) {
            ok = false;
            if (!firstBad) firstBad = el;
            el.classList.add('error-border');
            err.classList.remove('hidden');
            // Shake effect
            el.classList.remove('shake');
            void el.offsetWidth; // force reflow to restart animation
            el.classList.add('shake');
        } else {
            el.classList.remove('error-border', 'shake');
            err.classList.add('hidden');
        }
    });

    if (!ok && firstBad && scrollToFirst) {
        // Mobile: scroll suave sem forçar foco que abre teclado
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            // Apenas scroll, sem focus automático para evitar teclado
            firstBad.scrollIntoView({ behavior:'smooth', block:'nearest' });
            // Highlight visual em vez de focus
            firstBad.classList.add('error-border');
            setTimeout(() => firstBad.focus(), 300);
        } else {
            firstBad.scrollIntoView({ behavior:'smooth', block:'center' });
            firstBad.focus();
        }
    }
    return ok;
}

// Fechar modais
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
        document.body.style.overflow = 'auto';
    });
}


// Voltar passo no modal
if (backStepBtn) {
    backStepBtn.addEventListener('click', () => {
        step2Content.classList.add('hidden');
        step1Content.classList.remove('hidden');
        step2Indicator.classList.remove('bg-purple-600', 'text-white');
        step2Indicator.classList.add('bg-gray-200', 'text-gray-600');
        step1Indicator.classList.remove('bg-gray-200', 'text-gray-600');
        step1Indicator.classList.add('bg-purple-600', 'text-white');
    });
}



// Funcionalidade do player de música
const playButton = document.getElementById('playButton');
const listenExampleBtn = document.getElementById('listenExampleBtn');
const playIcon = document.getElementById('playIcon');
// songAudio é declarado em spotify-player.js — não redeclarar aqui
const audioWave = document.getElementById('audioWave');
const heroSection = document.getElementById('heroSection');
const musicNotes = [
    document.getElementById('note1'),
    document.getElementById('note2'),
    document.getElementById('note3'),
    document.getElementById('note4')
];

let isPlaying = false;

function toggleMusic() {
    const audio = document.getElementById('songAudio');
    if (isPlaying) {
        // Pausar a música
        audio?.pause();
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
        playButton.classList.remove('active');
        audioWave.classList.remove('playing');
        heroSection.classList.remove('playing');
    } else {
        // Tocar a música
        audio?.play();
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
        playButton.classList.add('active');
        audioWave.classList.add('playing');
        heroSection.classList.add('playing');

        // Animar notas musicais
        musicNotes.forEach(note => {
            note.classList.add('animate');
            // Reiniciar animação após a conclusão
            setTimeout(() => {
                note.classList.remove('animate');
            }, 4000);
        });
    }

    isPlaying = !isPlaying;
}

if (playButton) playButton.addEventListener('click', toggleMusic);
if (listenExampleBtn) listenExampleBtn.addEventListener('click', toggleMusic);

// Quando a música terminar, redefinir a UI
const songAudioEl = document.getElementById('songAudio');
if (songAudioEl) {
    songAudioEl.addEventListener('ended', () => {
        playIcon?.classList.remove('fa-pause');
        playIcon?.classList.add('fa-play');
        playButton?.classList.remove('active');
        audioWave?.classList.remove('playing');
        heroSection?.classList.remove('playing');
        isPlaying = false;
    });
}



// Smooth scrolling para links do menu
document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Prevenir envio dos formulários (para demonstração)
if (step1Form) {
    step1Form.addEventListener('submit', (e) => {
        const email = document.getElementById("customerEmail")?.value;
        if (email) {
            localStorage.setItem("customerEmail", email);
        }
        e.preventDefault();
    });
}


// === HELPERS PARA REMINDER NO STEP 3 (sem Mercado Pago) ===
async function triggerEmailReminderOnPriceStep() {
    // evita duplicar
    if (sessionStorage.getItem("emailReminderSent") === "1") return;

    try {
        const useOwn = document.getElementById('useMessageAsLyric')?.checked;
        const finalLyric = useOwn
            ? (document.getElementById('message').value || '')
            : (document.getElementById('generatedLyrics').value || window.generatedLyric || '');

        const payload = {
            destinatario:   document.getElementById("recipient").value,
            email:          document.getElementById("customerEmail").value,
            telefone:       getPhone().e164,
            estilo:         document.getElementById("genre").value,
            relacionamento: document.getElementById("relationship").value,
            ocasiao:        document.getElementById("occasion").value,
            mensagem:       document.getElementById("message").value,
            letra:          finalLyric,
            lyricFeedback:  document.getElementById("finalLyricFeedback").value || "",
            // Não há mais link do Mercado Pago - pagamento é feito na própria página
            linkPagamento:  window.location.href,
            vocalGender: getVocalGender()
        };

        fetch("/api/emailReminder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        sessionStorage.setItem("emailReminderSent", "1");
        console.debug("[Reminder] Enviado");
    } catch (err) {
        console.error("[Reminder] Falha ao enviar:", err);
    }
}


const templateId = ''
const serviceId = ''
const EmailForm = document.getElementById("step1Form");

EmailForm.addEventListener("submit", function (e) {
    e.preventDefault();

    emailjs.sendForm(serviceId, templateId, this)
        .then(function () {
            EmailForm.reset();
        }, function (error) {
            alert("Erro ao enviar. Tente novamente.");
            console.error(error);
        });
});




const emoji = "🎵";
const canvas = document.createElement('canvas');
canvas.width = 64;
canvas.height = 64;

const ctx = canvas.getContext('2d');
ctx.font = '48px serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);

const link = document.getElementById('dynamic-favicon');
link.href = canvas.toDataURL();

// === PREÇOS + ENTREGA PRIORITÁRIA ===
(function () {
    // Tabela de preços (mesma que você já estava usando)
    const prices = {
        p01829128839102: 3,
        p03: 57.00,  p02: 67.00,  p01: 77.00,  p0: 87.00,
        p1: 5.00,   // TEMP: Alterado para teste de R$ 5,00 (era 97.00)
        p6: 147.00,  p7: 157.00, p8: 167.00, p9: 177.00, p10: 187.00,
        p11: 197.00, p12: 207.00, p13: 217.00, p14: 227.00, p15: 237.00,
        p16: 247.00, p17: 257.00, p18: 267.00, p19: 277.00, p20: 287.00,
        p21: 297.00, p22: 307.00, p23: 317.00, p24: 327.00, p25: 337.00,
        p26: 347.00, p27: 357.00, p28: 367.00, p29: 377.00, p30: 387.00,
        p31: 397.00, p32: 407.00, p33: 417.00, p34: 427.00, p35: 437.00,
        p36: 447.00, p37: 457.00, p38: 467.00, p39: 477.00, p40: 487.00,
        p41: 497.00, p42: 507.00, p43: 517.00, p44: 527.00, p45: 537.00,
        p46: 547.00
    };

    const originalPrices = {
        p01829128839102: 49.00,
        p03: 199.00,  p02: 199.00,  p01: 199.00,  p0: 199.00,
        p1: 249.00,   p3: 249.00,  p4: 249.00,  p5: 349.00,
        p6: 649.00,   p7: 749.00,  p8: 799.00,  p9: 849.00,  p10: 899.00,
        p11: 949.00,  p12: 999.00, p13: 1049.00, p14: 1099.00, p15: 1149.00,
        p16: 1199.00, p17: 1249.00, p18: 1299.00, p19: 1349.00, p20: 1399.00,
        p21: 1449.00, p22: 1499.00, p23: 1549.00, p24: 1599.00, p25: 1649.00,
        p26: 1699.00, p27: 1749.00, p28: 1799.00, p29: 1849.00, p30: 1899.00,
        p31: 1949.00, p32: 1999.00, p33: 2049.00, p34: 2099.00, p35: 2149.00,
        p36: 2199.00, p37: 2249.00, p38: 2299.00, p39: 2349.00, p40: 2399.00,
        p41: 2449.00, p42: 2499.00, p43: 2549.00, p44: 2599.00, p45: 2649.00,
        p46: 2699.00
    };

    const PRIORITARY_FEE = 19.90;
    const fmt = n => (typeof n === 'number' && !isNaN(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Preço base a partir do ?p=
    function normalizePriceKeyFromURL() {
        const u = new URLSearchParams(window.location.search);

        if (u.has("pm")) {
            const n = Math.abs(parseInt(u.get("pm"), 10) || 1);
            return `pm${n}`;
        }
        if (u.has("p")) {
            const v = String(u.get("p")).toLowerCase().trim();

            if (/^pm\d+$/.test(v)) return v;                                  // p=pm1
            if (/^p-\d+$/.test(v)) return `pm${Math.abs(parseInt(v.slice(2),10)||1)}`; // p=-1 ⇒ pm1
            if (/^-\d+$/.test(v))  return `pm${Math.abs(parseInt(v,10)||1)}`;         // -1  ⇒ pm1
            if (/^p0\d+$/.test(v)) return `pm${parseInt(v.slice(1),10)||1}`;          // p01 ⇒ pm1
            if (/^0\d+$/.test(v))  return `pm${parseInt(v,10)||1}`;                   // 01  ⇒ pm1
            if (/^p\d+$/.test(v))  return v;                                          // p5
            if (/^\d+$/.test(v))   return `p${parseInt(v,10)}`;                        // 5
        }
        return "p5";
    }

    const priceKey = normalizePriceKeyFromURL();
    const basePrice     = prices[priceKey] ?? prices["p5"];
    const originalPrice = originalPrices[priceKey] ?? originalPrices["p5"];

    // Deixa acessível se precisar em outro lugar
    window.currentBasePrice = basePrice;

    // Helpers de seleção
    const checkbox = document.getElementById('prioritaryDelivery');
    const priceRef = document.getElementById('priceRef');

    // Garante que a linha "Entrega Prioritária" exista após "Música Personalizada"
    function ensureFastItemIn(containerSelector) {
        const box = document.querySelector(containerSelector);
        if (!box) return;

        if (!box.querySelector('.fast-item')) {
            const rows = box.querySelectorAll('.flex.justify-between.mb-2');
            if (!rows.length) return;

            // rows[0] = Música Personalizada, rows[1] = MP3...
            const mp3Row = rows[1];
            const fast = document.createElement('div');
            fast.className = 'flex justify-between mb-2 hidden fast-item';
            fast.innerHTML = `<span>Entrega Prioritária</span><span class="fast-price">+ ${fmt(PRIORITARY_FEE)}</span>`;
            box.insertBefore(fast, mp3Row);
        }
    }

    // Cria nos dois resumos (step 3 e modal)
    ensureFastItemIn('#step3Content .bg-gray-50.p-4.rounded-lg');
    ensureFastItemIn('#paymentModal .bg-gray-50.p-4.rounded-lg');

    function render() {
        const opted = !!checkbox?.checked;

        // Preço original (sempre o mesmo)
        document.querySelectorAll('.original_price').forEach(el => el.textContent = fmt(originalPrice));

        // Calcular subtotal (sem desconto PIX - isso é feito no index.html)
        const subtotal = basePrice + (opted ? PRIORITARY_FEE : 0);

        // Total base (sem desconto PIX)
        const total = subtotal;

        // Linha "Música Personalizada" (sempre preço base)
        const linePriceEls = [
            document.querySelector('#step3Content .bg-gray-50.p-4.rounded-lg .flex.justify-between.mb-2 span:nth-child(2)'),
            document.querySelector('#paymentModal .bg-gray-50.p-4.rounded-lg .flex.justify-between.mb-2 span:nth-child(2)')
        ].filter(Boolean);
        linePriceEls.forEach(el => el.textContent = fmt(basePrice));

        // Mostrar/ocultar "Entrega Prioritária"
        document.querySelectorAll('.fast-item').forEach(el => el.classList.toggle('hidden', !opted));
        document.querySelectorAll('.fast-price').forEach(el => el.textContent = `+ ${fmt(PRIORITARY_FEE)}`);

        // Economia (baseado no preço original vs preço base, sem PIX)
        const savings = Math.max(originalPrice - subtotal, 0);
        const savingsPct = Math.round((savings / originalPrice) * 100);
        document.querySelectorAll('.savings_amount').forEach(el => el.textContent = fmt(savings));
        document.querySelectorAll('.savings_percentage').forEach(el => el.textContent = `${savingsPct}%`);

        // priceRef para integrações (valor base sem desconto PIX)
        if (priceRef) priceRef.value = String(subtotal).replace('.', '_');

        // Salvar subtotal atual para uso global
        window.currentBasePrice = basePrice;

        // ✅ Chama a função do index.html para aplicar desconto PIX
        if (typeof window.updatePricesWithPixDiscount === 'function') {
            window.updatePricesWithPixDiscount();
        }
    }

// Função global para atualizar preços quando muda método de pagamento
    // NOTA: A função updatePricesWithPixDiscount está definida no index.html
    // Não sobrescrever aqui para evitar conflito

// Eventos
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            render();
        });
    }

    // Listener para mudança de método de pagamento
// NOTA: Os listeners principais estão no index.html
// Aqui apenas garantimos que render() atualiza preço base + prioritária
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(render, 50);
        });
    });


// Inicial //
    render();

    // Eventos
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            render();
        });
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    const slides = document.querySelectorAll('.example-slide');
    const prevBtn = document.querySelector('.example-prev');
    const nextBtn = document.querySelector('.example-next');
    const playButton = document.getElementById('playButton');
    const playIcon = document.getElementById('playIcon');
    // songAudio é declarado em spotify-player.js — acessar via getElementById diretamente
    const audioWave = document.getElementById('audioWave');
    let currentIndex = 0;
    let isExamplePlaying = false;

    // Mapeamento de gêneros para arquivos de áudio
    const genreAudios = {
        'sertanejo': 'audio/sertanejo_example.mpeg',
        'gospel': 'audio/gospel_example.mpeg',
        'rock': 'audio/rock_example.mpeg',
        'mpb': 'audio/mpb_example.mpeg',
        'folk': 'audio/folk_example.mpeg',
    };

    function toggleMusic() {
        if (isExamplePlaying) {
            // Pausar a música
            document.getElementById('songAudio')?.pause();
            playIcon.classList.remove('fa-pause');
            playIcon.classList.add('fa-play');
            playButton.classList.remove('active');
            audioWave.classList.remove('playing');
        } else {
            // Tocar a música do slide atual
            document.getElementById('songAudio')?.play();
            playIcon.classList.remove('fa-play');
            playIcon.classList.add('fa-pause');
            playButton.classList.add('active');
            audioWave.classList.add('playing');
        }
        isExamplePlaying = !isExamplePlaying;
    }

    function showSlide(index) {
        console.log('show slide', index)
        // Pausa a música se estiver tocando
        if (isExamplePlaying) {
            toggleMusic();
        }

        // Esconde todos os slides
        slides.forEach(slide => slide.classList.remove('active'));

        // Mostra o slide atual
        slides[index].classList.add('active');
        currentIndex = index;

        // Atualiza o arquivo de áudio para o gênero atual
        const currentGenre = slides[index].getAttribute('data-genre');
        const slideAudio = slides[index].getAttribute('data-audio');
        console.log('currentGenre', currentGenre)
        const audio = document.getElementById('songAudio');
        if (audio) {
            audio.src = slideAudio || genreAudios[currentGenre] || '';
            audio.load();
        }
    }

    // Navegação
    if (nextBtn) nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
    });

    if (prevBtn) prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        showSlide(currentIndex);
    });


    // Controle do player de música
    if (playButton) playButton.addEventListener('click', toggleMusic);

    // Quando a música terminar, redefinir a UI
    const audioEl = document.getElementById('songAudio');
    if (audioEl) {
        audioEl.addEventListener('ended', () => {
            playIcon?.classList.remove('fa-pause');
            playIcon?.classList.add('fa-play');
            playButton?.classList.remove('active');
            audioWave?.classList.remove('playing');
            isExamplePlaying = false;
        });
    }

    // Inicializa o primeiro slide
    if (slides.length > 0) showSlide(0);
});

document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuBtn = document.querySelector('nav button.md\\:hidden');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMobileMenuBtn = document.getElementById('closeMobileMenu');

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', () => {
        mobileMenu?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });

    if (closeMobileMenuBtn) closeMobileMenuBtn.addEventListener('click', () => {
        mobileMenu?.classList.add('hidden');
        document.body.style.overflow = 'auto';
    });

    // Fecha menu ao clicar em qualquer link
    document.querySelectorAll('#mobileMenu a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            document.body.style.overflow = 'auto';
        });
    });
});

(function () {
    const prices = {
        p01829128839102: 3,
        p03: 57.00,
        p02: 67.00,
        p01: 77.00,
        p0: 87.00,
        p1: 97.00,
        p3: 117.00,
        p4: 127.00,
        p5: 97.00,
        p6: 147.00,
        p7: 157.00,
        p8: 167.00,
        p9: 177.00,
        p10: 187.00,
        p11: 197.00,
        p12: 207.00,
        p13: 217.00,
        p14: 227.00,
        p15: 237.00,
        p16: 247.00,
        p17: 257.00,
        p18: 267.00,
        p19: 277.00,
        p20: 287.00,
        p21: 297.00,
        p22: 307.00,
        p23: 317.00,
        p24: 327.00,
        p25: 337.00,
        p26: 347.00,
        p27: 357.00,
        p28: 367.00,
        p29: 377.00,
        p30: 387.00,
        p31: 397.00,
        p32: 407.00,
        p33: 417.00,
        p34: 427.00,
        p35: 437.00,
        p36: 447.00,
        p37: 457.00,
        p38: 467.00,
        p39: 477.00,
        p40: 487.00,
        p41: 497.00,
        p42: 507.00,
        p43: 517.00,
        p44: 527.00,
        p45: 537.00,
        p46: 547.00
    };

    // Preços originais de referência (para mostrar o desconto)
    const originalPrices = {
        p01829128839102: 49.00,
        p03: 199.00,
        p02: 199.00,
        p01: 199.00,
        p0: 249.00,
        p1: 249.00,
        p3: 249.00,
        p4: 249.00,
        p5: 349.00,
        p6: 649.00,
        p7: 749.00,
        p8: 799.00,
        p9: 849.00,
        p10: 899.00,
        p11: 949.00,
        p12: 999.00,
        p13: 1049.00,
        p14: 1099.00,
        p15: 1149.00,
        p16: 1199.00,
        p17: 1249.00,
        p18: 1299.00,
        p19: 1349.00,
        p20: 1399.00,
        p21: 1449.00,
        p22: 1499.00,
        p23: 1549.00,
        p24: 1599.00,
        p25: 1649.00,
        p26: 1699.00,
        p27: 1749.00,
        p28: 1799.00,
        p29: 1849.00,
        p30: 1899.00,
        p31: 1949.00,
        p32: 1999.00,
        p33: 2049.00,
        p34: 2099.00,
        p35: 2149.00,
        p36: 2199.00,
        p37: 2249.00,
        p38: 2299.00,
        p39: 2349.00,
        p40: 2399.00,
        p41: 2449.00,
        p42: 2499.00,
        p43: 2549.00,
        p44: 2599.00,
        p45: 2649.00,
        p46: 2699.00
    };

    function normalizePriceKeyFromURL() {
        const u = new URLSearchParams(window.location.search);

        if (u.has("pm")) {
            const n = Math.abs(parseInt(u.get("pm"), 10) || 1);
            return `pm${n}`;
        }
        if (u.has("p")) {
            const v = String(u.get("p")).toLowerCase().trim();

            if (/^pm\d+$/.test(v)) return v;
            if (/^p-\d+$/.test(v)) return `pm${Math.abs(parseInt(v.slice(2),10)||1)}`;
            if (/^-\d+$/.test(v))  return `pm${Math.abs(parseInt(v,10)||1)}`;
            if (/^p0\d+$/.test(v)) return `pm${parseInt(v.slice(1),10)||1}`;
            if (/^0\d+$/.test(v))  return `pm${parseInt(v,10)||1}`;
            if (/^p\d+$/.test(v))  return v;
            if (/^\d+$/.test(v))   return `p${parseInt(v,10)}`;
        }
        return "p5";
    }

    const priceKey = normalizePriceKeyFromURL();
    const price         = prices[priceKey] || prices["p5"] || 97;
    const originalPrice = originalPrices[priceKey] || originalPrices["p5"] || 249;

    const formNameInput = document.querySelector('#priceRef');
    if (formNameInput) {
        formNameInput.value = `${String(price).replace('.', '_')}`;
    }

    // Formata os preços (com proteção contra undefined)
    const safePrice = typeof price === 'number' && !isNaN(price) ? price : 97;
    const safeOriginalPrice = typeof originalPrice === 'number' && !isNaN(originalPrice) ? originalPrice : 249;

    const formattedPrice = safePrice.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    const formattedOriginalPrice = safeOriginalPrice.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    // Calcula economia
    const savings = Math.max(safeOriginalPrice - safePrice, 0);
    const savingsPercentage = safeOriginalPrice > 0 ? Math.round((savings / safeOriginalPrice) * 100) : 0;

    const formattedSavings = savings.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    // Atualiza todos os elementos
    document.querySelectorAll('.music_price').forEach(el => {
        el.textContent = formattedPrice;
    });

    document.querySelectorAll('.original_price').forEach(el => {
        el.textContent = formattedOriginalPrice;
    });

    document.querySelectorAll('.discounted_price').forEach(el => {
        el.textContent = formattedPrice;
    });

    document.querySelectorAll('.savings_amount').forEach(el => {
        el.textContent = formattedSavings;
    });

    document.querySelectorAll('.savings_percentage').forEach(el => {
        el.textContent = `${savingsPercentage}%`;
    });
})();

function openMainModal() {
    const modalEl = document.getElementById('modal');
    if (!modalEl) return;

    // ✅ Usa style.display em vez de classList (evita conflito com observers)
    modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // garante que sempre abre no passo 1
    document.getElementById('step1Content')?.classList.remove('hidden');
    document.getElementById('step2Content')?.classList.add('hidden');
    document.getElementById('step3Content')?.classList.add('hidden');

    document.getElementById('step1Indicator')?.classList.add('bg-purple-600','text-white');
    document.getElementById('step2Indicator')?.classList.remove('bg-purple-600','text-white');
    document.getElementById('step3Indicator')?.classList.remove('bg-purple-600','text-white');
    document.getElementById('step2Indicator')?.classList.add('bg-gray-200','text-gray-600');
    document.getElementById('step3Indicator')?.classList.add('bg-gray-200','text-gray-600');

    if (typeof fbq !== 'undefined') {
        fbq('track', 'ViewContent', {
            content_name: 'Formulário de Música Personalizada',
            content_category: 'music_creation'
        });
    }
}

[createSongBtn, howItWorksBtn, bottomCtaBtn].forEach(btn => {
    btn?.addEventListener('click', (e) => {
        e.preventDefault?.();
        openMainModal();
    });
});

// ===== PREVENIR ZOOM NO iOS AO FOCAR INPUTS =====
;(function() {
    // Detecta iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
        // Adiciona listener para todos os inputs
        document.addEventListener('touchstart', function(e) {
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
                // Garante font-size 16px antes do focus
                if (window.getComputedStyle(target).fontSize.replace('px', '') < 16) {
                    target.style.fontSize = '16px';
                }
            }
        }, { passive: true });

        // Alternativa: previne zoom no viewport temporariamente durante input
        document.addEventListener('focusin', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
                }
            }
        });

        document.addEventListener('focusout', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    // Restaura zoom permitido após sair do campo
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
                }
            }
        });
    }
})();

// =============================================
// TESTIMONIAL CAROUSEL - Seção #examples
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    const testimonials = [
        {
            name: 'João D.',
            photo: 'images/depoimento.jpg',
            photoWebp: 'images/depoimento.webp',
            stars: 5,
            text: 'Dei uma música para minha esposa em nosso aniversário e ela chorou de felicidade. Foi o presente mais significativo que já dei.',
            occasion: 'Presente de Aniversário'
        },
        {
            name: 'Mariana R.',
            photo: 'images/depoimento.jpg',
            photoWebp: 'images/depoimento.webp',
            stars: 5,
            text: 'Eu pedi em casamento com uma música personalizada e foi mágico! As letras capturaram nosso relacionamento perfeitamente e tornaram o momento inesquecível.',
            occasion: 'Pedido de Casamento'
        },
        {
            name: 'Carlos S.',
            photo: 'images/depoimento.jpg',
            photoWebp: 'images/depoimento.webp',
            stars: 5,
            text: 'Presenteei minha mãe no Dia das Mães com uma música só dela. Ela não parou de chorar e disse que foi o melhor presente que já recebeu na vida.',
            occasion: 'Dia das Mães'
        },
        {
            name: 'Fernanda L.',
            photo: 'images/depoimento.jpg',
            photoWebp: 'images/depoimento.webp',
            stars: 5,
            text: 'Fiz uma surpresa para meu namorado com uma música que conta nossa história. Ele ficou emocionado e agora toda vez que ouve, lembra daquele momento.',
            occasion: 'Surpresa Romântica'
        },
        {
            name: 'Roberto M.',
            photo: 'images/depoimento.jpg',
            photoWebp: 'images/depoimento.webp',
            stars: 5,
            text: 'Encomendei uma música para o aniversário de 50 anos do meu pai. Toda a família se emocionou. Valeu cada centavo investido.',
            occasion: 'Aniversário de 50 Anos'
        }
    ];

    let currentIndex = 0;
    let carouselInterval = null;
    const INTERVAL_MS = 6000;

    const card = document.querySelector('#examples .avaliacao-card');
    if (!card) {
        console.warn('[Carrossel] Card não encontrado em #examples .avaliacao-card');
        return;
    }

    const nameEl = card.querySelector('.avaliacao-nome');
    const photoEl = card.querySelector('.avaliacao-foto');
    const starsEl = card.querySelector('.avaliacao-stars');
    const textEl = card.querySelector('.avaliacao-texto');
    const occasionEl = card.querySelector('.avaliacao-ocasiao');

    function renderStars(count) {
        let html = '';
        for (let i = 0; i < 5; i++) {
            html += '<i class="fas fa-star"></i>';
        }
        return html;
    }

    function showTestimonial(index) {
        const t = testimonials[index];
        nameEl.textContent = t.name;
        photoEl.src = t.photo;
        photoEl.alt = t.name;
        starsEl.innerHTML = renderStars(t.stars);
        textEl.textContent = '"' + t.text + '"';
        occasionEl.textContent = t.occasion;
    }

    function fadeToNext() {
        // Fade Out
        card.classList.add('opacity-0');
        card.classList.remove('opacity-100');

        setTimeout(function() {
            // Swap content
            currentIndex = (currentIndex + 1) % testimonials.length;
            showTestimonial(currentIndex);

            // Fade In
            card.classList.remove('opacity-0');
            card.classList.add('opacity-100');
        }, 500);
    }

    function startCarousel() {
        if (carouselInterval) return;
        carouselInterval = setInterval(fadeToNext, INTERVAL_MS);
    }

    function stopCarousel() {
        if (carouselInterval) {
            clearInterval(carouselInterval);
            carouselInterval = null;
        }
    }

    // Pausa ao passar o mouse
    card.addEventListener('mouseenter', stopCarousel);
    card.addEventListener('mouseleave', startCarousel);

    // Pausa ao tocar (mobile)
    card.addEventListener('touchstart', stopCarousel, { passive: true });
    card.addEventListener('touchend', function() {
        setTimeout(startCarousel, 1000);
    }, { passive: true });

    // Inicia o carrossel
    startCarousel();
    console.log('✅ Carrossel de Depoimentos Ativado');
});