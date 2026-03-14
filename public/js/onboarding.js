/** =============================
 *  Onboarding Guide
 *  ============================= */
function initOnboarding() {
    if (localStorage.getItem('onboardingCompleted') === 'true') return;
    const guide = $('onboarding-guide');
    const titleEl = $('onboarding-title');
    const contentEl = $('onboarding-content');
    const dotsEl = $('onboarding-dots');
    const prevBtn = $('onboarding-prev');
    const nextBtn = $('onboarding-next');
    const closeBtn = $('close-onboarding');
    let currentStep = 0, highlightedElement = null;
    const steps = [
        { titleKey: 'ONBOARDING.TITLE_STEP_1', contentKey: 'ONBOARDING.CONTENT_STEP_1', highlightTarget: null },
        { titleKey: 'ONBOARDING.TITLE_STEP_2', contentKey: 'ONBOARDING.CONTENT_STEP_2', highlightTarget: 'config-section' },
        { titleKey: 'ONBOARDING.TITLE_STEP_3', contentKey: 'ONBOARDING.CONTENT_STEP_3', highlightTarget: 'events-section' },
        { titleKey: 'ONBOARDING.TITLE_STEP_4', contentKey: 'ONBOARDING.CONTENT_STEP_4', highlightTarget: null }
    ];
    function renderStep(stepIndex) {
        const step = steps[stepIndex];
        titleEl.innerHTML = getText(step.titleKey);
        contentEl.innerHTML = getText(step.contentKey);
        dotsEl.innerHTML = '';
        for (let i = 0; i < steps.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'onboarding-dot';
            if (i === stepIndex) dot.classList.add('active');
            dotsEl.appendChild(dot);
        }
        prevBtn.style.visibility = (stepIndex === 0) ? 'hidden' : 'visible';
        nextBtn.innerHTML = (stepIndex === steps.length - 1) ? getText('ONBOARDING.DONE_BUTTON') : getText('ONBOARDING.NEXT_BUTTON');
        if (highlightedElement) highlightedElement.classList.remove('onboarding-highlight');
        if (step.highlightTarget) {
            highlightedElement = $(step.highlightTarget);
            if (highlightedElement) highlightedElement.classList.add('onboarding-highlight');
        }
    }
    function completeOnboarding() {
        guide.classList.add('hidden');
        if (highlightedElement) highlightedElement.classList.remove('onboarding-highlight');
        localStorage.setItem('onboardingCompleted', 'true');
    }
    nextBtn.addEventListener('click', () => { (currentStep < steps.length - 1) ? renderStep(++currentStep) : completeOnboarding(); });
    prevBtn.addEventListener('click', () => { if (currentStep > 0) renderStep(--currentStep); });
    closeBtn.addEventListener('click', completeOnboarding);
    guide.classList.remove('hidden');
    renderStep(0);
}
