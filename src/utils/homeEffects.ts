// Client logos auto-scrolling
export const initClientLogosScroll = () => {
    const leftScrollContainer = document.querySelector('.animate-scroll-left');
    const rightScrollContainer = document.querySelector('.animate-scroll-right');
    
    if (leftScrollContainer) {
        const logos = leftScrollContainer.innerHTML;
        leftScrollContainer.innerHTML = logos + logos;
    }
    
    if (rightScrollContainer) {
        const logos = rightScrollContainer.innerHTML;
        rightScrollContainer.innerHTML = logos + logos;
    }
};

// Falling stars background effect
export const initFallingStars = () => {
    const starsContainer = document.getElementById('starsContainer');
    if (!starsContainer) return;

    const starCount = 50;
    const stars: HTMLDivElement[] = [];

    // Create stars
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        starsContainer.appendChild(star);
        stars.push(star);
    }

    // Update star positions based on scroll
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        const scrollDelta = window.scrollY - lastScrollY;
        const scrollDirection = scrollDelta > 0 ? 1 : -1;
        
        stars.forEach(star => {
            const currentY = parseFloat(star.style.top);
            const newY = currentY + (scrollDirection * 0.1);
            star.style.top = `${newY}%`;
            
            // Reset star position if it goes out of bounds
            if (newY > 100) star.style.top = '0%';
            if (newY < 0) star.style.top = '100%';
        });
        
        lastScrollY = window.scrollY;
    });
}; 