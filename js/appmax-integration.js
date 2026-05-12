/**
 * Appmax Integration - Canto com Amor
 * Integração completa com checkout transparente Appmax
 * Funções: PIX, Cartão de Crédito, Boleto
 */

// ========================================
// INTEGRAÇÃO APPMAX - CHECKOUT TRANSPARENTE
// ========================================

// ========== HELPER: Capturar cookies do Facebook ==========
function getFbCookies() {
    const getCookie = (name) => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    };

    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get('fbclid');

    let fbc = getCookie('_fbc');
    if (!fbc && fbclid) {
        fbc = `fb.1.${Date.now()}.${fbclid}`;
    }

    return {
        fbc: fbc || '',
        fbp: getCookie('_fbp') || '',
        userAgent: navigator.userAgent || '',
        sourceUrl: window.location.href
    };
}

window.selectedPaymentMethod = 'pix';
window.PIX_DISCOUNT_PERCENT = 5; // Desconto de 5% no PIX

// ========================================
// FUNÇÃO PARA ATUALIZAR PREÇOS COM DESCONTO PIX
// ========================================
function updatePricesWithPixDiscount() {
    const isPix = window.selectedPaymentMethod === 'pix';
    const prioritaryChecked = document.getElementById('prioritaryDelivery')?.checked || false;
    const basePrice = window.currentBasePrice || 97;
    const prioritaryFee = prioritaryChecked ? 19.90 : 0;
    const subtotal = basePrice + prioritaryFee;

    // Calcula desconto PIX
    const pixDiscount = isPix ? (subtotal * window.PIX_DISCOUNT_PERCENT / 100) : 0;
    const totalFinal = subtotal - pixDiscount;

    // Salva para uso no modal PIX e no pagamento
    window.currentTotalWithDiscount = totalFinal;

    // Atualiza displays de preço
    const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

    // Atualiza total principal
    document.querySelectorAll('.total_price').forEach(el => {
        el.textContent = fmt(totalFinal);
    });

    // Atualiza preço da música
    document.querySelectorAll('.music_price').forEach(el => {
        el.textContent = fmt(basePrice);
    });

    // Gerencia linha de desconto PIX no resumo
    const orderSummary = document.querySelector('#step3Content .bg-white.border');
    let pixDiscountRow = document.getElementById('pixDiscountRow');

    if (isPix && pixDiscount > 0) {
        // Cria ou atualiza linha de desconto
        if (!pixDiscountRow && orderSummary) {
            const totalRow = orderSummary.querySelector('.flex.justify-between.py-2.mt-1');
            if (totalRow) {
                pixDiscountRow = document.createElement('div');
                pixDiscountRow.id = 'pixDiscountRow';
                pixDiscountRow.className = 'flex justify-between py-1.5 border-b border-gray-100 text-green-600';
                pixDiscountRow.innerHTML = `
                    <span><i class="fas fa-tag mr-1"></i>Desconto PIX (${window.PIX_DISCOUNT_PERCENT}%)</span>
                    <span class="font-medium" id="pixDiscountValue">- ${fmt(pixDiscount)}</span>
                `;
                totalRow.parentNode.insertBefore(pixDiscountRow, totalRow);
            }
        } else if (pixDiscountRow) {
            document.getElementById('pixDiscountValue').textContent = `- ${fmt(pixDiscount)}`;
        }
    } else {
        // Remove linha de desconto se não for PIX
        if (pixDiscountRow) {
            pixDiscountRow.remove();
        }
    }

    // Atualiza valor no modal PIX
    const pixValueDisplay = document.getElementById('pixValue');
    if (pixValueDisplay && isPix) {
        pixValueDisplay.textContent = fmt(totalFinal);
    }

    console.log(`[PIX DISCOUNT] Método: ${window.selectedPaymentMethod}, Subtotal: ${subtotal}, Desconto: ${pixDiscount}, Total: ${totalFinal}`);
}

// Expõe globalmente
window.updatePricesWithPixDiscount = updatePricesWithPixDiscount;

let pixCheckInterval = null;
let pixTimerInterval = null;
let currentOrderId = null;
let cardCheckInterval = null;


const INSTALLMENT_RATES = {
    1: 0,       // 0%
    2: 4.98,    // 4,98%
    3: 7.47,    // 7,47%
    4: 9.96,    // 9,96%
    5: 12.45,   // 12,45%
    6: 14.94,   // 14,94%
    7: 17.43,   // 17,43%
    8: 19.92,   // 19,92%
    9: 22.41,   // 22,41%
    10: 24.90,  // 24,90%
    11: 27.39,  // 27,39%
    12: 29.88   // 29,88%
};

// Configuração de parcelas disponíveis
const INSTALLMENT_CONFIG = {
    availableInstallments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
};

/**
 * Calcula o valor da parcela com taxa fixa
 */
function calculateInstallmentValue(total, installments) {
    const rate = INSTALLMENT_RATES[installments] || 0;
    const totalWithInterest = total * (1 + rate / 100);
    const installmentValue = totalWithInterest / installments;

    return {
        installmentValue,
        totalWithInterest,
        hasInterest: rate > 0
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // Checkbox usar mensagem como letra
    const chk = document.getElementById('useMessageAsLyric');
    const btn = document.getElementById('nextStepBtn');
    const sync = () => btn.textContent = chk.checked ? 'Continuar para Pagamento' : 'Gerar Letra da Música';
    chk.addEventListener('change', sync);
    sync();

    // Máscara de CPF
    // Máscara de CPF
    const cpfInput = document.getElementById('customerCpf');
    if (cpfInput) {
        let cpfAddPaymentInfoFired = false; // Flag para disparar apenas uma vez

        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            if (value.length > 9) {
                value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
            } else if (value.length > 6) {
                value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
            } else if (value.length > 3) {
                value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
            }
            e.target.value = value;

            // ✅ Dispara AddPaymentInfo apenas uma vez quando começar a preencher CPF
            if (!cpfAddPaymentInfoFired && value.length >= 1) {
                cpfAddPaymentInfoFired = true;

                if (typeof fbq !== 'undefined') {
                    const prioritary = document.getElementById('prioritaryDelivery')?.checked || false;
                    const totalValue = (window.currentBasePrice || 97) + (prioritary ? 19.90 : 0);

                    fbq('track', 'AddPaymentInfo', {
                        content_name: 'Checkout Música Personalizada',
                        content_category: 'music_purchase',
                        value: totalValue,
                        currency: 'BRL',
                        payment_method: window.selectedPaymentMethod || 'pix'
                    });

                    console.log('✅ AddPaymentInfo disparado (CPF)');
                }
            }
        });
    }

    // Seletor de método de pagamento
    const methodBtns = document.querySelectorAll('.payment-method-btn');
    const cpfFormSection = document.getElementById('cpfFormSection');
    const cardFormSection = document.getElementById('cardFormSection');
    const selectedMethodInput = document.getElementById('selectedPaymentMethod');



    /**
     * Atualiza as opções do select de parcelas
     */
    function updateInstallmentOptions() {
        const select = document.getElementById('installments');
        const infoEl = document.getElementById('installmentInfo');
        if (!select) return;

        // Calcula o total atual (base + prioritária se marcada)
        const prioritaryChecked = document.getElementById('prioritaryDelivery')?.checked || false;
        const total = (window.currentBasePrice || 97) + (prioritaryChecked ? 19.90 : 0);

        // Limpa opções atuais
        select.innerHTML = '';

        // Gera novas opções
        // Gera novas opções
        INSTALLMENT_CONFIG.availableInstallments.forEach(n => {
            const calc = calculateInstallmentValue(total, n);
            const option = document.createElement('option');
            option.value = n;

            const valorFormatado = calc.installmentValue.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

            option.textContent = `${n}x R$${Math.round(calc.installmentValue)}`;

            select.appendChild(option);
        });

        // Atualiza info abaixo do select
        updateInstallmentInfo();
    }


    /**
     * Atualiza a informação detalhada da parcela selecionada
     */
    function updateInstallmentInfo() {
        const select = document.getElementById('installments');
        const infoEl = document.getElementById('installmentInfo');
        if (!select || !infoEl) return;

        const installments = parseInt(select.value) || 1;
        const prioritaryChecked = document.getElementById('prioritaryDelivery')?.checked || false;
        const total = (window.currentBasePrice || 97) + (prioritaryChecked ? 19.90 : 0);

        const calc = calculateInstallmentValue(total, installments);

        if (calc.hasInterest) {
            const totalFormatado = calc.totalWithInterest.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
           // infoEl.innerHTML = `<span class="text-green-600">Total a prazo: ${totalFormatado}</span>`;
        } else {
         //   infoEl.innerHTML = `<span class="text-green-600">✓ Sem juros</span>`;
        }
    }

// Event listeners para atualizar parcelas
    document.getElementById('installments')?.addEventListener('change', updateInstallmentInfo);
    document.getElementById('prioritaryDelivery')?.addEventListener('change', () => {
        updateInstallmentOptions();
        updatePricesWithPixDiscount();
    });

    methodBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            methodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const method = this.dataset.method;
            window.selectedPaymentMethod = method;
            selectedMethodInput.value = method;

            // ✅ CPF sempre visível
            cpfFormSection.classList.add('show');

            // Mostrar formulário de cartão apenas para credit_card
            if (method === 'credit_card') {
                cardFormSection.classList.add('show');
                updateInstallmentOptions();
            } else {
                cardFormSection.classList.remove('show');
            }

            // ✅ Atualiza preços com desconto PIX
            if (typeof updatePricesWithPixDiscount === 'function') {
                updatePricesWithPixDiscount();
            }
        });
    });

    // ✅ Inicializa preços com desconto PIX ao carregar
    setTimeout(() => {
        if (typeof updatePricesWithPixDiscount === 'function') {
            updatePricesWithPixDiscount();
        }
    }, 200);

// Event listeners para Spotify subscription
// Event listeners para Spotify subscription


// Inicializa as parcelas ao carregar a página
    setTimeout(updateInstallmentOptions, 100);

    // Máscaras para campos de cartão
    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardCvv = document.getElementById('cardCvv');

    if (cardNumber) {
        cardNumber.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 16) value = value.slice(0, 16);
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            e.target.value = value;
        });
    }

    if (cardExpiry) {
        cardExpiry.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 4) value = value.slice(0, 4);
            if (value.length > 2) {
                value = value.replace(/(\d{2})(\d{1,2})/, '$1/$2');
            }
            e.target.value = value;
        });
    }

    if (cardCvv) {
        cardCvv.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 4) value = value.slice(0, 4);
            e.target.value = value;
        });
    }

    // Botão copiar PIX
    const copyPixBtn = document.getElementById('copyPixBtn');
    if (copyPixBtn) {
        copyPixBtn.addEventListener('click', async function() {
            const pixCode = document.getElementById('pixCopyPaste').value;
            try {
                await navigator.clipboard.writeText(pixCode);
                this.innerHTML = '<i class="fas fa-check"></i><span>Copiado!</span>';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-copy"></i><span>Copiar</span>';
                }, 2000);
            } catch (err) {
                const input = document.getElementById('pixCopyPaste');
                input.select();
                document.execCommand('copy');
                this.innerHTML = '<i class="fas fa-check"></i><span>Copiado!</span>';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-copy"></i><span>Copiar</span>';
                }, 2000);
            }
        });
    }

    // Fechar modal PIX
    const closePixModal = document.getElementById('closePixModal');
    if (closePixModal) {
        closePixModal.addEventListener('click', function() {
            const modal = document.getElementById('pixModal');
            modal.classList.add('hidden');
            modal.style.display = 'none';
            document.body.style.overflow = '';
            clearInterval(pixCheckInterval);
            clearInterval(pixTimerInterval);
        });
    }

// Fechar modal Boleto
    const closeBoletoModal = document.getElementById('closeBoletoModal');
    if (closeBoletoModal) {
        closeBoletoModal.addEventListener('click', function() {
            const modal = document.getElementById('boletoModal');
            modal.classList.add('hidden');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }

// Botão copiar Boleto
    const copyBoletoBtn = document.getElementById('copyBoletoBtn');
    if (copyBoletoBtn) {
        copyBoletoBtn.addEventListener('click', async function() {
            const boletoCode = document.getElementById('boletoBarcode').value;
            try {
                await navigator.clipboard.writeText(boletoCode);
                this.innerHTML = '<i class="fas fa-check"></i><span>Copiado!</span>';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-copy"></i><span>Copiar Código de Barras</span>';
                }, 2000);
            } catch (err) {
                const input = document.getElementById('boletoBarcode');
                input.select();
                document.execCommand('copy');
                this.innerHTML = '<i class="fas fa-check"></i><span>Copiado!</span>';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-copy"></i><span>Copiar Código de Barras</span>';
                }, 2000);
            }
        });
    }
});

// Validação de CPF
function validarCPF(cpf) {
    cpf = String(cpf || '').replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;

    return true;
}

window.validarCPF = validarCPF;

async function pagarAppmax() {
    const loading = document.getElementById('globalLoading');

    try {
        const cpfInput = document.getElementById('customerCpf');
        const cpfError = document.getElementById('customerCpfError');

        if (!validarCPF(cpfInput.value)) {
            cpfInput.classList.add('error-border');
            cpfError.classList.remove('hidden');
            cpfInput.focus();
            return;
        } else {
            cpfInput.classList.remove('error-border');
            cpfError.classList.add('hidden');
        }

        loading.classList.remove('hidden');

        // AppMax para todos os métodos (PIX, Cartão, Boleto)


// Coletar dados do formulário
        const fbData = getFbCookies();

        const formData = {
            customerName: document.getElementById('customerName').value,
            customerEmail: document.getElementById('customerEmail').value,
            customerPhone: document.getElementById('customerPhone').value,
            customerCpf: (document.getElementById('customerCpf')?.value || '').replace(/\D/g, ''),
            recipient: document.getElementById('recipient').value,
            relationship: document.getElementById('relationship').value,
            occasion: document.getElementById('occasion').value,
            genre: document.getElementById('genre').value,
            vocalGender: document.querySelector('input[name="vocalGender"]:checked').value,
            message: document.getElementById('message').value,
            finalLyric: document.getElementById('finalLyric')?.value || document.getElementById('generatedLyrics')?.value || '',
            lyricFeedback: document.getElementById('lyricFeedback')?.value || '',
            prioritaryDelivery: document.getElementById('prioritaryDelivery')?.checked || false,
            priceRef: document.getElementById('priceRef')?.value || 'p1',
            paymentMethod: window.selectedPaymentMethod,
            // ===== CAMPOS PARA FACEBOOK CAPI =====
            fbc: fbData.fbc,
            fbp: fbData.fbp,
            userAgent: fbData.userAgent,
            sourceUrl: fbData.sourceUrl
        };

// Se for cartão, adicionar dados do cartão
        if (window.selectedPaymentMethod === 'credit_card') {
            formData.cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
            formData.cardHolder = document.getElementById('cardHolder').value;
            formData.cardExpiry = document.getElementById('cardExpiry').value;
            formData.cardCvv = document.getElementById('cardCvv').value;
            formData.installments = document.getElementById('installments').value;

            // Calcula o total com juros se aplicável
            const installments = parseInt(formData.installments) || 1;
            const baseTotal = (window.currentBasePrice || 97) + (formData.prioritaryDelivery ? 19.90 : 0);
            const calc = calculateInstallmentValue(baseTotal, installments);

            // Envia o total final (com ou sem juros)
            formData.totalWithInterest = calc.totalWithInterest;
            formData.installmentValue = calc.installmentValue;

            if (!formData.cardNumber || formData.cardNumber.length < 13) {
                alert('Por favor, insira um número de cartão válido');
                loading.classList.add('hidden');
                return;
            }

            if (!formData.cardHolder) {
                alert('Por favor, insira o nome no cartão');
                loading.classList.add('hidden');
                return;
            }
            if (!formData.cardExpiry || formData.cardExpiry.length < 5) {
                alert('Por favor, insira a validade do cartão');
                loading.classList.add('hidden');
                return;
            }
            if (!formData.cardCvv || formData.cardCvv.length < 3) {
                alert('Por favor, insira o CVV do cartão');
                loading.classList.add('hidden');
                return;
            }
        }

        // Capturar UTMs (4 camadas: UTMify API → sessionStorage → URL → vazio)
        function getUtmParams() {
            // 1. UTMify API
            if (window.Utmify && typeof window.Utmify.getParams === 'function') {
                const p = window.Utmify.getParams();
                if (p && (p.utm_source || p.src)) return p;
            }
            // 2. sessionStorage
            try {
                const stored = sessionStorage.getItem('utm_data');
                if (stored) {
                    const p = JSON.parse(stored);
                    if (p && (p.utm_source || p.src)) return p;
                }
            } catch (_) {}
            // 3. URL params
            const params = new URLSearchParams(window.location.search);
            return {
                utm_source: params.get('utm_source'),
                utm_medium: params.get('utm_medium'),
                utm_campaign: params.get('utm_campaign'),
                utm_content: params.get('utm_content'),
                utm_term: params.get('utm_term'),
                src: params.get('src'),
                sck: params.get('sck')
            };
        }
        const utms = getUtmParams();
        formData.utm_source = (utms.utm_source || '').substring(0, 450);
        formData.utm_medium = (utms.utm_medium || '').substring(0, 450);
        formData.utm_campaign = (utms.utm_campaign || '').substring(0, 450);
        formData.utm_content = (utms.utm_content || '').substring(0, 450);
        formData.utm_term = (utms.utm_term || '').substring(0, 450);
        formData.src = (utms.src || '').substring(0, 450);
        formData.sck = (utms.sck || '').substring(0, 450);

        // Salvar em sessionStorage para persistência
        try { sessionStorage.setItem('utm_data', JSON.stringify(utms)); } catch (_) {}

        // Obter token reCAPTCHA
        formData.captchaToken = await getCaptchaToken('checkout');

        // Chamar API de pagamento
        const response = await fetch('/api/asaas-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        loading.classList.add('hidden');

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao processar pagamento');
        }

        // Tratar resposta baseado no método
        if (window.selectedPaymentMethod === 'pix') {
            mostrarModalPix(result);
        } else if (window.selectedPaymentMethod === 'boleto') {
            mostrarBoleto(result);
        } else if (window.selectedPaymentMethod === 'credit_card') {
            tratarRespostaCartao(result);
        }

    } catch (error) {
        loading.classList.add('hidden');
        console.error('Erro no pagamento:', error);
        alert('Erro ao processar pagamento: ' + error.message);
    }
}


function mostrarModalPix(data) {
    const modal = document.getElementById('pixModal');
    const qrContainer = document.getElementById('pixQrCodeContainer');
    const copyPasteInput = document.getElementById('pixCopyPaste');
    const valueDisplay = document.getElementById('pixValue');
    const statusContainer = document.getElementById('pixStatusContainer');

    console.log('=== DADOS PIX RECEBIDOS ===', data);

    // Prioridade: base64 > URL gerada > fallback
    if (data.qrCodeBase64) {
        qrContainer.innerHTML = `<img src="data:image/png;base64,${data.qrCodeBase64}" alt="QR Code PIX" class="w-40 h-40">`;
    } else if (data.qrCodeUrl) {
        qrContainer.innerHTML = `<img src="${data.qrCodeUrl}" alt="QR Code PIX" class="w-40 h-40" onerror="this.onerror=null;this.src='https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.pixCopyPaste || data.qrCode || '')}'">`;
    } else if (data.pixCopyPaste || data.qrCode) {
        const pixCode = data.pixCopyPaste || data.qrCode;
        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}" alt="QR Code PIX" class="w-40 h-40">`;
    } else {
        qrContainer.innerHTML = `<p class="text-red-500 text-sm">Erro ao gerar QR Code</p>`;
    }

    copyPasteInput.value = data.pixCopyPaste || data.qrCode || '';

    // Usa o total com desconto PIX já calculado, ou o total retornado do backend
    const total = data.total || window.currentTotalWithDiscount || window.currentBasePrice || 97;
    valueDisplay.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

    currentOrderId = data.orderId;

    // ✅ FORÇAR ABERTURA DO MODAL
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Impede scroll do body

    console.log('=== MODAL PIX ABERTO ===');

    iniciarTimerPix(30 * 60);

    statusContainer.classList.remove('hidden');
    iniciarVerificacaoPix(data.orderId);
}

function iniciarTimerPix(segundos) {
    const timerDisplay = document.getElementById('pixTimer');
    let tempoRestante = segundos;

    clearInterval(pixTimerInterval);

    pixTimerInterval = setInterval(() => {
        const minutos = Math.floor(tempoRestante / 60);
        const segs = tempoRestante % 60;
        timerDisplay.textContent = `${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;

        if (tempoRestante <= 0) {
            clearInterval(pixTimerInterval);
            timerDisplay.textContent = 'Expirado';
            timerDisplay.classList.add('text-red-600');
        }

        tempoRestante--;
    }, 1000);
}

function iniciarVerificacaoPix(orderId) {
    clearInterval(pixCheckInterval);

    let tentativas = 0;
    const maxTentativas = 720;

    pixCheckInterval = setInterval(async () => {
        tentativas++;

        if (tentativas > maxTentativas) {
            clearInterval(pixCheckInterval);
            return;
        }

        try {
            const response = await fetch(`/api/webhook-pagamento?orderId=${orderId}`);
            const data = await response.json();

            if (data.status === 'approved' || data.status === 'paid') {
                clearInterval(pixCheckInterval);
                clearInterval(pixTimerInterval);

                document.getElementById('pixModal').classList.add('hidden');
                document.getElementById('pixModal').style.display = 'none';
                document.body.style.overflow = '';

                // Salvar dados no localStorage
                const customerEmail = document.getElementById('customerEmail')?.value || '';
                const recipient = document.getElementById('recipient')?.value || '';
                const occasion = document.getElementById('occasion')?.value || '';
                const message = document.getElementById('message')?.value || '';
                const relationship = document.getElementById('relationship')?.value || '';
                const prioritary = document.getElementById('prioritaryDelivery')?.checked || false;
                const total = data.total || window.currentBasePrice || 97;

                localStorage.setItem('msm_orderId', data.orderId || currentOrderId || '');
                localStorage.setItem('msm_email', customerEmail);
                localStorage.setItem('msm_recipient', recipient);
                localStorage.setItem('msm_occasion', occasion);
                localStorage.setItem('msm_message', message);
                localStorage.setItem('msm_relationship', relationship);
                localStorage.setItem('msm_total', total.toString());
                localStorage.setItem('msm_priority', prioritary.toString());

                // Redirecionar com parâmetros
                const params = new URLSearchParams({
                    orderId: data.orderId || currentOrderId || '',
                    email: customerEmail,
                    recipient: recipient,
                    occasion: occasion,
                    message: message,
                    relationship: relationship,
                    total: total.toFixed ? total.toFixed(2) : total,
                    priority: prioritary.toString()
                });

                window.location.href = `/obrigado_pela_compra/?${params.toString()}`;
            }
        } catch (error) {
            console.error('Erro ao verificar pagamento:', error);
        }
    }, 5000);
}

function mostrarBoleto(data) {
    console.log('=== DADOS BOLETO ===', data);

    const modal = document.getElementById('boletoModal');
    const barcodeInput = document.getElementById('boletoBarcode');
    const valueDisplay = document.getElementById('boletoValue');
    const openLink = document.getElementById('boletoOpenLink');

    // Preencher valor (boleto NÃO tem desconto PIX, usa preço normal do backend)
    const prioritaryChecked = document.getElementById('prioritaryDelivery')?.checked || false;
    const basePrice = window.currentBasePrice || 97;
    const total = data.total || (basePrice + (prioritaryChecked ? 19.90 : 0));
    valueDisplay.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

    // Preencher código de barras
    const barcode = data.barcode || data.digitable_line || '';
    barcodeInput.value = barcode;

    // Configurar link do PDF
    if (data.boletoUrl) {
        openLink.href = data.boletoUrl;
        openLink.classList.remove('hidden');
    } else if (data.boletoPdf) {
        openLink.href = `data:application/pdf;base64,${data.boletoPdf}`;
        openLink.setAttribute('download', 'boleto-cantocomamor.pdf');
        openLink.classList.remove('hidden');
    } else {
        openLink.classList.add('hidden');
    }

    // Abrir modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeBoletoModal() {
    const modal = document.getElementById('boletoModal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function tratarRespostaCartao(data) {
    const customerEmail = document.getElementById('customerEmail')?.value || '';
    const recipient = document.getElementById('recipient')?.value || '';
    const occasion = document.getElementById('occasion')?.value || '';
    const message = document.getElementById('message')?.value || '';
    const relationship = document.getElementById('relationship')?.value || '';
    const prioritary = document.getElementById('prioritaryDelivery')?.checked || false;
    const total = data.total || window.currentBasePrice || 97;

    // ✅ APROVADO → Redireciona para página de obrigado
    if (data.status === 'approved' || data.status === 'paid') {

        // Salvar dados no localStorage para a página de obrigado
        localStorage.setItem('msm_orderId', data.orderId || data.externalReference || '');
        localStorage.setItem('msm_customerId', data.customerId || '');
// ✅ SALVAR HASH PARA UPSELL 1-CLICK
        if (data.upsellHash) {
            localStorage.setItem('msm_upsellHash', data.upsellHash);
            console.log('✅ Upsell Hash salva:', data.upsellHash);
        }
        localStorage.setItem('msm_email', customerEmail);
        localStorage.setItem('msm_recipient', recipient);
        localStorage.setItem('msm_occasion', occasion);
        localStorage.setItem('msm_message', message);
        localStorage.setItem('msm_relationship', relationship);
        localStorage.setItem('msm_total', total.toString());
        localStorage.setItem('msm_priority', prioritary.toString());

        // Hash para upsell (se disponível)
        if (data.orderHash) {
            localStorage.setItem('msm_upsellHash', data.orderHash);
        }

        // Montar URL com parâmetros
        const params = new URLSearchParams({
            orderId: data.orderId || currentOrderId || '',
            customerId: data.customerId || '',
            email: customerEmail,
            recipient: recipient,
            occasion: occasion,
            message: message,
            relationship: relationship,
            total: total.toFixed(2),
            priority: prioritary.toString()
        });

        if (data.upsellHash) {
            params.set('hash', data.upsellHash);
        }

        // Redirecionar imediatamente
        window.location.href = `/obrigado_pela_compra/?${params.toString()}`;
        return;
    }

    // ✅ EM ANÁLISE → Mostra modal tranquilizador
    if (data.status === 'pending' || data.status === 'in_process' || data.status === 'in_analysis') {
        showPaymentPendingModal(data, customerEmail);
        return;
    }

    // ✅ RECUSADO → Mostra modal com opções
    showPaymentRefusedModal(data);
}

// ========================================
// FUNÇÕES DO MODAL DE RESULTADO
// ========================================

function showPaymentPendingModal(data, email) {
    const modal = document.getElementById('paymentResultModal');
    const pendingState = document.getElementById('resultPending');
    const refusedState = document.getElementById('resultRefused');

    // Esconde estados
    pendingState.classList.add('hidden');
    refusedState.classList.add('hidden');

    // Fecha modal principal
    document.getElementById('modal')?.classList.add('hidden');

    // Preenche dados
    const orderId = data.orderId || data.externalReference || '-';
    document.getElementById('resultPendingOrderId').textContent = orderId;
    document.getElementById('resultPendingEmail').textContent = email || '-';

    // Atualiza link do WhatsApp
    const whatsappLink = document.getElementById('resultPendingWhatsApp');
    if (whatsappLink) {
        whatsappLink.href = window.getWhatsAppSuporte(orderId, email);
    }

    // Mostra estado pendente
    pendingState.classList.remove('hidden');

    // Abre modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Inicia verificação periódica do status do pagamento
    iniciarVerificacaoCartao(orderId, email, data);
}

function showPaymentRefusedModal(data) {
    const modal = document.getElementById('paymentResultModal');
    const pendingState = document.getElementById('resultPending');
    const refusedState = document.getElementById('resultRefused');

    // Esconde estados
    pendingState.classList.add('hidden');
    refusedState.classList.add('hidden');

    // Mensagem de erro
    const message = data.message || data.error || 'A operadora não autorizou esta transação.';
    document.getElementById('resultRefusedMessage').textContent = message;

    // Mostra estado recusado
    refusedState.classList.remove('hidden');

    // Abre modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePaymentResultModal() {
    const modal = document.getElementById('paymentResultModal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
    document.body.style.overflow = '';

    // Para o polling de cartão ao fechar o modal
    if (cardCheckInterval) {
        clearInterval(cardCheckInterval);
        cardCheckInterval = null;
    }
}

// Função para verificar status do pagamento de cartão em análise
function iniciarVerificacaoCartao(orderId, email, originalData) {
    // Limpa intervalo anterior se existir
    if (cardCheckInterval) {
        clearInterval(cardCheckInterval);
    }

    let tentativas = 0;
    const maxTentativas = 120; // 10 minutos (120 * 5s)

    console.log('[CARD CHECK] Iniciando verificação para orderId:', orderId);

    cardCheckInterval = setInterval(async () => {
        tentativas++;

        if (tentativas > maxTentativas) {
            console.log('[CARD CHECK] Limite de tentativas atingido');
            clearInterval(cardCheckInterval);
            cardCheckInterval = null;
            return;
        }

        try {
            console.log(`[CARD CHECK] Verificando... (tentativa ${tentativas})`);

            const response = await fetch(`/api/webhook-pagamento?orderId=${orderId}`);
            const data = await response.json();

            console.log('[CARD CHECK] Resposta:', data);

            if (data.status === 'approved' || data.status === 'paid') {
                console.log('[CARD CHECK] Pagamento aprovado! Redirecionando...');

                clearInterval(cardCheckInterval);
                cardCheckInterval = null;

                // Fecha o modal
                closePaymentResultModal();

                // Prepara dados para a página de obrigado
                const customerEmail = email || document.getElementById('customerEmail')?.value || '';
                const recipient = document.getElementById('recipient')?.value || '';
                const occasion = document.getElementById('occasion')?.value || '';
                const message = document.getElementById('message')?.value || '';
                const relationship = document.getElementById('relationship')?.value || '';
                const prioritary = document.getElementById('prioritaryDelivery')?.checked || false;
                const total = data.total || originalData.total || window.currentBasePrice || 97;

                // Salva no localStorage
                localStorage.setItem('msm_orderId', orderId);
                localStorage.setItem('msm_email', customerEmail);
                localStorage.setItem('msm_recipient', recipient);
                localStorage.setItem('msm_occasion', occasion);
                localStorage.setItem('msm_message', message);
                localStorage.setItem('msm_relationship', relationship);
                localStorage.setItem('msm_total', total.toString());
                localStorage.setItem('msm_priority', prioritary.toString());

                // Monta URL com parâmetros
                const params = new URLSearchParams({
                    orderId: orderId,
                    email: customerEmail,
                    recipient: recipient,
                    occasion: occasion,
                    message: message,
                    relationship: relationship,
                    total: typeof total === 'number' ? total.toFixed(2) : total,
                    priority: prioritary.toString()
                });

                // Redireciona
                window.location.href = `/obrigado_pela_compra/?${params.toString()}`;
            } else if (data.status === 'refused' || data.status === 'rejected' || data.status === 'cancelled') {
                console.log('[CARD CHECK] Pagamento recusado');
                clearInterval(cardCheckInterval);
                cardCheckInterval = null;

                // Mostra modal de recusado
                showPaymentRefusedModal({ message: data.message || 'Pagamento não aprovado pela operadora.' });
            }

        } catch (error) {
            console.error('[CARD CHECK] Erro ao verificar status:', error);
            // Continua tentando mesmo com erro
        }
    }, 5000); // Verifica a cada 5 segundos
}

function switchToPixPayment() {
    closePaymentResultModal();

    // Clica no botão PIX
    const pixBtn = document.querySelector('.payment-method-btn[data-method="pix"]');
    if (pixBtn) {
        pixBtn.click();
    }

    // Reabre modal de checkout
    const checkoutModal = document.getElementById('modal');
    if (checkoutModal?.classList.contains('hidden')) {
        checkoutModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // Scroll para área de pagamento
    document.getElementById('step3Content')?.scrollIntoView({ behavior: 'smooth' });
}

// Fecha modal ao clicar fora
document.addEventListener('DOMContentLoaded', function() {
    const resultModal = document.getElementById('paymentResultModal');
    if (resultModal) {
        resultModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closePaymentResultModal();
            }
        });
    }
});

// ========================================
// FUNÇÕES PARA NOVO LAYOUT DE CHECKOUT
// ========================================



// ========================================
// FUNÇÃO DE VALIDAÇÃO E PAGAMENTO
// ========================================

function validarEPagar() {
    const emailInput = document.getElementById('customerEmail');
    const emailError = document.getElementById('customerEmailError');
    const nameInput = document.getElementById('customerName');
    const nameError = document.getElementById('customerNameError');
    const cpfInput = document.getElementById('customerCpf');
    const cpfError = document.getElementById('customerCpfError');
    const paymentMethod = window.selectedPaymentMethod || 'pix';

    // Limpa erros anteriores
    emailInput.classList.remove('error-border', 'shake-error');
    emailError.classList.add('hidden');
    nameInput.classList.remove('error-border', 'shake-error');
    nameError.classList.add('hidden');
    cpfInput.classList.remove('error-border', 'shake-error');
    cpfError.classList.add('hidden');

    // Validar Email
    if (!emailInput.value || !/\S+@\S+\.\S+/.test(emailInput.value.trim())) {
        emailInput.classList.add('error-border', 'shake-error');
        emailError.classList.remove('hidden');
        emailInput.focus();
        emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => emailInput.classList.remove('shake-error'), 300);
        return;
    }

    // Validar Nome
    if (!nameInput.value || nameInput.value.trim().length < 2) {
        nameInput.classList.add('error-border', 'shake-error');
        nameError.classList.remove('hidden');
        nameInput.focus();
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => nameInput.classList.remove('shake-error'), 300);
        return;
    }

    // Validar CPF
    if (!cpfInput.value || !validarCPF(cpfInput.value)) {
        cpfInput.classList.add('error-border', 'shake-error');
        cpfError.classList.remove('hidden');
        cpfInput.focus();
        cpfInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Remove animação após completar
        setTimeout(() => cpfInput.classList.remove('shake-error'), 300);
        return;
    }

    // Se for cartão, validar campos do cartão
    if (paymentMethod === 'credit_card') {
        const cardNumber = document.getElementById('cardNumber');
        const cardHolder = document.getElementById('cardHolder');
        const cardExpiry = document.getElementById('cardExpiry');
        const cardCvv = document.getElementById('cardCvv');

        // Validar número do cartão
        if (!cardNumber.value || cardNumber.value.replace(/\s/g, '').length < 13) {
            cardNumber.classList.add('error-border', 'shake-error');
            cardNumber.focus();
            cardNumber.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => cardNumber.classList.remove('shake-error'), 300);
            return;
        }
        cardNumber.classList.remove('error-border');

        // Validar nome no cartão
        if (!cardHolder.value.trim()) {
            cardHolder.classList.add('error-border', 'shake-error');
            cardHolder.focus();
            cardHolder.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => cardHolder.classList.remove('shake-error'), 300);
            return;
        }
        cardHolder.classList.remove('error-border');

        // Validar validade
        if (!cardExpiry.value || cardExpiry.value.length < 5) {
            cardExpiry.classList.add('error-border', 'shake-error');
            cardExpiry.focus();
            cardExpiry.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => cardExpiry.classList.remove('shake-error'), 300);
            return;
        }
        cardExpiry.classList.remove('error-border');

        // Validar CVV
        if (!cardCvv.value || cardCvv.value.length < 3) {
            cardCvv.classList.add('error-border', 'shake-error');
            cardCvv.focus();
            cardCvv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => cardCvv.classList.remove('shake-error'), 300);
            return;
        }
        cardCvv.classList.remove('error-border');
    }

    // Tudo validado, processar pagamento
    handlePagamento();
}

// Inicializar método de pagamento padrão como PIX
document.addEventListener('DOMContentLoaded', function() {
    window.selectedPaymentMethod = 'pix';
    const methodInput = document.getElementById('selectedPaymentMethod');
    if (methodInput) {
        methodInput.value = 'pix';
    }
});

window.pagarAppmax = pagarAppmax;
window.validarEPagar = validarEPagar;
