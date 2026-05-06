/**
 * Typewriter Effect - Canto com Amor
 * Animação de texto digitando no Hero
 */

const textElement = document.getElementById('typewriter');
const phrases = ["Sua história!", "Seus sentimentos!", "Sua jornada!", "Seus momentos!", "Seu amor!"];
let phraseIndex = 0, charIndex = phrases[0].length, isDeleting = true, typeSpeed = 100;

function type() {
    const currentPhrase = phrases[phraseIndex];
    if (isDeleting) { 
        textElement.textContent = currentPhrase.substring(0, charIndex--); 
        typeSpeed = 50; 
    }
    else { 
        textElement.textContent = currentPhrase.substring(0, charIndex++); 
        typeSpeed = 100; 
    }
    if (!isDeleting && charIndex > currentPhrase.length) { 
        isDeleting = true; 
        typeSpeed = 2000; 
    }
    else if (isDeleting && charIndex < 0) { 
        isDeleting = false; 
        phraseIndex = (phraseIndex + 1) % phrases.length; 
        typeSpeed = 500; 
    }
    setTimeout(type, typeSpeed);
}

document.addEventListener('DOMContentLoaded', () => setTimeout(type, 1000));
