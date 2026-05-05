(function() {
    'use strict';

    var DOMAIN_CORRECTIONS = {
        // Gmail
        'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmaill.com': 'gmail.com',
        'gmail.co': 'gmail.com', 'gmail.co.com': 'gmail.com', 'gmail.con': 'gmail.com',
        'gmail.com.br': 'gmail.com', 'gmail.om': 'gmail.com', 'gmail.cm': 'gmail.com',
        'gmail.comm': 'gmail.com', 'gmail.coom': 'gmail.com', 'gamil.com': 'gmail.com',
        'gnail.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gimail.com': 'gmail.com',
        'gemail.com': 'gmail.com', 'gmil.com': 'gmail.com', 'gmaul.com': 'gmail.com',
        'gmaiil.com': 'gmail.com', 'g]mail.com': 'gmail.com',
        // Hotmail
        'hotmal.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmil.com': 'hotmail.com',
        'hotmail.co': 'hotmail.com', 'hotmail.co.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
        'hotmail.comm': 'hotmail.com', 'hotmail.om': 'hotmail.com', 'hotmail.cm': 'hotmail.com',
        'hotamil.com': 'hotmail.com', 'hotmaill.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
        'homail.com': 'hotmail.com', 'hotmeil.com': 'hotmail.com',
        // Outlook
        'outloock.com': 'outlook.com', 'outllook.com': 'outlook.com', 'outlok.com': 'outlook.com',
        'outlook.co': 'outlook.com', 'outlook.co.com': 'outlook.com', 'outlook.con': 'outlook.com',
        'outlook.comm': 'outlook.com', 'outook.com': 'outlook.com',
        // Yahoo
        'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
        'yahoo.co.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahoo.comm': 'yahoo.com',
        'yhaoo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com',
        // iCloud
        'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com', 'icloud.co': 'icloud.com',
        'icloud.con': 'icloud.com', 'icloud.comm': 'icloud.com',
        // UOL
        'uol.com': 'uol.com.br', 'uol.co': 'uol.com.br', 'uol.con.br': 'uol.com.br',
        // Terra
        'tera.com.br': 'terra.com.br', 'terra.con.br': 'terra.com.br',
        // BOL
        'bol.com': 'bol.com.br', 'bol.con.br': 'bol.com.br',
        // Globo
        'globo.com': 'globo.com', 'globomail.com': 'globo.com',
    };

    // Detect double TLDs like .co.com, .com.com, .com.br.com
    var DOUBLE_TLD_REGEX = /\.(com?|net|org)\.(com|com\.br|net|org)$/i;

    function checkEmail(email) {
        if (!email || !email.includes('@')) return null;

        var parts = email.toLowerCase().trim().split('@');
        if (parts.length !== 2) return null;
        var local = parts[0];
        var domain = parts[1];

        // Check known domain corrections
        if (DOMAIN_CORRECTIONS[domain]) {
            return { suggestion: local + '@' + DOMAIN_CORRECTIONS[domain], domain: DOMAIN_CORRECTIONS[domain] };
        }

        // Check double TLDs
        if (DOUBLE_TLD_REGEX.test(domain)) {
            var fixed = domain.replace(DOUBLE_TLD_REGEX, function(match, first) {
                if (domain.includes('.com.br')) return '.com.br';
                return '.' + first;
            });
            if (fixed !== domain) {
                return { suggestion: local + '@' + fixed, domain: fixed };
            }
        }

        // Check .con → .com
        if (domain.endsWith('.con')) {
            var fixedDomain = domain.replace(/\.con$/, '.com');
            return { suggestion: local + '@' + fixedDomain, domain: fixedDomain };
        }

        // Check .comm → .com
        if (domain.endsWith('.comm')) {
            var fixedDomain2 = domain.replace(/\.comm$/, '.com');
            return { suggestion: local + '@' + fixedDomain2, domain: fixedDomain2 };
        }

        return null;
    }

    function init() {
        var emailInput = document.getElementById('customerEmail');
        var suggestionDiv = document.getElementById('emailSuggestion');
        var suggestionText = document.getElementById('emailSuggestionText');
        var suggestionBtn = document.getElementById('emailSuggestionBtn');

        if (!emailInput || !suggestionDiv) return;

        var currentSuggestion = null;

        function validate() {
            var result = checkEmail(emailInput.value);
            if (result) {
                currentSuggestion = result.suggestion;
                suggestionText.textContent = 'Você quis dizer ' + result.suggestion + '?';
                suggestionDiv.classList.remove('hidden');
            } else {
                currentSuggestion = null;
                suggestionDiv.classList.add('hidden');
            }
        }

        emailInput.addEventListener('blur', validate);
        emailInput.addEventListener('input', function() {
            // Hide suggestion while typing
            suggestionDiv.classList.add('hidden');
        });

        if (suggestionBtn) {
            suggestionBtn.addEventListener('click', function() {
                if (currentSuggestion) {
                    emailInput.value = currentSuggestion;
                    suggestionDiv.classList.add('hidden');
                    currentSuggestion = null;
                    emailInput.focus();
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
