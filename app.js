/**
 * Question Practice App - Main Application
 */

class QuestionApp {
    constructor() {
        this.questions = [];
        this.metadata = null;
        this.currentIndex = 0;
        this.userAnswers = new Map(); // questionId -> {answer: string, isCorrect: boolean}
        this.hasSubmittedCurrent = false;
        this.selectedOption = null; // For multiple choice questions
        this.notificationTimeout = null; // For auto-hiding notifications

        this.initializeElements();
        this.attachEventListeners();
        this.autoLoadQuestions();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        // Notification
        this.notification = document.getElementById('notification');
        this.notificationMessage = document.getElementById('notification-message');
        this.notificationClose = document.getElementById('notification-close');

        // Upload section
        this.fileInput = document.getElementById('json-file-input');
        this.uploadSection = document.getElementById('upload-section');
        this.metadataDisplay = document.getElementById('metadata-display');
        this.startBtn = document.getElementById('start-btn');

        // Question section
        this.questionSection = document.getElementById('question-section');
        this.progressIndicator = document.getElementById('progress-indicator');
        this.questionMetadata = document.getElementById('question-metadata');
        this.questionDisplay = document.getElementById('question-display');
        this.answerArea = document.getElementById('answer-area');
        this.answerInput = document.getElementById('answer-input');
        this.submitBtn = document.getElementById('submit-btn');
        this.feedbackArea = document.getElementById('feedback-area');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');

        // On-screen keyboard
        this.keyboard = document.getElementById('on-screen-keyboard');
        this.keyboardDisplay = document.getElementById('keyboard-display-value');

        // Results section
        this.resultsSection = document.getElementById('results-section');
        this.resultsDisplay = document.getElementById('results-display');
        this.restartBtn = document.getElementById('restart-btn');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.notificationClose.addEventListener('click', () => this.hideNotification());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.startBtn.addEventListener('click', () => this.startQuestions());
        this.submitBtn.addEventListener('click', () => this.submitAnswer());
        this.prevBtn.addEventListener('click', () => this.previousQuestion());
        this.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.restartBtn.addEventListener('click', () => this.restart());

        // Enter key to submit answer
        this.answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.hasSubmittedCurrent) {
                this.submitAnswer();
            }
        });

        // On-screen keyboard event listeners
        this.attachKeyboardListeners();
    }

    /**
     * Attach keyboard button listeners
     */
    attachKeyboardListeners() {
        const keyboardButtons = document.querySelectorAll('.keyboard-btn');
        keyboardButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.hasSubmittedCurrent) return; // Disable keyboard after submission

                const value = btn.getAttribute('data-value');
                const action = btn.getAttribute('data-action');

                if (value) {
                    this.handleKeyboardInput(value);
                } else if (action) {
                    this.handleKeyboardAction(action);
                }
            });
        });
    }

    /**
     * Handle keyboard number/decimal input
     */
    handleKeyboardInput(value) {
        const currentValue = this.keyboardDisplay.textContent;

        // If current value is "0", replace it
        if (currentValue === '0' && value !== '.') {
            this.keyboardDisplay.textContent = value;
        }
        // Don't allow multiple decimal points
        else if (value === '.' && currentValue.includes('.')) {
            return;
        }
        // Append the value
        else {
            this.keyboardDisplay.textContent = currentValue + value;
        }

        // Update the answer input
        this.answerInput.value = this.keyboardDisplay.textContent;
    }

    /**
     * Handle keyboard actions (clear, backspace, negative)
     */
    handleKeyboardAction(action) {
        const currentValue = this.keyboardDisplay.textContent;

        switch (action) {
            case 'clear':
                this.keyboardDisplay.textContent = '0';
                this.answerInput.value = '';
                break;

            case 'backspace':
                if (currentValue.length > 1) {
                    this.keyboardDisplay.textContent = currentValue.slice(0, -1);
                } else {
                    this.keyboardDisplay.textContent = '0';
                }
                this.answerInput.value = this.keyboardDisplay.textContent === '0' ? '' : this.keyboardDisplay.textContent;
                break;

            case 'negative':
                if (currentValue === '0') return;
                if (currentValue.startsWith('-')) {
                    this.keyboardDisplay.textContent = currentValue.substring(1);
                } else {
                    this.keyboardDisplay.textContent = '-' + currentValue;
                }
                this.answerInput.value = this.keyboardDisplay.textContent;
                break;
        }
    }

    /**
     * Show or hide on-screen keyboard
     */
    toggleKeyboard(show) {
        if (show) {
            this.keyboard.classList.remove('hidden');
            this.keyboardDisplay.textContent = this.answerInput.value || '0';
        } else {
            this.keyboard.classList.add('hidden');
        }
    }

    /**
     * Show notification
     * @param {string} message - The message to display
     * @param {string} type - Type of notification: 'error', 'warning', 'success', 'info'
     * @param {number} duration - Duration in ms (0 = no auto-hide)
     */
    showNotification(message, type = 'info', duration = 4000) {
        // Clear any existing timeout
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }

        // Set message
        this.notificationMessage.textContent = message;

        // Remove all type classes
        this.notification.classList.remove('error', 'warning', 'success', 'info');

        // Add the appropriate type class
        this.notification.classList.add(type);

        // Show the notification
        this.notification.classList.remove('hidden');
        setTimeout(() => {
            this.notification.classList.add('show');
        }, 10);

        // Auto-hide after duration
        if (duration > 0) {
            this.notificationTimeout = setTimeout(() => {
                this.hideNotification();
            }, duration);
        }
    }

    /**
     * Hide notification
     */
    hideNotification() {
        this.notification.classList.remove('show');
        setTimeout(() => {
            this.notification.classList.add('hidden');
        }, 300); // Match CSS transition duration
    }

    /**
     * Automatically load questions from questions/questions.json
     */
    async autoLoadQuestions() {
        try {
            this.showLoading(true);

            const response = await fetch('questions/questions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Validate structure
            if (!data.metadata || !data.questions || !Array.isArray(data.questions)) {
                throw new Error('Invalid JSON structure');
            }

            this.metadata = data.metadata;
            this.questions = data.questions;

            this.showLoading(false);
            this.displayMetadata();
            this.startBtn.classList.remove('hidden');

            console.log(`Loaded ${this.questions.length} questions successfully`);

        } catch (error) {
            this.showLoading(false);
            console.warn('Could not auto-load questions:', error.message);
            this.showUploadPrompt();
        }
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        const uploadLabel = document.querySelector('.upload-label span');
        if (show) {
            uploadLabel.textContent = '⏳ Loading questions...';
        } else {
            uploadLabel.textContent = '📁 Upload Question JSON File';
        }
    }

    /**
     * Show upload prompt when auto-load fails
     */
    showUploadPrompt() {
        const uploadLabel = document.querySelector('.upload-label span');
        uploadLabel.textContent = '📁 Upload Question JSON File';
        this.metadataDisplay.innerHTML = '<p style="color: #666;">Could not find questions/questions.json. Please upload a file manually.</p>';
        this.metadataDisplay.classList.remove('hidden');
    }

    /**
     * Handle JSON file upload
     */
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate structure
            if (!data.metadata || !data.questions || !Array.isArray(data.questions)) {
                throw new Error('Invalid JSON structure');
            }

            this.metadata = data.metadata;
            this.questions = data.questions;

            this.displayMetadata();
            this.startBtn.classList.remove('hidden');

        } catch (error) {
            this.showNotification('Error loading JSON file: ' + error.message, 'error', 5000);
            console.error('JSON parse error:', error);
        }
    }

    /**
     * Display metadata after file upload
     */
    displayMetadata() {
        const exportDate = new Date(this.metadata.exportDate).toLocaleDateString();
        this.metadataDisplay.innerHTML = `
            <p><strong>Export Date:</strong> ${exportDate}</p>
            <p><strong>Questions:</strong> ${this.metadata.questionCount}</p>
            <p><strong>Modules:</strong> ${this.metadata.moduleCount}</p>
        `;
        this.metadataDisplay.classList.remove('hidden');
    }

    /**
     * Start the question sequence
     */
    startQuestions() {
        this.uploadSection.classList.add('hidden');
        this.questionSection.classList.remove('hidden');
        this.currentIndex = 0;
        this.userAnswers.clear();
        this.displayQuestion();
    }

    /**
     * Display the current question
     */
    displayQuestion() {
        const question = this.questions[this.currentIndex];
        if (!question) return;

        // Reset selected option
        this.selectedOption = null;

        // Update progress
        this.progressIndicator.textContent = `Question ${this.currentIndex + 1} of ${this.questions.length}`;

        // Display metadata tags
        this.questionMetadata.innerHTML = `
            <span class="tag tag-module">${question.moduleName}</span>
            <span class="tag tag-year">${question.yearGroup}</span>
            <span class="tag tag-level tag-level-${question.level}">${question.levelName}</span>
        `;

        // Display question text
        this.questionDisplay.textContent = question.questionText;

        // Render appropriate answer interface
        if (question.questionType === 'multiple_choice') {
            this.renderMultipleChoice(question);
        } else {
            this.renderTextInput(question);
        }

        // Check if already answered
        const previousAnswer = this.userAnswers.get(question.id);
        if (previousAnswer) {
            if (question.questionType === 'multiple_choice') {
                this.selectedOption = previousAnswer.answer;
                this.highlightSelectedOption(previousAnswer.answer);
            } else {
                this.answerInput.value = previousAnswer.answer;
                this.keyboardDisplay.textContent = previousAnswer.answer || '0';
            }
            this.showFeedback(previousAnswer.isCorrect, question.correctAnswer);
            this.hasSubmittedCurrent = true;
        } else {
            this.feedbackArea.classList.add('hidden');
            this.hasSubmittedCurrent = false;
            // Reset keyboard display for new question
            if (question.questionType === 'text_input') {
                this.keyboardDisplay.textContent = '0';
            }
        }

        // Enable/disable navigation buttons
        this.prevBtn.disabled = this.currentIndex === 0;
        this.nextBtn.textContent = this.currentIndex === this.questions.length - 1 ? 'Finish' : 'Next →';
    }

    /**
     * Render text input interface
     */
    renderTextInput(question) {
        this.answerArea.innerHTML = `
            <input type="text" id="answer-input" class="answer-input" placeholder="Use keyboard below" readonly>
            <button id="submit-btn" class="btn btn-primary">Submit Answer</button>
        `;

        // Re-attach elements and listeners
        this.answerInput = document.getElementById('answer-input');
        this.submitBtn = document.getElementById('submit-btn');

        this.submitBtn.addEventListener('click', () => this.submitAnswer());

        // Show on-screen keyboard for text input
        this.toggleKeyboard(true);
    }

    /**
     * Render multiple choice interface
     */
    renderMultipleChoice(question) {
        const options = question.multipleChoiceOptions || [];

        let optionsHTML = '<div class="multiple-choice-options">';
        options.forEach(option => {
            optionsHTML += `
                <button class="choice-btn" data-value="${option}">
                    ${option}
                </button>
            `;
        });
        optionsHTML += '</div>';
        optionsHTML += '<button id="submit-btn" class="btn btn-primary">Submit Answer</button>';

        this.answerArea.innerHTML = optionsHTML;

        // Re-attach submit button
        this.submitBtn = document.getElementById('submit-btn');
        this.submitBtn.addEventListener('click', () => this.submitAnswer());

        // Attach click handlers to choice buttons
        const choiceBtns = document.querySelectorAll('.choice-btn');
        choiceBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.selectOption(e.target));
        });

        // Hide on-screen keyboard for multiple choice
        this.toggleKeyboard(false);
    }

    /**
     * Handle multiple choice option selection
     */
    selectOption(button) {
        if (this.hasSubmittedCurrent) return;

        // Remove previous selection
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Mark this option as selected
        button.classList.add('selected');
        this.selectedOption = button.getAttribute('data-value');
    }

    /**
     * Highlight the previously selected option
     */
    highlightSelectedOption(value) {
        const buttons = document.querySelectorAll('.choice-btn');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-value') === value) {
                btn.classList.add('selected');
            }
        });
    }

    /**
     * Submit the current answer
     */
    submitAnswer() {
        if (this.hasSubmittedCurrent) return;

        const question = this.questions[this.currentIndex];
        let userAnswer;

        // Get answer based on question type
        if (question.questionType === 'multiple_choice') {
            userAnswer = this.selectedOption;
            if (!userAnswer) {
                this.showNotification('Please select an answer', 'warning', 3000);
                return;
            }
        } else {
            userAnswer = this.answerInput.value;
            if (!userAnswer.trim()) {
                this.showNotification('Please enter an answer', 'warning', 3000);
                return;
            }
        }

        // Validate answer
        const isCorrect = AnswerValidator.validate(
            userAnswer,
            question.correctAnswer,
            question.answerType
        );

        // Store result
        this.userAnswers.set(question.id, {
            answer: userAnswer,
            isCorrect: isCorrect
        });

        this.hasSubmittedCurrent = true;
        this.showFeedback(isCorrect, question.correctAnswer);

        // Disable choice buttons after submission if multiple choice
        if (question.questionType === 'multiple_choice') {
            document.querySelectorAll('.choice-btn').forEach(btn => {
                btn.disabled = true;
            });
        }
    }

    /**
     * Show feedback after answer submission
     */
    showFeedback(isCorrect, correctAnswer) {
        this.feedbackArea.classList.remove('hidden');

        if (isCorrect) {
            this.feedbackArea.innerHTML = `
                <span class="feedback-icon correct">✓</span>
                <span class="feedback-text">Correct!</span>
            `;
            this.feedbackArea.className = 'feedback feedback-correct';

            // Show success notification
            this.showNotification('✓ Correct! Well done!', 'success', 2000);
        } else {
            this.feedbackArea.innerHTML = `
                <span class="feedback-icon incorrect">✗</span>
                <span class="feedback-text">Incorrect. The correct answer is: <strong>${correctAnswer}</strong></span>
            `;
            this.feedbackArea.className = 'feedback feedback-incorrect';

            // Show error notification with correct answer
            this.showNotification(`✗ Incorrect. The correct answer is: ${correctAnswer}`, 'error', 4000);
        }
    }

    /**
     * Go to next question
     */
    nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.hasSubmittedCurrent = false;
            this.displayQuestion();
        } else {
            // End of questions - show results
            this.showResults();
        }
    }

    /**
     * Go to previous question
     */
    previousQuestion() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.hasSubmittedCurrent = false;
            this.displayQuestion();
        }
    }

    /**
     * Show results summary
     */
    showResults() {
        this.questionSection.classList.add('hidden');
        this.resultsSection.classList.remove('hidden');

        // Calculate results
        let correct = 0;
        let answered = 0;

        this.userAnswers.forEach((result) => {
            answered++;
            if (result.isCorrect) correct++;
        });

        const total = this.questions.length;
        const percentage = answered > 0 ? Math.round((correct / total) * 100) : 0;

        // Display results
        this.resultsDisplay.innerHTML = `
            <div class="score-display">
                <div class="score-number">${percentage}%</div>
                <div class="score-fraction">${correct} / ${total}</div>
            </div>
            <div class="score-details">
                <p class="score-item"><span class="score-label">Correct:</span> <span class="score-value correct-text">${correct}</span></p>
                <p class="score-item"><span class="score-label">Incorrect:</span> <span class="score-value incorrect-text">${total - correct}</span></p>
                <p class="score-item"><span class="score-label">Answered:</span> <span class="score-value">${answered} / ${total}</span></p>
            </div>
            ${percentage >= 70 ?
                '<p class="result-message success">Great job! Well done!</p>' :
                '<p class="result-message">Keep practicing to improve your score!</p>'}
        `;
    }

    /**
     * Restart the app
     */
    restart() {
        this.resultsSection.classList.add('hidden');
        this.uploadSection.classList.remove('hidden');
        this.fileInput.value = '';
        this.currentIndex = 0;
        this.userAnswers.clear();
        this.hasSubmittedCurrent = false;

        // Auto-load questions again
        this.autoLoadQuestions();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new QuestionApp();
});
