// The Intelligent Investor · Reading Notes
// Minimal vanilla JS for subtle enhancements

(function () {
    'use strict';

    // Smooth in-page anchor scrolling handled by CSS (scroll-behavior: smooth)

    // Reveal sections on scroll
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        },
        {
            threshold: 0.08,
            rootMargin: '0px 0px -50px 0px',
        }
    );

    // Apply to all major content blocks (skip hero so it animates immediately)
    const targets = document.querySelectorAll(
        '.section, .author-card, .principle-card, .concept-block, .criterion, .quote-item, .lessons-list li, .action-card'
    );

    targets.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.7s ease-out, transform 0.7s ease-out';
        observer.observe(el);
    });

    // Console signature
    console.log(
        '%cThe Intelligent Investor · Reading Notes',
        'color: #C9A961; font-family: serif; font-size: 16px; font-style: italic;'
    );
    console.log(
        '%c— Summary built with care —',
        'color: #8B8470; font-size: 11px; letter-spacing: 2px;'
    );
})();