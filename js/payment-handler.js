/**
 * Payment Handler - Canto com Amor
 * 
 * Integração com Asaas (PIX) e Stripe (Cartão de Crédito)
 * Substitui a antiga integração Appmax
 */

// ========================================
// CONFIGURAÇÕES
// ========================================
window.selectedPaymentMethod = 'pix';
window.PIX_DISCOUNT_PERCENT = 5;

// ========================================
// ATUALIZAR PREÇOS COM DESCONTO PIX
// ========================================
function updatePricesWithPixDiscount() {
    const isPix = window.selectedPaymentMethod === 'pix';
    const prioritaryChecked = document.getElementById('prioritaryDelivery')?.checked || false;
    const basePrice = window.currentBasePrice || 5; // TEMP: Fallback para R$ 5,00
    const prioritaryFee = 0; // TEMP: Zerado para teste
    const subtotal = basePrice + prioritaryFee;

    // TEMP: Desconto PIX desativado para teste de R$ 1,00
    const pixDiscount = 0;
    const totalFinal = subtotal - pixDiscount;

    // Salva para uso no pagamento
    window.currentTotalWithDiscount = totalFinal;

    // Formata valores
    const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

    // Atualiza displays de preço
    document.querySelectorAll('.total_price').forEach(el => {
        el.textContent = fmt(totalFinal);
    });

    document.querySelectorAll('.music_price').forEach(el => {
        el.textContent = fmt(basePrice);
    });

    // Gerencia linha de desconto PIX
    const orderSummary = document.querySelector('#step3Content .bg-white.border');
    let pixDiscountRow = document.getElementById('pixDiscountRow');

    if (isPix && pixDiscount > 0) {
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
    } else if (pixDiscountRow) {
        pixDiscountRow.remove();
    }

    // Atualiza valor no modal PIX
    const pixValueDisplay = document.getElementById('pixValue');
    if (pixValueDisplay && isPix) {
        pixValueDisplay.textContent = fmt(totalFinal);
    }
}

// ========================================
// VALIDAR CPF
// ========================================
function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

// ========================================
// VALIDAR E PAGAR
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
    emailError?.classList.add('hidden');
    nameInput.classList.remove('error-border', 'shake-error');
    nameError?.classList.add('hidden');
    cpfInput.classList.remove('error-border', 'shake-error');
    cpfError?.classList.add('hidden');

    // Validar Email
    if (!emailInput.value || !/\S+@\S+\.\S+/.test(emailInput.value.trim())) {
        emailInput.classList.add('error-border', 'shake-error');
        emailError?.classList.remove('hidden');
        emailInput.focus();
        setTimeout(() => emailInput.classList.remove('shake-error'), 300);
        return;
    }

    // Validar Nome
    if (!nameInput.value || nameInput.value.trim().length < 2) {
        nameInput.classList.add('error-border', 'shake-error');
        nameError?.classList.remove('hidden');
        nameInput.focus();
        setTimeout(() => nameInput.classList.remove('shake-error'), 300);
        return;
    }

    // Validar CPF
    if (!cpfInput.value || !validarCPF(cpfInput.value)) {
        cpfInput.classList.add('error-border', 'shake-error');
        cpfError?.classList.remove('hidden');
        cpfInput.focus();
        setTimeout(() => cpfInput.classList.remove('shake-error'), 300);
        return;
    }

    // Se for cartão, validar campos do cartão
    if (paymentMethod === 'credit_card') {
        const cardNumber = document.getElementById('cardNumber');
        const cardHolder = document.getElementById('cardHolder');
        const cardExpiry = document.getElementById('cardExpiry');
        const cardCvv = document.getElementById('cardCvv');

        if (!cardNumber.value || cardNumber.value.replace(/\s/g, '').length < 13) {
            cardNumber.classList.add('error-border', 'shake-error');
            cardNumber.focus();
            setTimeout(() => cardNumber.classList.remove('shake-error'), 300);
            return;
        }

        if (!cardHolder.value.trim()) {
            cardHolder.classList.add('error-border', 'shake-error');
            cardHolder.focus();
            setTimeout(() => cardHolder.classList.remove('shake-error'), 300);
            return;
        }

        if (!cardExpiry.value || cardExpiry.value.length < 5) {
            cardExpiry.classList.add('error-border', 'shake-error');
            cardExpiry.focus();
            setTimeout(() => cardExpiry.classList.remove('shake-error'), 300);
            return;
        }

        if (!cardCvv.value || cardCvv.value.length < 3) {
            cardCvv.classList.add('error-border', 'shake-error');
            cardCvv.focus();
            setTimeout(() => cardCvv.classList.remove('shake-error'), 300);
            return;
        }
    }

    // Tudo validado, processar pagamento
    processarPagamento();
}

// ========================================
// PROCESSAR PAGAMENTO
// ========================================
async function processarPagamento() {
    const loading = document.getElementById('globalLoading');
    const paymentMethod = window.selectedPaymentMethod || 'pix';

    try {
        loading?.classList.remove('hidden');

        // Dispara evento Facebook Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', 'AddPaymentInfo', {
                content_name: 'Checkout Música Personalizada',
                content_category: 'music_purchase',
                value: window.currentTotalWithDiscount || 97,
                currency: 'BRL'
            });
        }

        // Monta payload com nomes corretos para as APIs
        const payload = {
            leadId: window.currentLeadId || null,
            email: document.getElementById('customerEmail').value.trim(),
            nome: document.getElementById('customerName').value.trim(),
            cpf: (document.getElementById('customerCpf')?.value || '').replace(/\D/g, ''),
            telefone: document.getElementById('customerPhone')?.value?.trim() || '',
            destinatario: document.getElementById('recipient')?.value?.trim() || '',
            estilo: document.getElementById('genre')?.value || '',
            preco: window.currentTotalWithDiscount || 97,
            prioritaryDelivery: document.getElementById('prioritaryDelivery')?.checked || false
        };

        if (paymentMethod === 'pix') {
            // ===== PIX via Asaas =====
            await processarPix(payload);
        } else {
            // ===== Cartão via Stripe =====
            await processarCartao(payload);
        }

    } catch (error) {
        console.error('[payment] Erro ao processar pagamento:', error);
        alert('Ocorreu um erro ao processar o pagamento. Tente novamente.');
    } finally {
        loading?.classList.add('hidden');
    }
}

// ========================================
// PROCESSAR PIX (ASAAS)
// ========================================
async function processarPix(payload) {
    const response = await fetch('/api/asaas-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar PIX');
    }

    // Mostra modal PIX
    mostrarModalPix(result);
}

// ========================================
// PROCESSAR CARTÃO (STRIPE)
// ========================================
async function processarCartao(payload) {
    const response = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar checkout');
    }

    // Redireciona para o Stripe Checkout
    if (result.url) {
        window.location.href = result.url;
    } else {
        throw new Error('URL de checkout não recebida');
    }
}

// ========================================
// MOSTRAR MODAL PIX
// ========================================
function mostrarModalPix(data) {
    const modal = document.getElementById('pixModal');
    const qrContainer = document.getElementById('pixQrCodeContainer');
    const copyPasteInput = document.getElementById('pixCopyPaste');
    const pixValue = document.getElementById('pixValue');

    // QR Code
    if (data.qrCode && qrContainer) {
        qrContainer.innerHTML = `<img src="data:image/png;base64,${data.qrCode}" alt="QR Code PIX" class="w-40 h-40">`;
    }

    // Código Copia e Cola
    if (copyPasteInput && data.copyPaste) {
        copyPasteInput.value = data.copyPaste;
    }

    // Valor
    if (pixValue && data.valor) {
        pixValue.textContent = `R$ ${parseFloat(data.valor).toFixed(2).replace('.', ',')}`;
    }

    // Mostra modal
    modal?.classList.remove('hidden');

    // Inicia polling de verificação
    if (data.paymentId) {
        iniciarVerificacaoPagamento(data.paymentId);
    }
}

// ========================================
// INICIAR VERIFICAÇÃO DE PAGAMENTO
// ========================================
function iniciarVerificacaoPagamento(paymentId) {
    const maxAttempts = 60; // 5 minutos (5s cada)
    let attempts = 0;

    const interval = setInterval(async () => {
        attempts++;

        try {
            const response = await fetch(`/api/webhook-pagamento?paymentId=${paymentId}`);
            const data = await response.json();

            if (data.pago) {
                clearInterval(interval);
                window.location.href = '/sucesso.html';
            }
        } catch (err) {
            console.error('[payment] Erro na verificação:', err);
        }

        if (attempts >= maxAttempts) {
            clearInterval(interval);
        }
    }, 5000);
}

// ========================================
// COPIAR CÓDIGO PIX
// ========================================
document.getElementById('copyPixBtn')?.addEventListener('click', function() {
    const input = document.getElementById('pixCopyPaste');
    if (input) {
        input.select();
        document.execCommand('copy');
        
        const btn = this;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    }
});

// ========================================
// FECHAR MODAL PIX
// ========================================
document.getElementById('closePixModal')?.addEventListener('click', function() {
    document.getElementById('pixModal')?.classList.add('hidden');
});

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    window.selectedPaymentMethod = 'pix';
    updatePricesWithPixDiscount();
});

// Exportar funções globais
window.validarEPagar = validarEPagar;
window.processarPagamento = processarPagamento;
window.updatePricesWithPixDiscount = updatePricesWithPixDiscount;
window.validarCPF = validarCPF;
